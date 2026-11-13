package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.dto.BloqueioHorarioDto;
import prontto_api.dto.HorarioFuncionamentoDto;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.repository.AgendamentoRepository;
import prontto_api.repository.BloqueioHorarioRepository;
import prontto_api.repository.ClinicaRepository;
import prontto_api.repository.HorarioRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class HorarioService {

    @Autowired private HorarioRepository horarioRepository;
    @Autowired private BloqueioHorarioRepository bloqueioHorarioRepository;
    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;

    public List<HorarioFuncionamentoDto> listarHorariosFuncionamento(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return horarioRepository.findByClinicaId(clinica.getId())
                .stream()
                // Segunda → domingo e, no dia, da faixa mais cedo para a mais tarde.
                .sorted(java.util.Comparator.comparing(Horario::getDiaSemana)
                        .thenComparing(Horario::getHoraInicio))
                .map(h -> new HorarioFuncionamentoDto(
                        h.getDiaSemana().name(),
                        h.getHoraInicio().toString(),
                        h.getHoraFim().toString(),
                        h.getAtivo()
                ))
                .toList();
    }

    @Transactional
    public List<HorarioFuncionamentoDto> atualizarHorariosFuncionamento(Usuario gestoraAutenticada, List<HorarioFuncionamentoDto> requests) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        List<Horario> horariosExistentes = horarioRepository.findByClinicaId(clinica.getId());
        horarioRepository.deleteAll(horariosExistentes);

        List<Horario> novos = new ArrayList<>();
        for (var req : requests) {
            Horario horario = new Horario();
            horario.setClinica(clinica);
            horario.setDiaSemana(DiaSemana.valueOf(req.dia_semana()));
            horario.setHoraInicio(LocalTime.parse(req.hora_inicio()));
            horario.setHoraFim(LocalTime.parse(req.hora_fim()));
            horario.setAtivo(req.ativo());
            novos.add(horario);
        }
        horarioRepository.saveAll(novos);

        return listarHorariosFuncionamento(gestoraAutenticada);
    }

    public List<BloqueioHorarioDto> listarBloqueios(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        LocalDate inicio = LocalDate.now().minusYears(1);
        LocalDate fim = LocalDate.now().plusYears(2);

        return bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), inicio, fim)
                .stream()
                // Por data e, no mesmo dia, o dia inteiro primeiro e depois por horário.
                .sorted(java.util.Comparator.comparing(BloqueioHorario::getData)
                        .thenComparing(BloqueioHorario::getHoraInicio,
                                java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .map(b -> new BloqueioHorarioDto(
                        b.getId(),
                        b.getData().toString(),
                        b.getHoraInicio() != null ? b.getHoraInicio().toString() : null,
                        b.getHoraFim() != null ? b.getHoraFim().toString() : null,
                        b.getMotivo(),
                        List.of()
                ))
                .toList();
    }

    @Transactional
    public BloqueioHorarioDto criarBloqueio(Usuario gestoraAutenticada, BloqueioHorarioDto request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        LocalDate data = LocalDate.parse(request.data());
        LocalTime inicio = (request.inicio() != null && !request.inicio().isBlank()) ? LocalTime.parse(request.inicio()) : null;
        LocalTime fim = (request.fim() != null && !request.fim().isBlank()) ? LocalTime.parse(request.fim()) : null;

        BloqueioHorario bloqueio = new BloqueioHorario();
        bloqueio.setClinica(clinica);
        bloqueio.setData(data);
        bloqueio.setHoraInicio(inicio);
        bloqueio.setHoraFim(fim);
        bloqueio.setMotivo(request.motivo());
        bloqueio = bloqueioHorarioRepository.save(bloqueio);

        List<Agendamento> agendamentos = agendamentoRepository.findByServicoClinicaIdAndData(clinica.getId(), data);
        List<BloqueioHorarioDto.ConflitoAgendamentoDto> conflitos = agendamentos.stream()
                .filter(a -> a.getStatus() != StatusAgendamento.CANCELADO)
                .filter(a -> {
                    if (inicio == null || fim == null) return true;
                    LocalTime agIni = a.getHora();
                    LocalTime agFim = agIni.plusMinutes(a.getServico().getDuracao());
                    return agIni.isBefore(fim) && agFim.isAfter(inicio);
                })
                .map(a -> new BloqueioHorarioDto.ConflitoAgendamentoDto(a.getId().toString(), a.getCliente().getNome(), a.getHora().toString()))
                .toList();

        return new BloqueioHorarioDto(
                bloqueio.getId(),
                bloqueio.getData().toString(),
                bloqueio.getHoraInicio() != null ? bloqueio.getHoraInicio().toString() : null,
                bloqueio.getHoraFim() != null ? bloqueio.getHoraFim().toString() : null,
                bloqueio.getMotivo(),
                conflitos
        );
    }

    @Transactional
    public void deletarBloqueio(Usuario gestoraAutenticada, Long idBloqueio) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        BloqueioHorario bloqueio = bloqueioHorarioRepository.findById(idBloqueio)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Bloqueio não encontrado."));

        if (!bloqueio.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Bloqueio não pertence à clínica da gestora.");
        }

        bloqueioHorarioRepository.delete(bloqueio);
    }

    private Clinica validarClinicaGestora(Usuario gestora) {
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica da gestora não encontrada."));
    }
}