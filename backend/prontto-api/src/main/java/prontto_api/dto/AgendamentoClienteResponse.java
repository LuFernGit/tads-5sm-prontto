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
        String status
) {}