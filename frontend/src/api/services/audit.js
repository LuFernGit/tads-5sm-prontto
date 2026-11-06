import { http } from "../http"

/** Registros de acesso (LOG_AUDITORIA). */
export const auditApi = {
  /** GET /gestora/auditoria → [{ id, user, acao, ip, dh: "YYYY-MM-DD HH:mm:ss" }] */
  list: () => http.get("/gestora/auditoria"),
}
