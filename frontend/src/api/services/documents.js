import { http } from "../http"

/**
 * Documentos legais (termos e políticas) com versionamento.
 * Documento = { id, titulo, tipo, versao, arquivo, status: RASCUNHO|PUBLICADO|INATIVO,
 *               publicadoEm, plataforma, aceites }
 */
export const documentsApi = {
  /** GET /gestora/documentos → Documento[] */
  list: () => http.get("/gestora/documentos"),

  /** POST /gestora/documentos/{id}/versoes → Documento (novo rascunho) */
  createVersion: (id) => http.post(`/gestora/documentos/${id}/versoes`),

  /** POST /gestora/documentos/{id}/publicacao → Documento[] (lista atualizada; a versão anterior vira INATIVO) */
  publish: (id) => http.post(`/gestora/documentos/${id}/publicacao`),

  /** POST /gestora/documentos/{id}/inativacao → Documento */
  deactivate: (id) => http.post(`/gestora/documentos/${id}/inativacao`),

  /** POST /gestora/documentos/{id}/arquivo  multipart "arquivo" (PDF) → Documento */
  uploadFile: (id, file) =>
    http.upload(`/gestora/documentos/${id}/arquivo`, file),
}
