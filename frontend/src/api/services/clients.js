import { http } from "../http"

/** Clientes da clínica (visão da gestora). */
export const clientsApi = {
  /**
   * GET /gestora/clientes → ClienteGestora[]
   * (com appts, alergias, historico da ficha e notas internas da gestora)
   */
  list: () => http.get("/gestora/clientes"),

  /**
   * GET /gestora/clientes/{id}/ficha/versoes → VersaoFicha[] (da atual para a mais antiga)
   * VersaoFicha = { id, numero, data: ISO|null, alergias, observacoes, respostas, atual }
   * Cada versão é a ficha COMPLETA salva naquele momento (FICHA_ANAMNESE_VERSAO).
   */
  listHealthVersions: (id) => http.get(`/gestora/clientes/${id}/ficha/versoes`),

  /* ---- Notas internas da gestora (várias por cliente; a cliente não vê) ---- */
  /** GET /gestora/clientes/{id}/notas → [{ id, texto, criadaEm, atualizadaEm }] */
  listNotes: (id) => http.get(`/gestora/clientes/${id}/notas`),
  /** POST /gestora/clientes/{id}/notas { texto } → 201 Nota */
  createNote: (id, texto) => http.post(`/gestora/clientes/${id}/notas`, { texto }),
  /** PUT /gestora/clientes/{id}/notas/{notaId} { texto } → Nota */
  updateNote: (id, notaId, texto) =>
    http.put(`/gestora/clientes/${id}/notas/${notaId}`, { texto }),
  /** DELETE /gestora/clientes/{id}/notas/{notaId} → 204 */
  deleteNote: (id, notaId) => http.delete(`/gestora/clientes/${id}/notas/${notaId}`),
}
