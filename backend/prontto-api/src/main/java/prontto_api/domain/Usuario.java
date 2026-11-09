package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import prontto_api.domain.enums.StatusUsuario;
import prontto_api.domain.enums.TipoUsuario;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "USUARIO")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica")
    private Clinica clinica;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "data_nascimento", nullable = false)
    private LocalDate dataNascimento;

    @Column(nullable = false, unique = true, length = 20)
    private String whatsapp;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "senha", nullable = false, length = 255)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoUsuario tipo;

    @Column(nullable = false)
    private Boolean recorrente = false;

    @Column(name = "solicitou_exclusao", nullable = false)
    private Boolean solicitouExclusao = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusUsuario status = StatusUsuario.ATIVO;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (this.tipo == TipoUsuario.GESTORA) {
            return List.of(new SimpleGrantedAuthority("ROLE_GESTORA"));
        }
        return List.of(new SimpleGrantedAuthority("ROLE_CLIENTE"));
    }

    @Override
    public String getPassword() {
        return this.senha;
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.status == StatusUsuario.ATIVO;
    }
}
