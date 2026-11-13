/**
 * Guarda o token JWT devolvido pelo backend.
 *
 * Cada fluxo tem o seu próprio "escopo", definido pela URL:
 *   gestora                 → painel da empresa (link do Prontto)
 *   cliente:<slug-clinica>  → área da cliente de uma clínica
 * Assim, a mesma pessoa pode ter a gestora logada em uma aba e a cliente em outra.
 */
// O token fica no sessionStorage do navegador com a chave 'prontto.token.<escopo>':
// recarregar a página mantém o login, mas FECHAR a aba/navegador encerra a sessão.
const PREFIX = "prontto.token."
// Última atividade (mouse, teclado, toque, rolagem) por escopo, em milissegundos.
const ACTIVITY_PREFIX = "prontto.atividade."

/** Minutos sem nenhuma atividade até a sessão ser encerrada automaticamente. */
export const SESSION_IDLE_MINUTES = 30
const IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000

let scope = "gestora"
// Funções que querem ser avisadas quando a sessão expirar (padrão 'observer').
const listeners = new Set()

// Acessa o sessionStorage com segurança: em modo anônimo ou bloqueado ele pode dar erro.
const storage = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

// Tokens antigos ficavam no localStorage (sobreviviam ao fechar o navegador):
// apaga-os uma vez, para que ninguém continue logado por causa deles.
try {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => window.localStorage.removeItem(key))
} catch {
  /* sem acesso ao localStorage: nada a limpar */
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
    if (token) {
      storage()?.setItem(PREFIX + scope, token)
      touchActivity() // login conta como atividade
    } else {
      storage()?.removeItem(PREFIX + scope)
      storage()?.removeItem(ACTIVITY_PREFIX + scope)
    }
  } catch {
    /* Sem armazenamento: a sessão dura até recarregar a página. */
  }
}

/** Registra que a pessoa usou o sistema agora (renova o prazo de inatividade). */
export function touchActivity() {
  try {
    storage()?.setItem(ACTIVITY_PREFIX + scope, String(Date.now()))
  } catch {
    /* sem armazenamento: não há como medir a inatividade */
  }
}

/** true se passou mais de SESSION_IDLE_MINUTES desde a última atividade registrada. */
export function isIdleExpired() {
  try {
    const last = Number(storage()?.getItem(ACTIVITY_PREFIX + scope))
    return Number.isFinite(last) && last > 0 && Date.now() - last > IDLE_MS
  } catch {
    return false
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
