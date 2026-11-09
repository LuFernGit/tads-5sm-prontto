package prontto_api.dto;

public record PerfilClienteDto(
        String name,
        String email,
        String whatsapp,
        String birthDate,
        Boolean recurring
) {}