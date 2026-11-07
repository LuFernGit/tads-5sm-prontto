import "./BookingFlowLayout.css"

/* ---------- Molde das telas do agendamento ----------
 * Usado em: "Confirme seu agendamento", "Garanta seu horário!" (pagamento),
 * "Pix recebido" e "Tudo certo!" (confirmação).
 *
 *   ┌───────── ícone redondo ─────────┐
 *   │  KICKER (opcional)              │
 *   │  Título                         │
 *   │  subtítulo                      │
 *   ├─ cartão ────────────────────────┤
 *   │  [logo] Clínica / RÓTULO        │
 *   │  conteúdo (children)            │
 *   └─────────────────────────────────┘
 *   [botão esquerdo]   [botão direito]   ← actions, fora do cartão
 */
function BookingFlowLayout({
  icon,
  kicker,
  title,
  titleId,
  subtitle,
  company,
  cardLabel,
  actions,
  children,
}) {
  return (
    <section className="bf-page" aria-labelledby={titleId}>
      <header className="bf-head">
        <span className="bf-icon" aria-hidden="true">
          {icon}
        </span>
        {kicker && <span className="bf-kicker">{kicker}</span>}
        <h1 id={titleId}>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>

      <div className="bf-card">
        {/* Cabeçalho do cartão: logo e nome da clínica */}
        <div className="bf-clinic">
          <div className="bf-logo">
            {company?.logoImage ? (
              <img src={company.logoImage} alt="" />
            ) : (
              company?.initials
            )}
          </div>
          <div>
            <strong>{company?.name}</strong>
            <span>{cardLabel}</span>
          </div>
        </div>
        <div className="bf-body">{children}</div>
      </div>

      {actions && <div className="bf-actions">{actions}</div>}
    </section>
  )
}

/** Resumo em duas colunas: [["Procedimento", "Fibra de Vidro"], ...] */
export function BookingSummary({ items }) {
  return (
    <dl className="bf-summary">
      {items.filter(Boolean).map(([label, value, wide]) => (
        <div key={label} className={wide ? "wide" : undefined}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Faixa verde de status, ex.: "PAGAMENTO DE SINAL – ISENTO". */
export function BookingStatus({ title, text, children }) {
  return (
    <div className="bf-status" role="status">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
      <div>
        <strong>{title}</strong>
        {text && <span>{text}</span>}
        {children}
      </div>
    </div>
  )
}

export default BookingFlowLayout
