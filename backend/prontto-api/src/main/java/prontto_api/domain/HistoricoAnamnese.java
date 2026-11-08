package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "historico_anamnese")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoAnamnese {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historico")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_anamnese", nullable = false)
    private FichaAnamnese fichaAnamnese;

    @Column(name = "campo_alterado", nullable = false, length = 100)
    private String campoAlterado;

    @Lob
    @Column(name = "valor_anterior", nullable = false, columnDefinition = "TEXT")
    private String valorAnterior;

    @Lob
    @Column(name = "valor_novo", nullable = false, columnDefinition = "TEXT")
    private String valorNovo;

    @Column(name = "data_alteracao", nullable = false, updatable = false)
    private LocalDateTime dataAlteracao = LocalDateTime.now();
}