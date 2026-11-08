package prontto_api.dto;

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
        String dataCancelamento
) {}