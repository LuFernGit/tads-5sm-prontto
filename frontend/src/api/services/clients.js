import { http } from "../http"

/** Clientes da clínica (visão da gestora). */
export const clientsApi = {
  /** GET /gestora/clientes → ClienteGestora[] (com appts, alergias, notasGestora, historico) */
  list: () => http.get("/gestora/clientes"),

  /** PUT /gestora/clientes/{id}/notas  { notasGestora } (máx. 500 caracteres) */
  saveNotes: (id, notasGestora) =>
    http.put(`/gestora/clientes/${id}/notas`, { notasGestora }),
}
