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
            BloqueioInfo bloqueio,
            String appointmentStatus  // CONFIRMADO | PENDENTE (quando busy)
    ) {}

    public record BloqueioInfo(
            Long id,
            String inicio,
            String fim
    ) {}

    /**
     * Próximos atendimentos da clínica (a partir de agora, sem cancelados),
     * em ordem de data e hora. O primeiro é a "Próxima cliente" do painel.
     */
    public record ProximoAtendimentoDto(
            String id,
            String time,        // "HH:mm" de início
            String end,         // "HH:mm" de fim (início + duração do serviço)
            String name,        // nome da cliente
            String initial,     // inicial do nome (avatar)
            Boolean alt,        // alterna a cor do avatar na lista
            String service,     // nome do procedimento
            String detail,      // nome do procedimento (usado nos detalhes)
            String status,      // CONFIRMADO | PENDENTE
            String signal,      // texto do sinal: pago, isenta ou sem sinal
            String data,        // "YYYY-MM-DD" do atendimento
            Integer duracao,    // minutos
            String whatsapp,    // WhatsApp da cliente (só números)
            Boolean recorrente  // cliente recorrente (isenta de sinal)
    ) {}
}
