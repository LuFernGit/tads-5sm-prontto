package prontto_api.repository;

import prontto_api.domain.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findByClinicaId(Long clinicaId);
    Optional<Categoria> findByClinicaIdAndNome(Long clinicaId, String nome);
    boolean existsByClinicaIdAndNome(Long clinicaId, String nome);
}