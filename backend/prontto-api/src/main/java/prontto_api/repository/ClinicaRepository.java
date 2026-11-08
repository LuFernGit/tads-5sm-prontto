package prontto_api.repository;

import prontto_api.domain.Clinica;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClinicaRepository extends JpaRepository<Clinica, Long> {
    Optional<Clinica> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsByCpfCnpj(String cpfCnpj);
}