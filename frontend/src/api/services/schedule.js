import { http } from "../http"
import { fromHorarioRows, toHorarioRows } from "@/lib/schedule"

/**
 * Agenda da gestora: painel semanal, horários de funcionamento e bloqueios.
 *
 * Decisão do projeto (opção A): a disponibilidade vem só de três tabelas —
 * HORARIO (expediente), BLOQUEIO_HORARIO (fechamentos) e AGENDAMENTO (ocupados).
 * Não existe "horário avulso": para fechar um horário cria-se um bloqueio; para
 * abrir mais horários altera-se o horário de funcionamento.
 */
export const scheduleApi = {
  /**
   * GET /gestora/painel → {
   *   dias:   ["SEG 02", ...]            rótulos da semana atual
   *   datas:  ["2026-11-02", ...]        mesma ordem dos dias
   *   horarios: Slot[][]                 um array de horários por dia
   *   proximos: ProximoAtendimento[]
   * }
   * Slot = { time: "09:00", end: "10:00", status: "free"|"busy"|"blocked",
   *          agendamentoId?, client?, whatsapp?, service?,  (quando busy)
   *          bloqueio?: { id, inicio, fim } }                (quando blocked)
   * BACKEND: calcula os slots a partir de HORARIO, BLOQUEIO_HORARIO e AGENDAMENTO
   * (implementação de referência na rota /gestora/painel de src/mocks/handlers.js).
   */
  getDashboard: () => http.get("/gestora/painel"),

  /**
   * GET /gestora/horarios-funcionamento → linhas da tabela HORARIO
   * [{ dia_semana, hora_inicio: "09:00:00", hora_fim, ativo }]
   * (convertidas aqui para o formato da tela, com almoço)
   */
  getBusinessHours: () =>
    http.get("/gestora/horarios-funcionamento").then(fromHorarioRows),

  /**
   * PUT /gestora/horarios-funcionamento  mesmas linhas da tabela HORARIO
   * BACKEND: substitui as linhas da clínica (DELETE + INSERT na mesma transação).
   */
  saveBusinessHours: (rules) =>
    http.put("/gestora/horarios-funcionamento", toHorarioRows(rules)),

  /** GET /gestora/bloqueios → [{ id, data, inicio, fim, motivo }] (inicio/fim null = dia inteiro) */
  listBlocks: () => http.get("/gestora/bloqueios"),

  /**
   * POST /gestora/bloqueios  { data, inicio, fim, motivo }
   * Dia inteiro: inicio e fim = null (BLOQUEIO_HORARIO.hora_inicio/hora_fim NULL).
   * → Bloqueio + agendamentosNoPeriodo: [{ id, cliente, hora }]
   * BACKEND: permitir o bloqueio mesmo com agendamentos no período (eles NÃO
   * são cancelados) e devolver a lista para o front alertar a gestora.
   */
  createBlock: ({ data, inicio, fim, motivo }) =>
    http.post("/gestora/bloqueios", {
      data,
      inicio: inicio || null,
      fim: fim || null,
      motivo: motivo || null,
    }),

  /** DELETE /gestora/bloqueios/{id} */
  deleteBlock: (id) => http.delete(`/gestora/bloqueios/${id}`),
}
