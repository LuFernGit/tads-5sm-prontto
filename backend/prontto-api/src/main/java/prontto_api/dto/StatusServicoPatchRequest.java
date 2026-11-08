package prontto_api.dto;

import jakarta.validation.constraints.NotNull;

public record StatusServicoPatchRequest(
        @NotNull(message = "O status ativo é obrigatório")
        Boolean active
) {}