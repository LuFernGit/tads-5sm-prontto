package prontto_api.dto;

public record DestinatarioMensagemDto(
        String nome,
        String whatsapp,
        String servico,
        String ultimo,
        String data,
        String horario,
        Long agendamentoId,   // para escolher o agendamento ao preparar a mensagem
        String status         // PENDENTE, CONFIRMADO, CONCLUIDO...
) {}