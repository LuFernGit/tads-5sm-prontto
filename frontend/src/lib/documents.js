import { API_URL } from "@/api/config"

/** Endereço do PDF de um documento publicado (servido pelo backend como arquivo). */
export const documentPdfUrl = (slug, id, download = false) =>
  `${API_URL}/clinicas/${slug}/documentos/${id}/pdf${download ? "?download=1" : ""}`

/**
 * Documento publicado de um tipo, vindo da vitrine (company.documents).
 * platform = true → do Prontto; false → da clínica.
 */
export const findDocument = (company, tipo, platform) =>
  (company?.documents ?? []).find((d) => d.tipo === tipo && d.plataforma === platform) ?? null
