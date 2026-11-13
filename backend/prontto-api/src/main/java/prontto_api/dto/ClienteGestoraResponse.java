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
        Long versoesFicha,              // quantas versões completas a ficha tem (GET /gestora/clientes/{id}/ficha/versoes)
        List<NotaClienteDto> notas      // notas internas da gestora (mais recente primeiro)
) {
    public record AgendamentoItemDto(
            String data,
            String hora,
            String servico,
            String status
    ) {}
}
