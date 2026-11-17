import { useEffect, useId, useRef, useState } from "react"
import "./ClampedText.css"

/**
 * Texto cortado em `lines` linhas com "Ver mais" / "Ver menos".
 * O botão só aparece quando o texto realmente passa do limite (medido no
 * navegador, e de novo quando a largura muda: celular, meia tela...).
 *
 * ACESSIBILIDADE: botão de verdade, com aria-expanded e aria-controls.
 */
function ClampedText({ children, lines = 2, className = "" }) {
  const id = useId()
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return undefined
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // A fonte da página pode terminar de carregar depois: mede de novo.
    let active = true
    document.fonts?.ready.then(() => active && measure())
    return () => {
      active = false
      observer.disconnect()
    }
  }, [children, expanded, lines])

  return (
    <div className={`clamped-text ${className}`}>
      <p
        id={id}
        ref={ref}
        className={expanded ? "" : "is-clamped"}
        style={{ "--clamp-lines": lines }}
      >
        {children}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          className="clamped-text-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  )
}

export default ClampedText
