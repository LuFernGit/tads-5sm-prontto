package prontto_api.dto;

import java.util.List;

public record PainelSemanalResponse(
        List<String> dias,
        List<String> datas,
        List<List<SlotPainelDto>> horarios,
        List<ProximoAtendimentoDto> proximos
) {
    public record SlotPainelDto(
            String time,
            String end,
            String status,
            String agendamentoId,
            String client,
            String whatsapp,
            String service,
            BloqueioInfo bloqueio
    ) {}

    public record BloqueioInfo(
            Long id,
            String inicio,
            String fim
    ) {}

    public record ProximoAtendimentoDto(
            String id,
            String time,
            String end,
            String name,
            String initial,
            Boolean alt,
            String service,
            String detail,
            String status,
            String signal
    ) {}
}
