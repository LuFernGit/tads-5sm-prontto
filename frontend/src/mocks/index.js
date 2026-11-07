/**
 * MOCK — ponto de entrada do backend falso.
 * O src/api/http.js carrega este arquivo somente quando VITE_USE_MOCKS=true.
 * Pode apagar a pasta src/mocks inteira depois da integração com o Spring.
 */
import { persist } from "./db"
import { router } from "./handlers"
import { MockHttpError } from "./router"

// Atraso artificial para simular o tempo de resposta de um servidor real.
const LATENCY_MS = 250

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

// Cópia profunda: a tela nunca recebe o mesmo objeto guardado no 'banco' falso.
const clone = (value) =>
  value === undefined || value === null
    ? null
    : JSON.parse(JSON.stringify(value))

/**
 * @param {{ method: string, path: string, query: object, body: unknown, token: string|null }} request
 * @returns {Promise<{ status: number, body: unknown }>}
 */
export async function handleMockRequest({ method, path, query, body, token }) {
  await wait(LATENCY_MS)
  const cleanPath = path.split("?")[0].replace(/\/$/, "")
  // Procura qual handler (mocks/handlers.js) atende este método + caminho.
  const found = router.match(method, cleanPath)
  if (!found) {
    console.warn(`[mock] Rota não implementada: ${method} ${cleanPath}`)
    return {
      status: 404,
      body: { status: 404, message: `Rota não encontrada: ${method} ${cleanPath}` },
    }
  }
  try {
    const result = await found.handler({
      params: found.params,
      query,
      body: body instanceof FormData ? body : clone(body),
      token,
    })
    // Qualquer requisição que altera dados salva o 'banco' no localStorage.
    // POST que cria algo devolve 201 (Created), as demais devolvem 200 (OK).
    if (method !== "GET") persist()
    return { status: method === "POST" && result ? 201 : 200, body: clone(result) }
  } catch (error) {
    if (error instanceof MockHttpError)
      return {
        status: error.status,
        body: { status: error.status, message: error.message, ...error.extra },
      }
    console.error("[mock] Erro inesperado", error)
    return { status: 500, body: { status: 500, message: "Erro no mock." } }
  }
}
