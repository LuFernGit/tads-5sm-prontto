/**
 * Guarda o token JWT devolvido pelo backend.
 *
 * Cada fluxo tem o seu próprio "escopo", definido pela URL:
 *   gestora                 → painel da empresa (link do Prontto)
 *   cliente:<slug-clinica>  → área da cliente de uma clínica
 * Assim, a mesma pessoa pode ter a gestora logada em uma aba e a cliente em outra.
 */
// O token fica no localStorage do navegador com a chave 'prontto.token.<escopo>'.
const PREFIX = "prontto.token."

let scope = "gestora"
// Funções que querem ser avisadas quando a sessão expirar (padrão 'observer').
const listeners = new Set()

// Acessa o localStorage com segurança: em modo anônimo ou bloqueado ele pode dar erro.
const storage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Define qual fluxo está ativo nesta aba. */
export function setSessionScope(next) {
  scope = next
}

/** Devolve o escopo atual ('gestora' ou 'cliente:<slug>'). */
export function getSessionScope() {
  return scope
}

/** Lê o token salvo do escopo atual (ou null se não houver login). */
export function getToken() {
  try {
    return storage()?.getItem(PREFIX + scope) || null
  } catch {
    return null
  }
}

/** Salva o token; se vier vazio, apaga (equivale a sair). */
export function setToken(token) {
  try {
    if (token) storage()?.setItem(PREFIX + scope, token)
    else storage()?.removeItem(PREFIX + scope)
  } catch {
    /* Sem armazenamento: a sessão dura até recarregar a página. */
  }
}

/** Apaga o token: usado no logout e quando a sessão expira. */
export function clearToken() {
  setToken(null)
}

/** Avisa quem estiver ouvindo que a sessão expirou (resposta 401 do backend). */
export function emitSessionExpired() {
  listeners.forEach((listener) => listener())
}

/** Registra uma função para ouvir a expiração. Devolve outra função que cancela o registro. */
export function onSessionExpired(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
