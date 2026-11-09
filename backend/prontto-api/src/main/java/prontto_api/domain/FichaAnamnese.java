package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "FICHA_ANAMNESE")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FichaAnamnese {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anamnese")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false, unique = true)
    private Usuario cliente;

    @Column(nullable = false, length = 255)
    private String alergias;

    @Column(name = "observacoes_medicas", nullable = false, length = 500)
    private String observacoesMedicas;

    @Column(columnDefinition = "JSON")
    private String respostas;

    @Column(name = "notas_gestora", length = 500)
    private String notasGestora;

    @Column(name = "data_atualizacao", nullable = false)
    private LocalDateTime dataAtualizacao = LocalDateTime.now();
}