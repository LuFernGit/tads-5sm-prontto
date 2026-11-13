package prontto_api.dto;

import java.math.BigDecimal;

public record AgendamentoGestoraResponse(
        String id,
        String cliente,
        String whatsapp,
        String nomeProcedimento,
        String data,
        String hora,
        Integer duracao,
        String status,
        String canceladoPor,
        String motivoCancelamento,
        String dataCancelamento,
        BigDecimal valorSinal,          // valor REGISTRADO (o Prontto não confirma o pagamento)
        Boolean cancelamentoNoPrazo,    // cliente cancelou com 24h+ de antecedência?
        String reembolsoStatus,         // null | A_VERIFICAR | VERIFICADO
        String cancelarComReembolsoAte  // "YYYY-MM-DDTHH:mm" — prazo da cliente para cancelar com reembolso (ativo com sinal)
) {}
