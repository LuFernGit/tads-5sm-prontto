package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Nota interna da gestora sobre uma cliente (a cliente não vê). Tabela NOTA_CLIENTE. */
@Entity
@Table(name = "NOTA_CLIENTE")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotaCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_nota")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica", nullable = false)
    private Clinica clinica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario cliente;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private LocalDateTime criadaEm = LocalDateTime.now();

    @Column(name = "atualizada_em")
    private LocalDateTime atualizadaEm;
}
