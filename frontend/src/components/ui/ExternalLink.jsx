import "./ExternalLink.css"

/* ---------- Link externo com aviso de nova guia (WCAG 2.4.4 / 3.2.5) ----------
 * Na tela aparece só o ↗ (com dica ao passar o mouse); o "(abre em nova guia)"
 * fica para o leitor de tela (Atividade #11, item 5.7.6). */
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
      // Dica ao passar o mouse; o leitor de tela lê o texto escondido abaixo.
      title="Abre em nova guia"
    >
      {children} <span aria-hidden="true">↗</span>
      <span className="sr-only"> (abre em nova guia)</span>
    </a>
  )
}

export default ExternalLink
