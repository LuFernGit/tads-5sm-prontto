package prontto_api.repository;

import prontto_api.domain.ModeloMensagem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ModeloMensagemRepository extends JpaRepository<ModeloMensagem, Long> {
    List<ModeloMensagem> findByClinicaId(Long clinicaId);
}