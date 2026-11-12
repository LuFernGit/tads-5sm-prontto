package prontto_api.infra.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import prontto_api.repository.UsuarioRepository;

/**
 * Ensina o AuthenticationManager a buscar a usuária no banco pelo e-mail.
 * Sem este bean, authenticationManager.authenticate(...) não encontra ninguém
 * e nenhum login funciona.
 */
@Service
public class UsuarioDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return usuarioRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("E-mail ou senha incorretos."));
    }
}
