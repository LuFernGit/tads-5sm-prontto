/* ---------- Aviso de nova guia (WCAG 2.4.4, 2.4.9 e 3.2.5 — nível AAA) ----------
 * Use dentro de qualquer link ou botão que abra outra guia ou o WhatsApp.
 * Sempre mostra o ícone ↗. O texto aparece:
 *   - visível (padrão):       "Ver no mapa ↗ (abre em nova guia)"
 *   - compact:                só o ↗ na tela, e o texto completo é lido pelo
 *                             leitor de tela (para botões onde não cabe texto).
 * text: muda o aviso, ex.: "abre o WhatsApp em nova guia".
 */
function NewTabHint({ compact = false, text = "abre em nova guia" }) {
  return (
    <span className="new-tab-hint">
      <span aria-hidden="true">↗</span>
      {compact ? (
        <span className="sr-only">({text})</span>
      ) : (
        <small>({text})</small>
      )}
    </span>
  )
}

export default NewTabHint
