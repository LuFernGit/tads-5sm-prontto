package prontto_api.dto;

import java.util.List;

/** Sino do painel: quantas não lidas + as notificações mais recentes. */
public record NotificacoesResponse(
        long naoLidas,
        List<Item> itens
) {
    public record Item(
            String id,
            String tipo,          // NOVO_AGENDAMENTO | PRESENCA_CONFIRMADA | CANCELAMENTO_CLIENTE | CANCELAMENTO_AUTOMATICO
            String titulo,
            String mensagem,
            String agendamentoId, // para o "Ver na agenda" (pode ser null)
            String dataAgendamento, // "YYYY-MM-DD" do atendimento (abre a semana certa)
            boolean requerAcao,   // ex.: reembolso a verificar
            String criadaEm,      // ISO
            boolean lida
    ) {}
}
