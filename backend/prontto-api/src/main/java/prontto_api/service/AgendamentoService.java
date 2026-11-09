package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.dto.AgendamentoGestoraResponse;
import prontto_api.dto.PeriodoHorarioResponse;
import prontto_api.infra.exceptions.ConflitoException;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AgendamentoService {

    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private HorarioRepository horarioRepository;
    @Autowired private BloqueioHorarioRepository bloqueioHorarioRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;

    public List<PeriodoHorarioResponse> listarHorariosDisponiveisEmPeriodos(String slug, Long servicoId, String dataStr) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada."));

        Servico servico = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));

        LocalDate data = LocalDate.parse(dataStr);
        DiaSemana diaSemana = converterDiaSemana(data.getDayOfWeek());

        Horario expediente = horarioRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(h -> h.getDiaSemana() == diaSemana && h.getAtivo())
                .findFirst()
                .orElse(null);

        if (expediente == null) {
            return List.of(
                    new PeriodoHorarioResponse("MANHÃ", List.of()),
                    new PeriodoHorarioResponse("TARDE", List.of()),
                    new PeriodoHorarioResponse("NOITE", List.of())
            );
        }

        List<BloqueioHorario> bloqueios = bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), data, data);
        boolean diaBloqueado = bloqueios.stream().anyMatch(b -> b.getHoraInicio() == null && b.getHoraFim() == null);

        List<Agendamento> agendamentos = agendamentoRepository.findByServicoClinicaIdAndData(clinica.getId(), data);

        List<PeriodoHorarioResponse.SlotDto> slotsManha = new ArrayList<>();
        List<PeriodoHorarioResponse.SlotDto> slotsTarde = new ArrayList<>();
        List<PeriodoHorarioResponse.SlotDto> slotsNoite = new ArrayList<>();

        LocalTime atual = expediente.getHoraInicio();
        // Regra de Negócio: atendimento deve terminar impreterivelmente até às 19:00
        LocalTime fimExpediente = expediente.getHoraFim().isAfter(LocalTime.of(19, 0))
                ? LocalTime.of(19, 0)
                : expediente.getHoraFim();
        int duracao = servico.getDuracao();

        while (atual.plusMinutes(duracao).compareTo(fimExpediente) <= 0) {
            LocalTime slotFim = atual.plusMinutes(duracao);
            LocalTime slotIni = atual;

            boolean occupied = diaBloqueado || bloqueios.stream().anyMatch(b ->
                    b.getHoraInicio() != null && b.getHoraFim() != null &&
                            slotIni.isBefore(b.getHoraFim()) && slotFim.isAfter(b.getHoraInicio())
            ) || agendamentos.stream().anyMatch(a -> {
                if (a.getStatus() == StatusAgendamento.CANCELADO) return false;
                LocalTime agIni = a.getHora();
                LocalTime agFim = agIni.plusMinutes(a.getServico().getDuracao());
                return slotIni.isBefore(agFim) && slotFim.isAfter(agIni);
            });

            if (data.isEqual(LocalDate.now()) && slotIni.isBefore(LocalTime.now())) {
                occupied = true;
            }

            PeriodoHorarioResponse.SlotDto slot = new PeriodoHorarioResponse.SlotDto(slotIni.toString().substring(0, 5), occupied);

            if (slotIni.isBefore(LocalTime.of(12, 0))) {
                slotsManha.add(slot);
            } else if (slotIni.isBefore(LocalTime.of(18, 0))) {
                slotsTarde.add(slot);
            } else {
                slotsNoite.add(slot);
            }

            atual = atual.plusMinutes(30);
        }

        return List.of(
                new PeriodoHorarioResponse("MANHÃ", slotsManha),
                new PeriodoHorarioResponse("TARDE", slotsTarde),
                new PeriodoHorarioResponse("NOITE", slotsNoite)
        );
    }

    public List<AgendamentoGestoraResponse> listarAgendamentosGestora(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return agendamentoRepository.findAll()
                .stream()
                .filter(a -> a.getServico() != null && a.getServico().getClinica().getId().equals(clinica.getId()))
                .map(a -> new AgendamentoGestoraResponse(
                        a.getId().toString(),
                        a.getCliente() != null ? a.getCliente().getNome() : null,
                        a.getCliente() != null ? a.getCliente().getWhatsapp() : null,
                        a.getNomeProcedimento(),
                        a.getData().toString(),
                        a.getHora().toString(),
                        a.getServico() != null ? a.getServico().getDuracao() : null,
                        a.getStatus().name(),
                        a.getCanceladoPor(),
                        a.getMotivoCancelamento(),
                        a.getDataCancelamento() != null ? a.getDataCancelamento().toString() : null
                ))
                .toList();
    }

    @Transactional
    public AgendamentoGestoraResponse cancelarAgendamentoGestora(Usuario gestora, Long idAgendamento, String motivo) {
        Clinica clinica = validarClinicaGestora(gestora);
        Agendamento a = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));

        if (!a.getServico().getClinica().getId().equals(clinica.getId())) {
            throw new RegraNegocioException("O agendamento não pertence à clínica da gestora.");
        }

        if (a.getStatus() == StatusAgendamento.CANCELADO) {
            throw new ConflitoException("Este agendamento já está cancelado.");
        }

        a.setStatus(StatusAgendamento.CANCELADO);
        a.setCanceladoPor("GESTORA");
        a.setMotivoCancelamento(motivo);
        a.setDataCancelamento(LocalDateTime.now());
        agendamentoRepository.save(a);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(gestora);
        log.setAcao("CANCELAMENTO_GESTORA");
        log.setIpOrigem("127.0.0.1");
        logAuditoriaRepository.save(log);

        return new AgendamentoGestoraResponse(
                a.getId().toString(),
                a.getCliente().getNome(),
                a.getCliente().getWhatsapp(),
                a.getNomeProcedimento(),
                a.getData().toString(),
                a.getHora().toString(),
                a.getServico().getDuracao(),
                a.getStatus().name(),
                a.getCanceladoPor(),
                a.getMotivoCancelamento(),
                a.getDataCancelamento() != null ? a.getDataCancelamento().toString() : null
        );
    }

    private Clinica validarClinicaGestora(Usuario gestora) {
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica da gestora não encontrada."));
    }

    private DiaSemana converterDiaSemana(java.time.DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> DiaSemana.SEGUNDA;
            case TUESDAY -> DiaSemana.TERCA;
            case WEDNESDAY -> DiaSemana.QUARTA;
            case THURSDAY -> DiaSemana.QUINTA;
            case FRIDAY -> DiaSemana.SEXTA;
            case SATURDAY -> DiaSemana.SABADO;
            case SUNDAY -> DiaSemana.DOMINGO;
        };
    }
}
