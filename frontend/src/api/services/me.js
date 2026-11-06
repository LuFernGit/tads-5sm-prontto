import { toClientAppointment } from "../adapters"
import { http } from "../http"

/**
 * Área da cliente logada (token com perfil CLIENTE).
 * Perfil = { name, email, whatsapp, birthDate: "YYYY-MM-DD", recurring }
 *   ↳ tabela USUARIO (nome, email, whatsapp, data_nascimento, recorrente)
 */
export const meApi = {
  /** GET /cliente/perfil → Perfil */
  getProfile: () => http.get("/cliente/perfil"),

  /**
   * PUT /cliente/perfil  { name, email, whatsapp, birthDate } → Perfil
   * BACKEND: UPDATE USUARIO; validar idade mínima de 15 anos e unicidade de
   * email/whatsapp (409 se já usados por outra conta).
   */
  updateProfile: (perfil) => http.put("/cliente/perfil", perfil),

  /**
   * GET /cliente/ficha-saude → { respostas, atualizadaEm: ISO }
   * BACKEND: FICHA_ANAMNESE.respostas (coluna JSON) e data_atualizacao.
   */
  getHealthRecord: () => http.get("/cliente/ficha-saude"),

  /**
   * PUT /cliente/ficha-saude  { respostas, alergias, observacoes_medicas }
   * BACKEND: UPDATE FICHA_ANAMNESE e INSERT HISTORICO_ANAMNESE para cada campo
   * alterado (campo_alterado, valor_anterior, valor_novo).
   */
  updateHealthRecord: (ficha) => http.put("/cliente/ficha-saude", ficha),

  /** GET /cliente/agendamentos → AgendamentoCliente[] (convertidos para a tela) */
  listAppointments: () =>
    http
      .get("/cliente/agendamentos")
      .then((list) => (list ?? []).map(toClientAppointment)),

  /**
   * POST /cliente/agendamentos
   * { servicoId, data: "YYYY-MM-DD", hora: "HH:mm", valorSinal: number|null }
   * BACKEND: confere disponibilidade (409 se ocupado/bloqueado) e copia
   * nome_procedimento e valor_servico do SERVICO (snapshot).
   * O pagamento do sinal é simulado no front e continua mockado.
   */
  createAppointment: (agendamento) =>
    http.post("/cliente/agendamentos", agendamento).then(toClientAppointment),

  /**
   * POST /cliente/agendamentos/{id}/cancelamento  { motivo }
   * BACKEND: status CANCELADO, cancelado_por 'CLIENTE', motivo e data_cancelamento.
   */
  cancelAppointment: (id, motivo) =>
    http
      .post(`/cliente/agendamentos/${id}/cancelamento`, { motivo })
      .then(toClientAppointment),

  /**
   * POST /cliente/conta/exclusao — exclusão IMEDIATA da conta (LGPD).
   * Não existe fila de pedidos: o backend anonimiza o USUARIO na hora, mantém
   * agendamentos e ficha (acesso só da gestora), registra LOG_AUDITORIA e
   * invalida o token. Detalhes em src/mocks/handlers.js (rota de exclusão).
   */
  deleteAccount: () => http.post("/cliente/conta/exclusao"),
}
