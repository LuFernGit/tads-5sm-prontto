import "./Action.css"

/**
 * Botão reutilizável que aplica as variantes visuais de ação do sistema.
 */
// Props: children = conteúdo do botão; variant = estilo ('primary', 'secondary', 'ghost'...),
// que vira a classe CSS 'action-<variant>' (ex.: .action-primary em Action.css).
function Action({ children, variant = "primary", className = "", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Classe 'disabled' = botão inativo: avisa o leitor de tela (aria-disabled).
      aria-disabled={/\bdisabled\b/.test(className) || undefined}
      className={`action action-${variant} ${className}`}
    >
      {children}
    </button>
  )
}

export default Action
