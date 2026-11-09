package prontto_api.dto;

public record LogAuditoriaResponse(
        Long id,
        String user,
        String acao,
        String ip,
        String dh
) {}
