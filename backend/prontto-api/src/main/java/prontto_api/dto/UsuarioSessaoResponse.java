package prontto_api.dto;

public record UsuarioSessaoResponse(
        String id,
        String nome,
        String email,
        String perfil,
        String clinicaSlug
) {}