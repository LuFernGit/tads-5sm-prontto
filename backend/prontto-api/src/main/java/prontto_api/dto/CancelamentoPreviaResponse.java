package prontto_api.dto;

import java.math.BigDecimal;

/**
 * O que acontece com o sinal se a cliente cancelar AGORA (calculado no backend,
 * que é a fonte única da regra de 24 horas — RegrasAgendamento).
 *
 *  - noPrazo       true = faltam 24h ou mais para o horário (pode pedir reembolso)
 *  - temSinal      true = há valor de sinal registrado no agendamento
 *  - valorSinal    valor REGISTRADO (o Prontto não confirma pagamento real)
 *  - prazoReembolso "YYYY-MM-DDTHH:mm" — último momento para cancelar no prazo
 */
public record CancelamentoPreviaResponse(
        String agendamentoId,
        boolean noPrazo,
        boolean temSinal,
        BigDecimal valorSinal,
        String prazoReembolso,
        int prazoHoras
) {}
