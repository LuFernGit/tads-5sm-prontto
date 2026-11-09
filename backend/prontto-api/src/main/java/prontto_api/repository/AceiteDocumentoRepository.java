package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import prontto_api.domain.AceiteDocumento;

import java.util.List;

public interface AceiteDocumentoRepository extends JpaRepository<AceiteDocumento, Long> {
    List<AceiteDocumento> findByUsuarioId(Long usuarioId);
    int countByDocumentoId(Long documentoId);
}