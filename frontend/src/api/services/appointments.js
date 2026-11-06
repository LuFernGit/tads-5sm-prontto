import { toManagerAppointment } from "../adapters"
import { http } from "../http"

/**
 * Agendamentos vistos pela gestora.
 * Backend devolve: { id, cliente, whatsapp, nomeProcedimento, data: "YYYY-MM-DD",
 *   hora: "HH:mm", duracao, status, canceladoPor?, motivoCancelamento?, dataCancelamento? }
 *   ↳ AGENDAMENTO + nome/whatsapp da cliente (JOIN com USUARIO)
 * As telas recebem o formato convertido por toManagerAppointment (src/api/adapters.js).
 */
export const appointmentsApi = {
  /** GET /gestora/agendamentos */
  list: () =>
    http
      .get("/gestora/agendamentos")
      .then((list) => (list ?? []).map(toManagerAppointment)),

  /**
   * POST /gestora/agendamentos/{id}/cancelamento  { motivo }
   * BACKEND: UPDATE AGENDAMENTO SET status 'CANCELADO', cancelado_por 'GESTORA',
   * motivo_cancelamento, data_cancelamento = NOW(); registra LOG_AUDITORIA.
   */
  cancel: (id, motivo) =>
    http
      .post(`/gestora/agendamentos/${id}/cancelamento`, { motivo })
      .then(toManagerAppointment),
}
