package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Versão COMPLETA da ficha de saúde (tabela FICHA_ANAMNESE_VERSAO).
 * Cada vez que a cliente salva a ficha, uma cópia inteira dela é guardada aqui
 * (inclusive os campos que não mudaram). Versões nunca são alteradas nem apagadas.
 */
@Entity
@Table(name = "FICHA_ANAMNESE_VERSAO")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FichaAnamneseVersao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_versao")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_anamnese", nullable = false, updatable = false)
    private FichaAnamnese fichaAnamnese;

    @Column(name = "numero_versao", nullable = false, updatable = false)
    private Integer numeroVersao;

    @Column(length = 255, updatable = false)
    private String alergias;

    @Column(name = "observacoes_medicas", length = 500, updatable = false)
    private String observacoesMedicas;

    @Column(columnDefinition = "JSON", updatable = false)
    private String respostas;

    /** Data e hora em que a versão foi salva (null só em versões migradas sem data conhecida). */
    @Column(name = "criada_em", updatable = false)
    private LocalDateTime criadaEm;
}
