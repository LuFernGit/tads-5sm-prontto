package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.dto.*;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AgendamentoService {

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private HorarioRepository horarioRepository;

    @Autowired
    private BloqueioHorarioRepository bloqueioHorarioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public HorariosDisponiveisResponse listarHorariosDisponiveis(String slug, Long servicoId, String dataStr) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada."));

        Servico servico = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));

        if (!servico.getClinica().getId().equals(clinica.getId())) {
            throw new RegraNegocioException("O serviço não pertence a esta clínica.");
        }

        LocalDate data = LocalDate.parse(dataStr);
        DiaSemana diaSemana = converterDiaSemana(data.getDayOfWeek());

        Horario expediente = horarioRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(h -> h.getDiaSemana() == diaSemana && h.getAtivo())
                .findFirst()
                .orElse(null);

        if (expediente == null) {
            return new HorariosDisponiveisResponse(dataStr, List.of());
        }

        List<BloqueioHorario> bloqueios = bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), data, data);
        boolean diaBloqueadoTotalmente = bloqueios.stream().anyMatch(b -> b.getHoraInicio() == null && b.getHoraFim() == null);
        if (diaBloqueadoTotalmente) {
            return new HorariosDisponiveisResponse(dataStr, List.of());
        }

        List<Agendamento> agendamentosExistentes = agendamentoRepository.findByServicoClinicaIdAndData(clinica.getId(), data);

        List<HorariosDisponiveisResponse.SlotDto> slots = new ArrayList<>();
        LocalTime atual = expediente.getHoraInicio();
        LocalTime fimExpediente = expediente.getHoraFim();
        int duracaoMinutos = servico.getDuracao();

        while (atual.plusMinutes(duracaoMinutos).compareTo(fimExpediente) <= 0) {
            LocalTime slotFim = atual.plusMinutes(duracaoMinutos);
            final LocalTime slotInicio = atual;

            boolean conflitoBloqueio = bloqueios.stream().anyMatch(b ->
                    b.getHoraInicio() != null && b.getHoraFim() != null &&
                            slotInicio.isBefore(b.getHoraFim()) && slotFim.isAfter(b.getHoraInicio())
            );

            boolean conflitoAgendamento = agendamentosExistentes.stream().anyMatch(a -> {
                if (a.getStatus() == StatusAgendamento.CANCELADO) return false;
                LocalTime agInicio = a.getHora();
                LocalTime agFim = agInicio.plusMinutes(a.getServico().getDuracao());
                return slotInicio.isBefore(agFim) && slotFim.isAfter(agInicio);
            });

            if (!conflitoBloqueio && !conflitoAgendamento) {
                slots.add(new HorariosDisponiveisResponse.SlotDto(atual.toString(), false));
            }

            atual = atual.plusMinutes(30);
        }

        return new HorariosDisponiveisResponse(dataStr, slots);
    }

    @Transactional
    public AgendamentoClienteResponse criarAgendamento(String slug, Usuario clienteAutenticado, CriarAgendamentoClienteRequest request) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada."));

        Long servicoIdLong = Long.valueOf(request.servicoId());
        Servico servico = servicoRepository.findById(servicoIdLong)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));

        LocalDate data = LocalDate.parse(request.data());
        LocalTime hora = LocalTime.parse(request.hora());

        Agendamento agendamento = new Agendamento();
        agendamento.setCliente(clienteAutenticado);
        agendamento.setServico(servico);
        agendamento.setNomeProcedimento(servico.getNome());
        agendamento.setValorServico(servico.getPreco());
        agendamento.setData(data);
        agendamento.setHora(hora);
        agendamento.setStatus(StatusAgendamento.CONFIRMADO);

        agendamento = agendamentoRepository.save(agendamento);

        return new AgendamentoClienteResponse(
                agendamento.getId().toString(),
                servico.getId().toString(),
                servico.getNome(),
                data.toString(),
                hora.toString(),
                servico.getDuracao(),
                servico.getPreco(),
                agendamento.getValorSinal(),
                agendamento.getStatus().name()
        );
    }

    public List<AgendamentoClienteResponse> listarAgendamentosCliente(String slug, Usuario clienteAutenticado) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada."));

        return agendamentoRepository.findByClienteId(clienteAutenticado.getId())
                .stream()
                .filter(a -> a.getServico() != null && a.getServico().getClinica().getId().equals(clinica.getId()))
                .map(a -> new AgendamentoClienteResponse(
                        a.getId().toString(),
                        a.getServico() != null ? a.getServico().getId().toString() : null,
                        a.getNomeProcedimento(),
                        a.getData().toString(),
                        a.getHora().toString(),
                        a.getServico() != null ? a.getServico().getDuracao() : null,
                        a.getValorServico(),
                        a.getValorSinal(),
                        a.getStatus().name()
                ))
                .collect(Collectors.toList());
    }

    public List<AgendamentoGestoraResponse> listarAgendamentosGestora(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return agendamentoRepository.findByServicoClinicaIdAndStatusNot(clinica.getId(), StatusAgendamento.CANCELADO)
                .stream()
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
                .collect(Collectors.toList());
    }

    @Transactional
    public void alterarStatusAgendamento(Usuario gestoraAutenticada, Long idAgendamento, StatusAgendamento novoStatus) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Agendamento agendamento = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));

        if (!agendamento.getServico().getClinica().getId().equals(clinica.getId())) {
            throw new RegraNegocioException("O agendamento não pertence à clínica da gestora.");
        }

        agendamento.setStatus(novoStatus);
        agendamentoRepository.save(agendamento);
    }

    private Clinica validarClinicaGestora(Usuario gestora) {
        if (gestora.getClinica() == null) {
            throw new RecursoNaoEncontradoException("A gestora não está vinculada a nenhuma clínica.");
        }
        return gestora.getClinica();
    }

    private DiaSemana converterDiaSemana(java.time.DayOfWeek dayOfWeek) {
        switch (dayOfWeek) {
            case MONDAY: return DiaSemana.SEGUNDA;
            case TUESDAY: return DiaSemana.TERCA;
            case WEDNESDAY: return DiaSemana.QUARTA;
            case THURSDAY: return DiaSemana.QUINTA;
            case FRIDAY: return DiaSemana.SEXTA;
            case SATURDAY: return DiaSemana.SABADO;
            case SUNDAY: return DiaSemana.DOMINGO;
            default: return DiaSemana.SEGUNDA;
        }
    }
}