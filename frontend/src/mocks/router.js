/** MOCK — roteador mínimo para casar "MÉTODO /caminho/:param" com os handlers. */

/** Erro com status HTTP, lançado pelos handlers (ex.: 401, 404, 409). */
export class MockHttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

/** Atalho para devolver um erro no mesmo formato que o Spring devolveria. */
export const fail = (status, message, extra) => {
  throw new MockHttpError(status, message, extra)
}

/**
 * Cria o roteador. Exemplo: router.get('/clinicas/:slug', handler)
 * O ':slug' vira um grupo da regex e o valor chega em params.slug.
 */
export function createRouter() {
  const routes = []
  const add = (method) => (pattern, handler) => {
    const keys = []
    const regex = new RegExp(
      `^${pattern.replace(/:(\w+)/g, (_, key) => {
        keys.push(key)
        return "([^/]+)"
      })}$`,
    )
    routes.push({ method, regex, keys, handler })
  }
  return {
    get: add("GET"),
    post: add("POST"),
    put: add("PUT"),
    patch: add("PATCH"),
    delete: add("DELETE"),
    match(method, path) {
      for (const route of routes) {
        if (route.method !== method) continue
        const found = route.regex.exec(path)
        if (!found) continue
        const params = Object.fromEntries(
          route.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]),
        )
        return { handler: route.handler, params }
      }
      return null
    },
  }
}
