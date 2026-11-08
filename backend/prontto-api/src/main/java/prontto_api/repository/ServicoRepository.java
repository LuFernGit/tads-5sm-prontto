package prontto_api.repository;

import prontto_api.domain.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByClinicaId(Long clinicaId);
    List<Servico> findByClinicaIdAndAtivoTrue(Long clinicaId);
}