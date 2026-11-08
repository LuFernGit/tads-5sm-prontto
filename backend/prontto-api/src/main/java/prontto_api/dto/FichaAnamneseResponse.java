package prontto_api.dto;

import java.util.Map;

public record FichaAnamneseResponse(
        Map<String, Object> respostas,
        String atualizadaEm
) {}