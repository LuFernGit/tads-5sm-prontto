import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Carrega dados do backend e controla os estados de carregamento e erro.
 *
 *   const { data, loading, error, reload, setData } = useApiQuery(
 *     () => api.catalog.listServices(),
 *     [],
 *   )
 *
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {unknown[]} deps  Recarrega quando algum valor mudar.
 * @param {{ enabled?: boolean, initialData?: T }} [options]
 */
export function useApiQuery(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options
  const [data, setData] = useState(initialData)
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
