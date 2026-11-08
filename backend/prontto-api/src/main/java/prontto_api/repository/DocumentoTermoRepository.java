package prontto_api.repository;

import prontto_api.domain.DocumentoTermo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentoTermoRepository extends JpaRepository<DocumentoTermo, Long> {
    List<DocumentoTermo> findByClinicaId(Long clinicaId);
}