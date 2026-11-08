package prontto_api.domain;

import prontto_api.domain.enums.StatusUsuario;
import prontto_api.domain.enums.TipoUsuario;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica")
    private Clinica clinica;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(name = "data_nascimento", nullable = false)
    private LocalDate dataNascimento;

    @Column(nullable = false, length = 20)
    private String whatsapp;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 255)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoUsuario tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusUsuario status = StatusUsuario.ATIVO;

    @Column(nullable = false)
    private Boolean recorrente = false;

    @Column(name = "notas_gestora", columnDefinition = "TEXT")
    private String notasGestora;

    @Column(name = "solicitou_exclusao", nullable = false)
    private Boolean solicitouExclusao = false;

    @Column(name = "data_solicitacao_exclusao")
    private LocalDate dataSolicitacaoExclusao;
}