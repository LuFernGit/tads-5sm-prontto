package prontto_api.domain;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Regras de agendamento usadas em mais de um lugar do backend.
 *
 * Confirmação de presença (cliente recorrente, isenta de sinal):
 *   - o agendamento nasce PENDENTE;
 *   - a cliente confirma sozinha na área dela até PRAZO_CONFIRMACAO_HORAS antes;
 *   - se não confirmar, o sistema cancela automaticamente e libera o horário
 *     (AgendamentoAutoCancelamentoJob), com cancelado_por = 'SISTEMA'.
 *
 * Sinal (cliente nova): o agendamento só é criado com o sinal pago; ele já
 * nasce CONFIRMADO. Não existe agendamento com sinal pendente.
 */
public final class RegrasAgendamento {

    /** Até quantas horas antes do horário a cliente pode confirmar a presença. */
    public static final int PRAZO_CONFIRMACAO_HORAS = 24;

    /** Fuso usado nas regras de horário (não depende do fuso do servidor). */
    public static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    /** Motivo gravado quando o sistema cancela por falta de confirmação. */
    public static final String MOTIVO_SEM_CONFIRMACAO =
            "Presença não confirmada até " + PRAZO_CONFIRMACAO_HORAS + " horas antes do horário.";

    private RegrasAgendamento() {}

    public static LocalDateTime agora() {
        return LocalDateTime.now(FUSO);
    }

    /** Data e hora limite para a cliente confirmar a presença. */
    public static LocalDateTime prazoConfirmacao(Agendamento a) {
        return LocalDateTime.of(a.getData(), a.getHora()).minusHours(PRAZO_CONFIRMACAO_HORAS);
    }
}
