package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ficha_anamnese")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FichaAnamnese {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente", nullable = false)
    private Usuario cliente;

    @Column(length = 255)
    private String alergias;

    @Column(name = "observacoes_medicas", columnDefinition = "TEXT")
    private String observacoesMedicas;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String respostas;

    @Column(name = "atualizada_em", nullable = false)
    private LocalDateTime atualizadaEm = LocalDateTime.now();
}