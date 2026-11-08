package prontto_api.dto;

import java.math.BigDecimal;

public record ServicoResponse(
        String id,
        String name,
        String category,
        Integer duration,
        BigDecimal price,
        Boolean active,
        String description,
        String image
) {}