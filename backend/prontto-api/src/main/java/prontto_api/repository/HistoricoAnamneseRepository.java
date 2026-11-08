package prontto_api.repository;

import prontto_api.domain.HistoricoAnamnese;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HistoricoAnamneseRepository extends JpaRepository<HistoricoAnamnese, Long> {
    List<HistoricoAnamnese> findByFichaAnamneseId(Long fichaAnamneseId);
}