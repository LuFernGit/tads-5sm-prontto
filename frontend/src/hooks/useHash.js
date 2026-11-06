import { useEffect, useState } from "react"

/**
 * Mantém o hash atual da URL sincronizado para abrir termos, privacidade e contato.
 */
export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.replace("#", ""))
  useEffect(() => {
    // O evento 'hashchange' dispara sempre que o # da URL muda.
    const onHash = () => setHash(window.location.hash.replace("#", ""))
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])
  return hash
}
