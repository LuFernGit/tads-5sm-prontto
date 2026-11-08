package prontto_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ServicoRequest(
        String id,

        @NotBlank(message = "O nome do serviço é obrigatório")
        String name,

        String category,

        @NotNull(message = "A duração é obrigatória")
        Integer duration,

        @NotNull(message = "O preço é obrigatório")
        BigDecimal price,

        Boolean active,
        String description,
        String image
) {}