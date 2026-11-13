package prontto_api.dto;

import java.math.BigDecimal;

public record AgendamentoClienteResponse(
        String id,
        String servicoId,
        String nomeProcedimento,
        String data,
        String hora,
        Integer duracao,
        BigDecimal valorServico,
        BigDecimal valorSinal,
        String status,
        String canceladoPor,        // GESTORA | CLIENTE | SISTEMA (quando cancelado)
        String motivoCancelamento,  // ex.: "Presença não confirmada até 24 horas antes do horário."
        String confirmarAte,        // "YYYY-MM-DDTHH:mm" — prazo para confirmar (só quando PENDENTE)
        Boolean cancelamentoNoPrazo, // cliente cancelou com 24h+ de antecedência? (null se não cancelou)
        String cancelarComReembolsoAte // "YYYY-MM-DDTHH:mm" — até quando cancelar e pedir o sinal de volta (ativo com sinal)
) {}