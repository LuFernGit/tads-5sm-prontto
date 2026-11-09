package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "MODELO_MENSAGEM")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModeloMensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_modelo")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica", nullable = false)
    private Clinica clinica;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(nullable = false)
    private Boolean ativo = true;

    @Column(nullable = false, length = 50)
    private String finalidade = "PERSONALIZADA";
}