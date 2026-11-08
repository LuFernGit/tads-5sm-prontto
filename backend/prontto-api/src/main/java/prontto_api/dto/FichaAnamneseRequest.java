package prontto_api.dto;

import java.util.Map;

public record FichaAnamneseRequest(
        String alergias,
        String observacoes_medicas,
        Map<String, Object> respostas
) {}