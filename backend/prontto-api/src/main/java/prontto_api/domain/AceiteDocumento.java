package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "aceite_documento")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AceiteDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_documento", nullable = false)
    private DocumentoTermo documento;

    @Column(name = "data_hora_aceite", nullable = false)
    private LocalDateTime dataHoraAceite = LocalDateTime.now();

    @Column(length = 45)
    private String ip;
}