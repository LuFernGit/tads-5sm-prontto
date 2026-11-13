import { toManagerAppointment } from "../adapters"
import { http } from "../http"

/**
 * Agendamentos vistos pela gestora.
 * Backend devolve: { id, cliente, whatsapp, nomeProcedimento, data: "YYYY-MM-DD",
 *   hora: "HH:mm", duracao, status, canceladoPor?, motivoCancelamento?, dataCancelamento?,
 *   valorSinal?, cancelamentoNoPrazo?, reembolsoStatus? (null | A_VERIFICAR | VERIFICADO) }
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

  /**
   * POST /gestora/agendamentos/{id}/reembolso/verificado → agendamento atualizado.
   * A gestora registra que já analisou o sinal de um cancelamento feito pela
   * cliente (reembolso_status A_VERIFICAR → VERIFICADO). O Prontto não faz
   * estorno: ela confere o pagamento e reembolsa por fora, se for devido.
   */
  markRefundVerified: (id) =>
    http
      .post(`/gestora/agendamentos/${id}/reembolso/verificado`)
      .then(toManagerAppointment),
}
