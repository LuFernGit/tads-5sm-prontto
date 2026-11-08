package prontto_api.dto;

import java.util.List;

public record CalendarioDisponibilidadeResponse(
        List<Integer> diasLotados,
        List<Integer> diasSemanaFechados
) {}