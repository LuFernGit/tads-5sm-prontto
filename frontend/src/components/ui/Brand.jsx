import "./Brand.css"

/**
 * Renderiza a assinatura visual do Prontto nas versões completa ou compacta.
 */
// compact = true mostra só o símbolo (dois losangos), sem o nome 'prontto'.
function Brand({ compact = false }) {
  return (
    <span className="brand" style={{ height: 70 }}>
      <svg
        className="brand-mark"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="13"
          y="13"
          width="38"
          height="38"
          rx="7"
          transform="rotate(45 32 32)"
          stroke="#E0A96D"
          strokeWidth="3.2"
        />
        <rect
          x="22.5"
          y="22.5"
          width="19"
          height="19"
          rx="4"
          transform="rotate(45 32 32)"
          stroke="#D97706"
          strokeWidth="3.2"
        />
      </svg>
      {!compact && (
        <span>
          <span className="brand-name">prontto</span>
          <span className="brand-tagline">agendou, confirmou, pronto</span>
        </span>
      )}
    </span>
  )
}

export default Brand
