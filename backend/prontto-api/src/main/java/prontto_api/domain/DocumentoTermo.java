package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "DOCUMENTO_TERMO")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoTermo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_documento")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica")
    private Clinica clinica;

    @Column(nullable = false, length = 100)
    private String titulo;

    @Column(name = "tipo_documento", nullable = false, length = 30)
    private String tipoDocumento;

    @Column(nullable = false, length = 20)
    private String versao;

    @Lob
    @Column(name = "caminho_arquivo", columnDefinition = "LONGTEXT")
    private String caminhoArquivo;

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    // Nome do PDF anexado (o arquivo em si fica em caminhoArquivo, como data URL).
    @Column(name = "nome_arquivo", length = 255)
    private String nomeArquivo;

    @Column(name = "data_publicacao")
    private LocalDateTime dataPublicacao;

    // Exclusão lógica: o documento sai da lista mas continua no banco (com o PDF)
    // e pode ser restaurado. null = não excluído.
    @Column(name = "excluido_em")
    private LocalDateTime excluidoEm;

    @Column(nullable = false, length = 20)
    private String status = "RASCUNHO";
}