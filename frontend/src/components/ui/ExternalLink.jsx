import "./ExternalLink.css"

/* ---------- Link externo com aviso de nova guia (WCAG 2.4.4 / 3.2.5) ---------- */
/**
 * Renderiza links externos com indicação acessível de abertura em nova guia.
 */
function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      // noopener/noreferrer: segurança ao abrir outra aba (a página nova não controla esta).
      rel="noopener noreferrer"
      className="ff-external"
    >
      {children} <span aria-hidden="true">↗</span>{" "}
      <small>(abre em nova guia)</small>
    </a>
  )
}

export default ExternalLink
