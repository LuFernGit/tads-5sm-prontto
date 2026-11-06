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
      className={`action action-${variant} ${className}`}
    >
      {children}
    </button>
  )
}

export default Action
