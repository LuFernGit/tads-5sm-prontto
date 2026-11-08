package prontto_api.repository;

import prontto_api.domain.Usuario;
import prontto_api.domain.enums.TipoUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByWhatsapp(String whatsapp);
    List<Usuario> findByClinicaIdAndTipo(Long clinicaId, TipoUsuario tipo);
}