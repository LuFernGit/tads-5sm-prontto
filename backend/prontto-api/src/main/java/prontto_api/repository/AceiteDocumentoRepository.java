package prontto_api.repository;

import prontto_api.domain.AceiteDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AceiteDocumentoRepository extends JpaRepository<AceiteDocumento, Long> {
    List<AceiteDocumento> findByUsuarioId(Long usuarioId);
}