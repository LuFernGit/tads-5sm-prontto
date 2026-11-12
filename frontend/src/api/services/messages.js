import { http } from "../http"

/**
 * Modelos de mensagem do WhatsApp (CRUD da gestora).
 * Modelo = { id, nome, finalidade, ativo, texto }
 * finalidade: CONFIRMACAO | CANCELAMENTO | LEMBRETE | MANUTENCAO | ALTERACAO | REAGENDAMENTO | PERSONALIZADA
 */
export const messagesApi = {
  /** GET /gestora/mensagens/modelos → Modelo[] (os 6 padrão são criados no cadastro da clínica) */
  listTemplates: () => http.get("/gestora/mensagens/modelos"),

  /** POST /gestora/mensagens/modelos  Modelo (sem id) → 201 Modelo */
  createTemplate: (modelo) => http.post("/gestora/mensagens/modelos", modelo),

  /** PUT /gestora/mensagens/modelos/{id}  Modelo → Modelo */
  updateTemplate: (id, modelo) => http.put(`/gestora/mensagens/modelos/${id}`, modelo),

  /** DELETE /gestora/mensagens/modelos/{id} → 204 (qualquer modelo, inclusive os padrão) */
  deleteTemplate: (id) => http.delete(`/gestora/mensagens/modelos/${id}`),

  /** POST /gestora/mensagens/modelos/padrao → Modelo[] (recria só os padrão que faltam) */
  addDefaultTemplates: () => http.post("/gestora/mensagens/modelos/padrao"),

  /** POST /gestora/mensagens/modelos/{id}/restaurar → Modelo com nome e texto padrão */
  restoreTemplate: (id) => http.post(`/gestora/mensagens/modelos/${id}/restaurar`),

  /**
   * GET /gestora/mensagens/destinatarios
   * → [{ nome, whatsapp, servico, ultimo, data, horario, agendamentoId, status }]
   */
  listRecipients: () => http.get("/gestora/mensagens/destinatarios"),
}
