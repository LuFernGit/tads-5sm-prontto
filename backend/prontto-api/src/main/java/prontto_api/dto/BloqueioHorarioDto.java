package prontto_api.dto;

public record BloqueioHorarioDto(
        Long id,
        String data,
        String inicio,
        String fim,
        String motivo
) {}