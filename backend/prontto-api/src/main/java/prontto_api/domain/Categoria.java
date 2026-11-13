package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "CATEGORIA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica", nullable = false)
    private Clinica clinica;

    @Column(nullable = false, length = 100)
    private String nome;

    /** Foto de capa da categoria na vitrine (data URL base64). Null = capa padrão. */
    @Lob
    @Column(name = "capa", columnDefinition = "LONGTEXT")
    private String capa;
}
