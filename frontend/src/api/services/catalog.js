import { http } from "../http"

/**
 * Catálogo da gestora: serviços e categorias.
 * Servico = { id, name, category, duration, price, active, description, image }
 *   duration = minutos (número inteiro)  → SERVICO.duracao INT
 *   price    = reais (número)            → SERVICO.preco DECIMAL(10,2)
 *   category = nome da categoria         → BACKEND converte para SERVICO.id_categoria
 *                                          (CATEGORIA tem UNIQUE (id_clinica, nome))
 *   image    = foto_servico
 */
export const catalogApi = {
  /** GET /gestora/servicos → Servico[] */
  listServices: () => http.get("/gestora/servicos"),

  /** POST /gestora/servicos  Servico (sem id) → Servico */
  createService: (servico) => http.post("/gestora/servicos", servico),

  /** PUT /gestora/servicos/{id}  Servico → Servico */
  updateService: (id, servico) => http.put(`/gestora/servicos/${id}`, servico),

  /** PATCH /gestora/servicos/{id}/status  { active } → Servico */
  setServiceActive: (id, active) =>
    http.patch(`/gestora/servicos/${id}/status`, { active }),

  /** GET /gestora/categorias → string[] (tabela CATEGORIA da clínica) */
  listCategories: () => http.get("/gestora/categorias"),

  /**
   * POST /gestora/categorias  { nome, capa } → string[] (lista atualizada; 409 se já existir)
   * capa = foto de capa na vitrine (data URL), OBRIGATÓRIA → CATEGORIA.capa
   */
  createCategory: (nome, capa) =>
    http.post("/gestora/categorias", { nome, capa }),

  /** GET /gestora/categorias/capas → { [nome]: capa } (só categorias com foto própria) */
  listCategoryCovers: () => http.get("/gestora/categorias/capas"),

  /**
   * PUT /gestora/categorias/{nome}/capa  { capa } → { [nome]: capa } atualizado
   * capa obrigatória (400 se vier vazia).
   */
  setCategoryCover: (nome, capa) =>
    http.put(`/gestora/categorias/${encodeURIComponent(nome)}/capa`, { capa }),

  /**
   * DELETE /gestora/categorias/{nome}?moverPara=Outra → string[]
   * Com serviços na categoria, eles são movidos para "moverPara" antes de excluir
   * (409 se tiver serviços e não informar o destino).
   */
  deleteCategory: (nome, moverPara) =>
    http.delete(
      `/gestora/categorias/${encodeURIComponent(nome)}${
        moverPara ? `?moverPara=${encodeURIComponent(moverPara)}` : ""
      }`,
    ),
}
