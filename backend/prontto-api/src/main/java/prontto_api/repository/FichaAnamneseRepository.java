package prontto_api.repository;

import prontto_api.domain.FichaAnamnese;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FichaAnamneseRepository extends JpaRepository<FichaAnamnese, Long> {
    Optional<FichaAnamnese> findByClienteId(Long clienteId);
}