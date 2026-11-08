package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.BloqueioHorario;
import prontto_api.domain.Clinica;
import prontto_api.domain.Horario;
import prontto_api.domain.Usuario;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.dto.BloqueioHorarioDto;
import prontto_api.dto.HorarioFuncionamentoDto;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.repository.BloqueioHorarioRepository;
import prontto_api.repository.ClinicaRepository;
import prontto_api.repository.HorarioRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HorarioService {

    @Autowired
    private HorarioRepository horarioRepository;

    @Autowired
    private BloqueioHorarioRepository bloqueioHorarioRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    public List<HorarioFuncionamentoDto> listarHorariosFuncionamento(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return horarioRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(h -> new HorarioFuncionamentoDto(
                        h.getDiaSemana().name(),
                        h.getHoraInicio().toString(),
                        h.getHoraFim().toString(),
                        h.getAtivo()
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<HorarioFuncionamentoDto> atualizarHorariosFuncionamento(Usuario gestoraAutenticada, List<HorarioFuncionamentoDto> requests) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        List<Horario> horariosExistentes = horarioRepository.findByClinicaId(clinica.getId());
        horarioRepository.deleteAll(horariosExistentes);

        for (var req : requests) {
            Horario horario = new Horario();
            horario.setClinica(clinica);
            horario.setDiaSemana(DiaSemana.valueOf(req.dia_semana()));
            horario.setHoraInicio(LocalTime.parse(req.hora_inicio()));
            horario.setHoraFim(LocalTime.parse(req.hora_fim()));
            horario.setAtivo(req.ativo());
            horarioRepository.save(horario);
        }

        return listarHorariosFuncionamento(gestoraAutenticada);
    }

    public List<BloqueioHorarioDto> listarBloqueios(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        LocalDate inicio = LocalDate.now().minusYears(1);
        LocalDate fim = LocalDate.now().plusYears(2);

        return bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), inicio, fim)
                .stream()
                .map(b -> new BloqueioHorarioDto(
                        b.getId(),
                        b.getData().toString(),
                        b.getHoraInicio() != null ? b.getHoraInicio().toString() : null,
                        b.getHoraFim() != null ? b.getHoraFim().toString() : null,
                        b.getMotivo()
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public BloqueioHorarioDto criarBloqueio(Usuario gestoraAutenticada, BloqueioHorarioDto request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        BloqueioHorario bloqueio = new BloqueioHorario();
        bloqueio.setClinica(clinica);
        bloqueio.setData(LocalDate.parse(request.data()));
        bloqueio.setHoraInicio(request.inicio() != null ? LocalTime.parse(request.inicio()) : null);
        bloqueio.setHoraFim(request.fim() != null ? LocalTime.parse(request.fim()) : null);
        bloqueio.setMotivo(request.motivo());

        bloqueio = bloqueioHorarioRepository.save(bloqueio);

        return new BloqueioHorarioDto(
                bloqueio.getId(),
                bloqueio.getData().toString(),
                bloqueio.getHoraInicio() != null ? bloqueio.getHoraInicio().toString() : null,
                bloqueio.getHoraFim() != null ? bloqueio.getHoraFim().toString() : null,
                bloqueio.getMotivo()
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
        if (gestora.getClinica() == null) {
            throw new RecursoNaoEncontradoException("A gestora não está vinculada a nenhuma clínica.");
        }
        return gestora.getClinica();
    }
}