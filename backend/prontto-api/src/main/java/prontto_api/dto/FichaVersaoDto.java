package prontto_api.dto;

import java.util.Map;

/**
 * Uma versão completa da ficha de saúde.
 * data = ISO (null se a versão veio da migração e a data não era conhecida);
 * atual = true na versão que corresponde à ficha vigente.
 */
public record FichaVersaoDto(
        Long id,
        Integer numero,
        String data,
        String alergias,
        String observacoes,
        Map<String, Object> respostas,
        Boolean atual
) {}
