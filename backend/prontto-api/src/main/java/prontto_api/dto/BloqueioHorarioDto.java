package prontto_api.dto;

import java.util.List;

public record BloqueioHorarioDto(
        Long id,
        String data,
        String inicio,
        String fim,
        String motivo,
        List<ConflitoAgendamentoDto> agendamentosNoPeriodo
) {
    public record ConflitoAgendamentoDto(
            String id,
            String cliente,
            String hora
    ) {}
}