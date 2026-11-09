package prontto_api.dto;

import jakarta.validation.constraints.NotBlank;

public record MotivoCancelamentoRequest(
        @NotBlank(message = "O motivo do cancelamento é obrigatório")
        String motivo
) {}