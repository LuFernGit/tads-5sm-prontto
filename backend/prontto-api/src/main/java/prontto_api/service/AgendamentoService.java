package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.dto.AgendamentoGestoraResponse;
import prontto_api.dto.PeriodoHorarioResponse;
import prontto_api.infra.web.IpOrigem;
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
        // Serviço de outra clínica ou desativado pela gestora: sem horários.
        if (servico.getClinica() == null || !servico.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Serviço não encontrado.");
        }
        if (!Boolean.TRUE.equals(servico.getAtivo())) {
            throw new prontto_api.infra.exceptions.RegraNegocioException(
                    "Este serviço não está mais disponível para agendamento. Escolha outro serviço.");
        }

        LocalDate data = LocalDate.parse(dataStr);
        DiaSemana diaSemana = converterDiaSemana(data.getDayOfWeek());

        // TODAS as faixas do dia (ex.: 09–12 e 13–19 quando há almoço), em ordem.
        // Antes só a primeira era lida, e os horários da tarde/noite sumiam.
        List<Horario> faixas = horarioRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(h -> h.getDiaSemana() == diaSemana && h.getAtivo())
                .sorted(java.util.Comparator.comparing(Horario::getHoraInicio))
                .toList();

        if (faixas.isEmpty()) {
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

        int duracao = servico.getDuracao();

        for (Horario expediente : faixas) {
        LocalTime atual = expediente.getHoraInicio();
        // Regra de Negócio: atendimento deve terminar impreterivelmente até às 19:00
        LocalTime fimExpediente = expediente.getHoraFim().isAfter(LocalTime.of(19, 0))
                ? LocalTime.of(19, 0)
                : expediente.getHoraFim();

        // O atendimento inteiro precisa caber DENTRO da faixa (não atravessa o almoço).
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

            // Divisão conforme padrão do front: Manhã (<12h), Tarde (12h-17h), Noite (17h+)
            if (slotIni.isBefore(LocalTime.of(12, 0))) {
                slotsManha.add(slot);
            } else if (slotIni.isBefore(LocalTime.of(17, 0))) {
                slotsTarde.add(slot);
            } else {
                slotsNoite.add(slot);
            }

            atual = atual.plusMinutes(30);
        }
        } // fim das faixas do dia

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
                .sorted(RegrasAgendamento.ORDEM_DATA_HORA)
                .map(this::paraResponseGestora)
                .toList();
    }

    /** Agendamento → resposta da gestora (inclui sinal registrado e análise de reembolso). */
    private AgendamentoGestoraResponse paraResponseGestora(Agendamento a) {
        return new AgendamentoGestoraResponse(
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
                a.getDataCancelamento() != null ? a.getDataCancelamento().toString() : null,
                a.getValorSinal(),
                a.getCancelamentoNoPrazo(),
                a.getReembolsoStatus(),
                RegrasAgendamento.cancelarComReembolsoAte(a)
        );
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
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);

        return paraResponseGestora(a);
    }

    /**
     * A gestora registra que já analisou o sinal de um cancelamento feito pela
     * cliente (o Prontto não faz estorno: o reembolso, se devido, é feito fora).
     */
    @Transactional
    public AgendamentoGestoraResponse marcarReembolsoVerificado(Usuario gestora, Long idAgendamento) {
        Clinica clinica = validarClinicaGestora(gestora);
        Agendamento a = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));
        if (!a.getServico().getClinica().getId().equals(clinica.getId())) {
            throw new RegraNegocioException("O agendamento não pertence à clínica da gestora.");
        }
        if (a.getReembolsoStatus() == null) {
            throw new RegraNegocioException("Este agendamento não tem sinal para analisar.");
        }
        if (RegrasAgendamento.REEMBOLSO_A_VERIFICAR.equals(a.getReembolsoStatus())) {
            a.setReembolsoStatus(RegrasAgendamento.REEMBOLSO_VERIFICADO);
            a.setReembolsoVerificadoEm(RegrasAgendamento.agora());
            agendamentoRepository.save(a);

            LogAuditoria log = new LogAuditoria();
            log.setUsuario(gestora);
            log.setAcao("REEMBOLSO_VERIFICADO");
            log.setIpOrigem(IpOrigem.atual());
            logAuditoriaRepository.save(log);
        }
        return paraResponseGestora(a);
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