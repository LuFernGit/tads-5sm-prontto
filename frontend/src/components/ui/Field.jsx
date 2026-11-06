/* ---------- Campo acessível: label ligado por for/id (WCAG 1.3.1) ---------- */
/**
 * Agrupa label, campo, ajuda e mensagem de erro com vínculos de acessibilidade.
 */
function Field({ id, label, error = "", hint = "", children }) {
  return (
    <div className="ff-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="ff-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}

/**
 * Monta os atributos ARIA de um campo conforme suas mensagens de ajuda e erro.
 */
// Uso: <input {...aria('email', erro, dica)} />. Faz o leitor de tela anunciar o erro e a dica.
const aria = (id, error, hint) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby":
    [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined,
})

export { aria }

export default Field
