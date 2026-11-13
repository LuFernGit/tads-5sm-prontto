package prontto_api.domain;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Regras de agendamento usadas em mais de um lugar do backend.
 *
 * Confirmação de presença (TODAS as clientes, novas e recorrentes):
 *   - o agendamento nasce PENDENTE;
 *   - a cliente confirma sozinha na área dela até PRAZO_CONFIRMACAO_HORAS antes;
 *   - se não confirmar, o sistema cancela automaticamente e libera o horário
 *     (AgendamentoAutoCancelamentoJob), com cancelado_por = 'SISTEMA'. Se havia
 *     sinal, ele fica retido (cancelamento fora do prazo de 24h);
 *   - agendado já dentro das 24h: nasce CONFIRMADO (o próprio agendamento
 *     vale como confirmação).
 *
 * Sinal (cliente nova): o agendamento só é criado com o sinal pago. Não
 * existe agendamento com sinal pendente.
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

    /**
     * Ordem cronológica (data e depois hora: 09:00, 10:00, 11:00...). Usada em
     * todas as listas de agendamentos devolvidas às telas, para não depender
     * da ordem em que os registros estão no banco.
     */
    public static final java.util.Comparator<Agendamento> ORDEM_DATA_HORA =
            java.util.Comparator.comparing(Agendamento::getData)
                    .thenComparing(Agendamento::getHora)
                    .thenComparing(Agendamento::getId, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()));

    /** Data e hora limite para a cliente confirmar a presença. */
    public static LocalDateTime prazoConfirmacao(Agendamento a) {
        return inicio(a).minusHours(PRAZO_CONFIRMACAO_HORAS);
    }

    /* ------------------------------------------------------------------
     * Política de cancelamento e reembolso do sinal (proposta da equipe)
     *
     *  - cancelamento pela cliente com PRAZO_REEMBOLSO_HORAS ou mais de
     *    antecedência: ela pode SOLICITAR o reembolso do sinal à clínica →
     *    o caso fica REEMBOLSO_A_VERIFICAR para a gestora;
     *  - com menos antecedência: o sinal é PERDIDO, exceto em caso de força
     *    maior; nesse caso a cliente entra em contato com a clínica, que avalia
     *    (fora do sistema). Não gera pendência para a gestora;
     *  - sem sinal registrado (cliente recorrente, isenta) não há o que reembolsar.
     *
     * O Prontto NÃO faz estorno nem transferência: só avisa a cliente e marca o
     * caso para a gestora verificar.
     * ------------------------------------------------------------------ */

    /** Antecedência mínima (em horas) para o cancelamento dar direito a pedir reembolso. */
    public static final int PRAZO_REEMBOLSO_HORAS = 24;

    /** Caso de sinal aguardando a análise da gestora. */
    public static final String REEMBOLSO_A_VERIFICAR = "A_VERIFICAR";
    /** A gestora já analisou o caso (reembolsando ou não, fora do sistema). */
    public static final String REEMBOLSO_VERIFICADO = "VERIFICADO";

    /** Data e hora exatas do início do atendimento. */
    public static LocalDateTime inicio(Agendamento a) {
        return LocalDateTime.of(a.getData(), a.getHora());
    }

    /** Último momento em que o cancelamento ainda fica "com 24 horas ou mais". */
    public static LocalDateTime prazoReembolso(Agendamento a) {
        return inicio(a).minusHours(PRAZO_REEMBOLSO_HORAS);
    }

    /**
     * true = cancelamento feito em "momento" com 24 horas ou mais de antecedência
     * (exatamente 24h antes ainda conta como no prazo).
     */
    public static boolean noPrazoDeReembolso(Agendamento a, LocalDateTime momento) {
        return !momento.isAfter(prazoReembolso(a));
    }

    /** true se o agendamento tem valor de sinal registrado (> 0). */
    public static boolean temSinalRegistrado(Agendamento a) {
        return a.getValorSinal() != null && a.getValorSinal().signum() > 0;
    }

    /**
     * Para os avisos: "YYYY-MM-DDTHH:mm" até quando a cliente pode cancelar e
     * ainda pedir o reembolso do sinal. Null se não houver sinal ou se o
     * agendamento não estiver mais ativo (PENDENTE/CONFIRMADO).
     */
    public static String cancelarComReembolsoAte(Agendamento a) {
        boolean ativo = a.getStatus() == prontto_api.domain.enums.StatusAgendamento.PENDENTE
                || a.getStatus() == prontto_api.domain.enums.StatusAgendamento.CONFIRMADO;
        return ativo && temSinalRegistrado(a) ? prazoReembolso(a).toString() : null;
    }
}
