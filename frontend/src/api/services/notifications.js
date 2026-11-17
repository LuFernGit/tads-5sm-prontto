import { http } from "../http"

/**
 * Notificações da gestora (sino do painel).
 * Resposta das 3 rotas: { naoLidas, itens: [{ id, tipo, titulo, mensagem,
 *   agendamentoId, dataAgendamento, requerAcao, criadaEm, lida }] }
 * tipo: NOVO_AGENDAMENTO | PRESENCA_CONFIRMADA | CANCELAMENTO_CLIENTE | CANCELAMENTO_AUTOMATICO
 */
export const notificationsApi = {
  /** GET /gestora/notificacoes → as 30 mais recentes + total de não lidas */
  list: () => http.get("/gestora/notificacoes"),

  /** POST /gestora/notificacoes/lidas → marca todas como lidas */
  markAllRead: () => http.post("/gestora/notificacoes/lidas"),

  /** POST /gestora/notificacoes/{id}/lida → marca uma como lida */
  markRead: (id) => http.post(`/gestora/notificacoes/${id}/lida`),
}
