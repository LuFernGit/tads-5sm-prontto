import { http } from "../http"

/**
 * Empresa da gestora logada (tabela CLINICA).
 * Empresa = {
 *   slug, status ('ATIVA' | 'ENCERRAMENTO_SOLICITADO' | 'ENCERRADA'),
 *   name (nome), cpfCnpj (cpf_cnpj), phone (whatsapp), email (email_contato),
 *   address (endereco), description (descricao), logoImage (logo_clinica),
 *   instagram, tagline (slogan), heroTitle (titulo_principal),
 *   heroImage (imagem_capa), favicon,
 *   ownerName (nome da gestora, vem de USUARIO), initials (calculado no front)
 * }
 * As cores da vitrine NÃO são personalizáveis (decisão do projeto): o front usa
 * sempre as cores padrão do Prontto.
 */
export const companyApi = {
  /** GET /gestora/empresa → Empresa */
  get: () => http.get("/gestora/empresa"),

  /**
   * PUT /gestora/empresa  Empresa → Empresa
   * BACKEND: validar CPF/CNPJ e que o e-mail de contato seja diferente do
   * e-mail de acesso da gestora (USUARIO.email). Ignorar slug e status.
   */
  update: (empresa) => http.put("/gestora/empresa", empresa),

  /**
   * POST /gestora/empresa/encerramento
   * BACKEND: UPDATE CLINICA SET status = 'ENCERRAMENTO_SOLICITADO' e registra
   * LOG_AUDITORIA. Dados com obrigação legal de guarda não são apagados.
   */
  requestDeletion: () => http.post("/gestora/empresa/encerramento"),
}
