import { useState } from "react"

/**
 * Erros de formulário mostrados EMBAIXO de cada campo (WCAG 3.3.1 e 3.3.3).
 *
 * O campo com erro fica com a borda vermelha (CSS global em styles/overrides.css,
 * pelo aria-invalid) e aparece uma mensagem dizendo o que fazer para corrigir.
 *
 *   const { a11y, errorFor, showErrors, clearOnInput } = useFieldErrors(notify)
 *
 *   <div onInput={clearOnInput}>
 *     <label htmlFor="email">
 *       <span>E-MAIL</span>
 *       <input {...a11y("email", "email-hint")} />
 *       {errorFor("email")}
 *       <small id="email-hint">Dica opcional</small>
 *     </label>
 *   </div>
 *
 *   if (showErrors({ email: "O e-mail precisa ter @." })) return  // tem erro
 *
 * @param {(msg: string) => void} [notify] aviso (Toast) com o resumo dos erros
 */
export function useFieldErrors(notify) {
  // { "id-do-campo": "mensagem de como corrigir" }
  const [errors, setErrors] = useState({})

  /** Remove o erro de um campo (os outros continuam). */
  const clearError = (id) =>
    setErrors((current) => {
      if (!id || !current[id]) return current
      const rest = { ...current }
      delete rest[id]
      return rest
    })

  /** Use no contêiner do formulário: ao digitar num campo, o erro dele some. */
  const clearOnInput = (event) => clearError(event.target.id)

  /**
   * Mostra os erros encontrados, coloca o foco no primeiro campo errado e
   * avisa o resumo. Devolve true se havia erro (para a tela parar ali).
   * Ids com mensagem vazia ou false são ignorados.
   */
  const showErrors = (found, { summary = true } = {}) => {
    const clean = Object.fromEntries(
      Object.entries(found).filter(([, message]) => message),
    )
    setErrors(clean)
    const ids = Object.keys(clean)
    if (ids.length === 0) return false
    document.getElementById(ids[0])?.focus()
    if (summary && notify)
      notify(
        ids.length === 1
          ? clean[ids[0]]
          : `Corrija os ${ids.length} campos destacados em vermelho.`,
      )
    return true
  }

  /** Atributos do campo: id, aria-invalid e aria-describedby (dica + erro). */
  const a11y = (id, hintId) => ({
    id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby":
      [hintId, errors[id] ? `${id}-error` : ""].filter(Boolean).join(" ") ||
      undefined,
  })

  /** Mensagem de orientação abaixo do campo (só aparece se houver erro). */
  const errorFor = (id) =>
    errors[id] ? (
      <small id={`${id}-error`} className="field-error">
        {errors[id]}
      </small>
    ) : null

  return { errors, setErrors, clearError, clearOnInput, showErrors, a11y, errorFor }
}

export default useFieldErrors
