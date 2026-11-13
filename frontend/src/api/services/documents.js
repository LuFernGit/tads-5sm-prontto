import { http } from "../http"

/**
 * Documentos legais (termos e políticas) com versionamento.
 * Documento = { id, titulo, tipo, versao, arquivo, status: RASCUNHO|PUBLICADO|INATIVO,
 *               publicadoEm, plataforma, aceites, excluidoEm }
 */
export const documentsApi = {
  /** GET /gestora/documentos → Documento[] */
  list: () => http.get("/gestora/documentos"),

  /** GET /gestora/documentos/{id} → { ...Documento, conteudo, arquivoUrl (PDF em data URL) } */
  get: (id) => http.get(`/gestora/documentos/${id}`),

  /** POST /gestora/documentos { titulo, tipo, conteudo } → 201 (RASCUNHO) */
  create: (doc) => http.post("/gestora/documentos", doc),

  /** PUT /gestora/documentos/{id} { titulo, conteudo } → só RASCUNHO */
  update: (id, doc) => http.put(`/gestora/documentos/${id}`, doc),

  /**
   * DELETE /gestora/documentos/{id} → 204 (não pode: publicado ou com aceites).
   * Exclusão LÓGICA: o documento sai da lista, mas fica salvo (texto e PDF).
   */
  remove: (id) => http.delete(`/gestora/documentos/${id}`),

  /** GET /gestora/documentos/excluidos → Documento[] (com excluidoEm), mais recentes primeiro */
  listDeleted: () => http.get("/gestora/documentos/excluidos"),

  /** POST /gestora/documentos/{id}/restauracao → Documento (volta para a lista com o status que tinha) */
  restore: (id) => http.post(`/gestora/documentos/${id}/restauracao`),

  /** DELETE /gestora/documentos/{id}/arquivo → Documento (tira o PDF de um rascunho) */
  removeFile: (id) => http.delete(`/gestora/documentos/${id}/arquivo`),

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
