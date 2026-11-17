package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Notificação para a gestora (sino do painel). Tabela NOTIFICACAO.
 * Criada nos eventos de agendamento feitos pelo cliente ou pelo sistema:
 * novo agendamento, presença confirmada, cancelamento pelo cliente e
 * cancelamento automático.
 */
@Entity
@Table(name = "NOTIFICACAO")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacao")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica", nullable = false)
    private Clinica clinica;

    /** Agendamento do evento (para o "Ver na agenda"). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_agendamento")
    private Agendamento agendamento;

    /** NOVO_AGENDAMENTO, PRESENCA_CONFIRMADA, CANCELAMENTO_CLIENTE, CANCELAMENTO_AUTOMATICO. */
    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 500)
    private String mensagem;

    /** true = pede ação da gestora (ex.: reembolso a verificar). */
    @Column(name = "requer_acao", nullable = false)
    private Boolean requerAcao = false;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private LocalDateTime criadaEm = LocalDateTime.now();

    @Column(name = "lida_em")
    private LocalDateTime lidaEm;
}
