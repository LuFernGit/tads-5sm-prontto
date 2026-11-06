import { http } from "../http"

/**
 * Modelos de mensagem do WhatsApp.
 * Modelo = { id, nome, finalidade, ativo, texto }
 */
export const messagesApi = {
  /** GET /gestora/mensagens/modelos → Modelo[] */
  listTemplates: () => http.get("/gestora/mensagens/modelos"),

  /**
   * PUT /gestora/mensagens/modelos  Modelo[] → Modelo[] (salva a lista inteira)
   * BACKEND: tabela MODELO_MENSAGEM. Itens com id numérico são atualizados;
   * itens com id de texto (ex.: "modelo-1730000000000", criados agora no front)
   * são novos: inserir e devolver a lista com os ids gerados pelo banco.
   */
  saveTemplates: (modelos) => http.put("/gestora/mensagens/modelos", modelos),

  /**
   * GET /gestora/mensagens/destinatarios
   * → [{ nome, whatsapp, servico, ultimo: "YYYY-MM-DD", data: "dd/MM/yyyy", horario }]
   */
  listRecipients: () => http.get("/gestora/mensagens/destinatarios"),
}
