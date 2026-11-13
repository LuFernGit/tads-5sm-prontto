import { useCallback, useEffect, useRef, useState } from "react"
import { useLiveRefresh } from "./useLiveRefresh"

/**
 * Carrega dados do backend e controla os estados de carregamento e erro.
 *
 *   const { data, loading, error, reload, setData } = useApiQuery(
 *     () => api.catalog.listServices(),
 *     [],
 *   )
 *
 * AO VIVO: enquanto a aba está visível, refaz a busca em segundo plano a cada
 * `liveInterval` ms e quando a pessoa volta para a aba. Não mostra
 * "Carregando…" e só troca os dados se algo mudou de verdade, então a tela não
 * pisca. Use `live: false` para desligar (ex.: quando a tela já tem a própria
 * atualização).
 *
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {unknown[]} deps  Recarrega quando algum valor mudar.
 * @param {{ enabled?: boolean, initialData?: T, live?: boolean, liveInterval?: number }} [options]
 */
export function useApiQuery(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null, live = true, liveInterval = 20000 } = options
  const [data, setData] = useState(initialData)
  // Valor mais recente dos dados, para comparar com a resposta nova.
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  // Guarda sempre a versão mais nova da função de busca, sem disparar novas buscas.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  // Numera as buscas: se chegar a resposta de uma busca antiga, ela é ignorada.
  const requestId = useRef(0)

  /** Faz (ou refaz) a busca. Também pode ser chamada pela tela, ex.: depois de salvar. */
  const reload = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if (id === requestId.current) setData(result)
      return result
    } catch (err) {
      if (id === requestId.current) setError(err)
      return undefined
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  /** Busca silenciosa (ao vivo): sem "Carregando…", sem erro na tela. */
  const refreshSilently = useCallback(async () => {
    // Não numera uma busca nova: se a tela pedir um reload no meio, ele vence.
    const id = requestId.current
    const result = await fetcherRef.current()
    if (id !== requestId.current) return
    if (JSON.stringify(result) !== JSON.stringify(dataRef.current)) setData(result)
  }, [])

  useLiveRefresh(refreshSilently, { enabled: enabled && live, interval: liveInterval })

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  return { data, loading, error, reload, setData }
}
