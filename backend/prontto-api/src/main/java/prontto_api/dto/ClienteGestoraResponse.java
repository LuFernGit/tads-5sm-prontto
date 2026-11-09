package prontto_api.dto;

import java.util.List;

public record ClienteGestoraResponse(
        Long id,
        String name,
        String initials,
        String email,
        String whatsapp,
        Boolean recorrente,
        String status,
        String service,
        String model,
        String lastDate,
        List<AgendamentoItemDto> appts,
        String alergias,
        String observacoes,
        String notasGestora,
        String atualizadaEm,
        List<HistoricoItemDto> historico
) {
    public record AgendamentoItemDto(
            String data,
            String hora,
            String servico,
            String status
    ) {}

    public record HistoricoItemDto(
            String campo,
            String anterior,
            String novo,
            String data
    ) {}
}
