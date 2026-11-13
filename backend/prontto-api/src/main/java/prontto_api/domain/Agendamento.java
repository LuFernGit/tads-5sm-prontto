package prontto_api.domain;

import prontto_api.domain.enums.StatusAgendamento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "agendamento")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_agendamento")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_servico", nullable = false)
    private Servico servico;

    @Column(name = "nome_procedimento", nullable = false, length = 100)
    private String nomeProcedimento;

    @Column(name = "valor_servico", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorServico;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private LocalTime hora;

    @Column(name = "valor_sinal", precision = 10, scale = 2)
    private BigDecimal valorSinal;

    @Column(name = "cancelado_por", length = 20)
    private String canceladoPor;

    @Column(name = "motivo_cancelamento", length = 255)
    private String motivoCancelamento;

    @Column(name = "data_cancelamento")
    private LocalDateTime dataCancelamento;

    /**
     * Cancelamento pela cliente: true = feito com 24h ou mais de antecedência
     * (pode pedir reembolso do sinal); false = menos de 24h. Null nos outros casos.
     */
    @Column(name = "cancelamento_no_prazo")
    private Boolean cancelamentoNoPrazo;

    /**
     * Análise do sinal pela gestora (RegrasAgendamento): A_VERIFICAR quando a
     * cliente cancela um agendamento com sinal registrado; VERIFICADO depois que
     * a gestora analisa. O reembolso em si é feito fora do Prontto.
     */
    @Column(name = "reembolso_status", length = 20)
    private String reembolsoStatus;

    @Column(name = "reembolso_verificado_em")
    private LocalDateTime reembolsoVerificadoEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusAgendamento status = StatusAgendamento.PENDENTE;
}