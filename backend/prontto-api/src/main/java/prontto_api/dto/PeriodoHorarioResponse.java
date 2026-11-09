package prontto_api.dto;

import java.util.List;

public record PeriodoHorarioResponse(
        String label,
        List<SlotDto> slots
) {
    public record SlotDto(
            String time,
            Boolean occupied
    ) {}
}