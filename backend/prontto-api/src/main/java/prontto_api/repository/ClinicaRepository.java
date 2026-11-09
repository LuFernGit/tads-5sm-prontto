package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import prontto_api.domain.Clinica;
import java.util.Optional;

public interface ClinicaRepository extends JpaRepository<Clinica, Long> {
    Optional<Clinica> findBySlug(String slug);
    Optional<Clinica> findByGestoraId(Long gestoraId);
    boolean existsBySlug(String slug);
    boolean existsByCpfCnpj(String cpfCnpj);
}