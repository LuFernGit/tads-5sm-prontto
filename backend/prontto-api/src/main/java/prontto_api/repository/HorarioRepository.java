package prontto_api.repository;

import prontto_api.domain.Horario;
import prontto_api.domain.enums.DiaSemana;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HorarioRepository extends JpaRepository<Horario, Long> {
    List<Horario> findByClinicaId(Long clinicaId);
    List<Horario> findByClinicaIdAndDiaSemana(Long clinicaId, DiaSemana diaSemana);
}