import { API_TIMEOUT_MS, API_URL, USE_MOCKS } from "./config"
import { clearToken, emitSessionExpired, getToken } from "./session"

/**
 * Cliente HTTP único do projeto. Todas as chamadas ao backend passam por aqui.
 *
 * - Envia/recebe JSON e anexa "Authorization: Bearer <token>" automaticamente.
 * - Converte os erros do Spring (ResponseStatusException, ProblemDetail ou
 *   @ControllerAdvice com "errors") em ApiError, com mensagem pronta para a tela.
 * - Com VITE_USE_MOCKS=true, as requisições são respondidas por src/mocks.
 *   Se a pasta src/mocks for apagada, o glob abaixo fica vazio e tudo vai
 *   direto para o backend, sem precisar mudar nenhum outro arquivo.
 */

// import.meta.glob (recurso do Vite) carrega os mocks só quando necessário.
const mockLoaders = import.meta.glob("../mocks/index.js")
const loadMock = Object.values(mockLoaders)[0]
let mockWarningShown = false

// Mostra no console (F12) qual backend está em uso. Só em desenvolvimento.
if (import.meta.env.DEV) {
  console.info(
    USE_MOCKS && loadMock
      ? "[api] Modo: MOCK (backend falso de src/mocks)"
      : `[api] Modo: BACKEND REAL (${API_URL} → Spring Boot)`,
  )
}

/** Erro padrão das chamadas: guarda o status HTTP e os erros por campo do formulário. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, fieldErrors?: Record<string, string>, data?: unknown }} [details]
   */
  constructor(message, { status = 0, fieldErrors = {}, data = null } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
    this.data = data
  }
}

// Mensagens amigáveis por código HTTP, usadas quando o backend não manda uma mensagem.
const DEFAULT_MESSAGES = {
  0: "Não foi possível conectar ao servidor. Verifique sua conexão.",
  400: "Confira os dados informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Registro não encontrado.",
  409: "Esta ação conflita com dados já existentes.",
  422: "Confira os dados informados.",
  500: "Erro inesperado no servidor. Tente novamente em instantes.",
}

/** Lê o formato de erro do Spring e devolve { message, fieldErrors }. */
function parseSpringError(status, data) {
  const fieldErrors = {}
  // Formato comum de @ControllerAdvice: { errors: [{ field, message }] } ou { errors: { campo: "msg" } }
  const errors = data?.errors ?? data?.fieldErrors
  if (Array.isArray(errors))
    errors.forEach((e) => {
      if (e?.field) fieldErrors[e.field] = e.defaultMessage || e.message
    })
  else if (errors && typeof errors === "object") Object.assign(fieldErrors, errors)
  const message =
    (typeof data === "string" && data) ||
    data?.message ||
    data?.detail || // ProblemDetail (Spring 6)
    data?.title ||
    DEFAULT_MESSAGES[status] ||
    DEFAULT_MESSAGES[status >= 500 ? 500 : 400]
  return { message, fieldErrors }
}

/** Monta a URL completa: API_URL + caminho + parâmetros (?chave=valor). Ignora valores vazios. */
function buildUrl(path, query) {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.append(key, String(value))
  })
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/** Envia a requisição ao backend FALSO (src/mocks), sem usar a rede. */
async function sendToMock(method, path, { body, query }) {
  const { handleMockRequest } = await loadMock()
  const result = await handleMockRequest({
    method,
    path,
    query: query ?? {},
    body,
    token: getToken(),
  })
  if (result.status >= 400) {
    const { message, fieldErrors } = parseSpringError(result.status, result.body)
    throw new ApiError(message, {
      status: result.status,
      fieldErrors,
      data: result.body,
    })
  }
  return result.body ?? null
}

/** Envia a requisição ao backend REAL com fetch, com tempo limite e token JWT. */
async function sendToServer(method, path, { body, query, headers = {} }) {
  const controller = new AbortController()
  // AbortController cancela a requisição se passar do tempo limite.
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const token = getToken()
  // FormData = envio de arquivo; nesse caso o navegador define o Content-Type sozinho.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch (error) {
    const timedOut = error?.name === "AbortError"
    throw new ApiError(
      timedOut
        ? "O servidor demorou para responder. Tente novamente."
        : DEFAULT_MESSAGES[0],
      { status: 0 },
    )
  } finally {
    window.clearTimeout(timer)
  }

  // Lê a resposta como texto e tenta converter para JSON (algumas respostas são vazias).
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) {
    // 401 = token inválido/expirado: apaga o token e avisa o app para voltar ao login.
    if (response.status === 401 && token) {
      clearToken()
      emitSessionExpired()
    }
    const { message, fieldErrors } = parseSpringError(response.status, data)
    throw new ApiError(message, { status: response.status, fieldErrors, data })
  }
  return data
}

/**
 * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} method
 * @param {string} path  Caminho relativo ao VITE_API_URL, ex.: "/gestora/servicos"
 * @param {{ body?: unknown, query?: Record<string, unknown>, headers?: Record<string,string> }} [options]
 */
export async function request(method, path, options = {}) {
  if (USE_MOCKS && loadMock) return sendToMock(method, path, options)
  if (USE_MOCKS && !loadMock && !mockWarningShown) {
    mockWarningShown = true
    console.warn(
      "[api] VITE_USE_MOCKS=true, mas a pasta src/mocks não existe. Usando o backend real.",
    )
  }
  return sendToServer(method, path, options)
}

// Atalhos usados pelos arquivos de api/services: http.get(...), http.post(...) etc.
export const http = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  delete: (path) => request("DELETE", path),
  /** Envio de arquivo (multipart/form-data). No Spring: @RequestPart / MultipartFile. */
  upload: (path, file, field = "arquivo") => {
    const form = new FormData()
    form.append(field, file)
    return request("POST", path, { body: form })
  },
}
