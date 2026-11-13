import { useEffect, useRef } from "react"

/**
 * Mantém dados atualizados SEM recarregar a página.
 *
 * Chama `check` a cada `interval` ms (só com a aba visível) e também quando a
 * pessoa volta para a aba (foco / visibilidade). O `check` costuma consultar
 * um endpoint leve de "versão" e só recarregar os dados completos se ela mudou
 * (ex.: GET /clinicas/{slug}/versao, GET /gestora/agenda/versao).
 *
 * Erros do `check` são ignorados: a próxima rodada tenta de novo.
 */
export function useLiveRefresh(check, { interval = 15000, enabled = true } = {}) {
  const checkRef = useRef(check)
  useEffect(() => {
    checkRef.current = check
  })

  useEffect(() => {
    if (!enabled) return undefined
    let running = false
    const run = async () => {
      if (running || document.visibilityState === "hidden") return
      running = true
      try {
        await checkRef.current?.()
      } catch {
        // sem conexão / backend reiniciando: tenta de novo na próxima rodada
      } finally {
        running = false
      }
    }
    const timer = window.setInterval(run, interval)
    const onVisible = () => {
      if (document.visibilityState === "visible") run()
    }
    window.addEventListener("focus", run)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", run)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [interval, enabled])
}

/**
 * Para telas que copiam os dados do servidor para um estado próprio
 * (useState(initialX)): quando chega uma versão nova do servidor, repassa
 * para o estado local.
 *
 *   useServerSync(initialDocs, docs, setDocs)
 *   useServerSync(initialRules, rules, setRules, { keepEdits: true })
 *
 * keepEdits: true = se a pessoa já alterou o estado local (formulário em
 * edição), NÃO sobrescreve o que ela digitou.
 */
export function useServerSync(serverValue, localValue, setLocal, { keepEdits = false } = {}) {
  const prevRef = useRef(serverValue)
  const localRef = useRef(localValue)
  useEffect(() => {
    localRef.current = localValue
  })
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = serverValue
    if (prev === serverValue) return
    if (keepEdits && JSON.stringify(localRef.current) !== JSON.stringify(prev)) return
    setLocal(serverValue)
  }, [serverValue, setLocal, keepEdits])
}

/**
 * Atalho para o padrão "versão leve → recarrega se mudou".
 * `getVersion` devolve { versao }; `onChange` roda quando a versão muda
 * (não roda na primeira leitura).
 */
export function useVersionRefresh(getVersion, onChange, options) {
  const lastRef = useRef(null)
  useLiveRefresh(async () => {
    const { versao } = (await getVersion()) ?? {}
    if (!versao) return
    if (lastRef.current !== null && lastRef.current !== versao) await onChange()
    lastRef.current = versao
  }, options)
}
