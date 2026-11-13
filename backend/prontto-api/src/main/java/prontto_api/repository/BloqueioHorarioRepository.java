package prontto_api.repository;

import prontto_api.domain.BloqueioHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface BloqueioHorarioRepository extends JpaRepository<BloqueioHorario, Long> {
    List<BloqueioHorario> findByClinicaIdAndData(Long clinicaId, LocalDate data);
    List<BloqueioHorario> findByClinicaId(Long clinicaId);
    List<BloqueioHorario> findByClinicaIdAndDataBetween(Long clinicaId, LocalDate inicio, LocalDate fim);
}