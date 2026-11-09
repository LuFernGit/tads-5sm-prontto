package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "LOG_AUDITORIA")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(nullable = false, length = 100)
    private String acao;

    @Column(name = "ip_origem", length = 45)
    private String ipOrigem;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora = LocalDateTime.now();
}