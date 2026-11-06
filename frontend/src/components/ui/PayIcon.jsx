/* Ícones simples da tela de pagamento do sinal (DepositStep.jsx).
   Funciona igual ao Icon.jsx: kind = nome do ícone (card, pix, qr...). */
/**
 * Renderiza os ícones usados nas opções de pagamento do fluxo de sinal.
 */
function PayIcon({ kind, size = 26 }) {
  const paths = {
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    barcode: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 8v8M10 8v8M13 8v8M17 8v8" />
      </>
    ),
    store: (
      <>
        <path d="M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6" />
      </>
    ),
    pix: (
      <g transform="rotate(45 12 12)">
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </g>
    ),
    phone: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2" />
      </>
    ),
    qr: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <path d="M14 14h3v3M20 14v6h-6" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  )
}

export default PayIcon
