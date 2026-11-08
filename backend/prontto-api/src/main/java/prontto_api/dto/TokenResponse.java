package prontto_api.dto;

public record TokenResponse(
        String token,
        UsuarioSessaoResponse usuario
) {}