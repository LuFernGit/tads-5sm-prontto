package prontto_api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record CadastroClienteRequest(
        @NotNull(message = "Dados do usuário são obrigatórios")
        UsuarioClienteDto usuario,

        FichaAnamneseRequest ficha,
        Map<String, Object> aceite
) {
    public record UsuarioClienteDto(
            String nome,
            String data_nascimento,
            String whatsapp,
            String email,
            String senha,
            String tipo,
            Boolean recorrente
    ) {}
}