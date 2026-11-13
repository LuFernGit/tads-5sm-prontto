import { http } from "../http"
import { clearToken, setToken } from "../session"

/**
 * Autenticação (Spring Security + JWT).
 * Todas as rotas de login/cadastro devolvem: { token: string, usuario: Usuario }
 * Usuario = { id, nome, email, perfil: "GESTORA" | "CLIENTE", clinicaSlug }
 * BACKEND: senha sempre gravada com hash (BCrypt) em USUARIO.senha; registrar
 * LOGIN e LOGIN_FALHA em LOG_AUDITORIA (id_usuario NULL na falha).
 */
const keepToken = (response) => {
  if (response?.token) setToken(response.token)
  return response
}

export const authApi = {
  /** POST /auth/gestora/login  { email, senha } */
  loginManager: (email, senha) =>
    http.post("/auth/gestora/login", { email, senha }).then(keepToken),

  /**
   * POST /auth/gestora/cadastro
   * {
   *   empresa: {
   *     name, cpfCnpj, phone (whatsapp da clínica), email (e-mail de CONTATO,
   *     diferente do e-mail de acesso), instagram, address, tagline, heroTitle,
   *     description, logoImage, heroImage, termsOfUse, privacyPolicy,
   *     clinicTermsDocument, clinicTermsFileName
   *   },
   *   gestora:  { nome, email (ACESSO), senha, dataNascimento: "YYYY-MM-DD", whatsapp },
   *   servicos: [{ name, category, duration (min), price (R$), description, image }],
   *   categorias: string[],
   *   aceites:  { termosUso, politicaPrivacidade, termosClinica, dataHora }
   * }
   * BACKEND: validar idade mínima de 16 anos, CPF/CNPJ, e-mails diferentes e
   * aceites; gravar USUARIO, CLINICA, CATEGORIA, SERVICO, HORARIO e
   * ACEITE_DOCUMENTO (papel 'GESTORA') numa transação. Passo a passo na rota
   * /auth/gestora/cadastro de src/mocks/handlers.js.
   */
  registerCompany: (payload) =>
    http.post("/auth/gestora/cadastro", payload).then(keepToken),

  /** POST /clinicas/{slug}/auth/login  { email, senha } (só aceita perfil CLIENTE; 403 para gestora) */
  loginClient: (slug, email, senha) =>
    http.post(`/clinicas/${slug}/auth/login`, { email, senha }).then(keepToken),

  /**
   * POST /clinicas/{slug}/clientes  { usuario, ficha, aceite } (payload do ClientRegisterPage)
   * ficha = { alergias, observacoes_medicas (resumo até 500), respostas (todas as perguntas) }
   * BACKEND: validar 15 anos; gravar USUARIO com id_clinica da clínica do link,
   * FICHA_ANAMNESE (respostas em coluna JSON) e ACEITE_DOCUMENTO (papel 'CLIENTE').
   */
  registerClient: (slug, payload) =>
    http.post(`/clinicas/${slug}/clientes`, payload).then(keepToken),

  /**
   * GET /auth/disponibilidade?email=&whatsapp=&cpfCnpj=
   * → { emailEmUso?, whatsappEmUso?, cpfCnpjEmUso? } (só os campos enviados).
   * Os cadastros usam isto para avisar na etapa certa, antes dos Termos.
   */
  checkAvailability: ({ email, whatsapp, cpfCnpj } = {}) =>
    http.get("/auth/disponibilidade", { email, whatsapp, cpfCnpj }),

  /** GET /auth/me → Usuario dono do token atual */
  me: () => http.get("/auth/me"),

  /** POST /auth/recuperar-senha  { email } */
  forgotPassword: (email) => http.post("/auth/recuperar-senha", { email }),

  /** POST /auth/logout (opcional: com JWT stateless basta descartar o token) */
  logout: async () => {
    try {
      await http.post("/auth/logout")
    } catch {
      /* Mesmo se o backend falhar, o token local é descartado. */
    } finally {
      clearToken()
    }
  },
}
