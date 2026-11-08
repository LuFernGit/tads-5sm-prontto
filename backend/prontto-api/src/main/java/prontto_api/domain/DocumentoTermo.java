package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "documento_termo")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoTermo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica")
    private Clinica clinica;

    @Column(nullable = false, length = 50)
    private String tipo;

    @Column(nullable = false, length = 20)
    private String versao;

    @Column(nullable = false, length = 20)
    private String status = "RASCUNHO";

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(name = "caminho_arquivo", length = 255)
    private String caminhoArquivo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();
}