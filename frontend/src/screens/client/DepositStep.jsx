import { useEffect, useMemo, useState } from "react"
import Icon from "@/components/ui/Icon"
import PayIcon from "@/components/ui/PayIcon"
import { PIX_TTL, SIGNAL_PERCENT } from "@/constants"
import { brl, formatDuration } from "@/lib/format"
import BookingFlowLayout, { BookingStatus, BookingSummary } from "./BookingFlowLayout"
import {
  buildPixPayload,
  cardBrandOf,
  formatCardNumber,
  formatClock,
  formatExpiry,
  makeEndToEndId,
} from "@/lib/pix"
import "./DepositStep.css"

/* ---------- QR Code visual (demonstração) ----------
   É um desenho no estilo QR gerado a partir do código; não é escaneável.
   Para um QR que o banco realmente leia: `npm i qrcode.react` e troque
   <PixQr value={payload} /> por <QRCodeSVG value={payload} size={196} />. */
/**
 * Gera a representação visual demonstrativa do QR Code a partir do payload Pix.
 */
function PixQr({ value }) {
  const size = 29
  const grid = useMemo(() => {
    let seed = 0
    for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    const cells = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => rand() > 0.5),
    )
    const finder = (r0, c0) => {
      for (let r = -1; r <= 7; r++)
        for (let c = -1; c <= 7; c++) {
          const rr = r0 + r,
            cc = c0 + c
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue
          const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6
          const ring = r === 0 || r === 6 || c === 0 || c === 6
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
          cells[rr][cc] = inside && (ring || core)
        }
    }
    finder(0, 0)
    finder(0, size - 7)
    finder(size - 7, 0)
    return cells
  }, [value])
  return (
    <svg
      className="ff-qr"
      viewBox="-2 -2 33 33"
      width="196"
      height="196"
      role="img"
      aria-label="QR Code Pix de demonstração"
    >
      <rect x="-2" y="-2" width="33" height="33" fill="#fff" />
      {grid.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width="1"
              height="1"
              fill="#0f172a"
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

/**
 * Apresenta a revisão e a simulação de pagamento do sinal por Pix ou cartão.
 */
// FASES DO PAGAMENTO (state 'phase'):
//   review   → revisão do valor e aceite das condições de cancelamento
//   pix      → código Pix gerado, com contagem regressiva (ou formulário do cartão)
//   checking → 'verificando pagamento…'
//   expired  → o Pix venceu sem pagamento
//   paid     → pagamento confirmado
// Tudo é SIMULADO: nenhum pagamento real é feito.
function DepositStep({
  serviceName,
  price,
  dateLabel,
  time,
  recurring,
  merchantName,
  company,
  duration,
  onBack,
  onConfirm,
  notify,
}) {
  // accepted = marcou que leu as condições; secondsLeft = tempo restante do Pix;
  // method = 'pix' ou 'card'; card = dados digitados do cartão.
  const [accepted, setAccepted] = useState(false)
  const [phase, setPhase] = useState("review")
  const [secondsLeft, setSecondsLeft] = useState(PIX_TTL)
  const [txid, setTxid] = useState("")
  const [payment, setPayment] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [method, setMethod] = useState("pix")
  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    installments: "1",
  })
  const [cardErrors, setCardErrors] = useState({})
  // Preço em reais (número, SERVICO.preco). O pagamento do sinal abaixo é
  // simulado e continua mockado mesmo depois da integração (decisão do projeto).
  const total = Number(price) || 0
  // Sinal = 30% do valor (SIGNAL_PERCENT). Cliente recorrente não paga sinal (null).
  // balance = quanto falta pagar na clínica.
  const signal = recurring ? null : Math.round(total * SIGNAL_PERCENT) / 100
  const balance = signal === null ? total : total - signal
  const payload = useMemo(
    () =>
      signal !== null && txid
        ? buildPixPayload({
            key: "demo@prontto.app",
            name: merchantName,
            city: "Sao Paulo",
            amount: signal,
            txid,
          })
        : "",
    [signal, txid, merchantName],
  )
  /** Atualiza um campo do cartão. */
  const setCardField = (field, value) =>
    setCard((c) => ({ ...c, [field]: value }))
  /** Valida os dados do cartão (16 números, nome, validade, CVV) e simula a aprovação. */
  const payWithCard = () => {
    const e = {}
    const digits = card.number.replace(/\D/g, "")
    if (digits.length !== 16) e.number = "Digite os 16 números do cartão."
    if (card.name.trim().split(/\s+/).length < 2)
      e.name = "Digite o nome como está impresso no cartão."
    const m = /^(\d{2})\/(\d{2})$/.exec(card.expiry)
    if (!m || +m[1] < 1 || +m[1] > 12) e.expiry = "Use o formato MM/AA."
    else {
      const now = new Date()
      const year = 2000 + +m[2]
      if (
        year < now.getFullYear() ||
        (year === now.getFullYear() && +m[1] < now.getMonth() + 1)
      )
        e.expiry = "Cartão vencido. Confira a validade."
    }
    if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = "O CVV tem 3 ou 4 números."
    setCardErrors(e)
    if (Object.keys(e).length) {
      notify("Corrija os campos indicados para continuar.")
      return
    }
    setPhase("checking")
    window.setTimeout(() => {
      setPayment({
        id: `CARD${Date.now().toString().slice(-10)}`,
        paidAt: new Date().toISOString(),
        valor: signal ?? 0,
        method: "card",
        cardBrand: cardBrandOf(card.number),
        cardLast4: digits.slice(-4),
        installments: Number(card.installments),
      })
      setPhase("paid")
    }, 4000)
  }
  useEffect(() => {
    // Contagem regressiva do Pix: diminui 1 segundo por segundo enquanto o Pix está na tela.
    if (phase !== "pix" || method !== "pix") return
    const id = window.setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    )
    return () => window.clearInterval(id)
  }, [phase, method])
  useEffect(() => {
    if (phase === "pix" && method === "pix" && secondsLeft === 0)
      setPhase("expired")
  }, [phase, method, secondsLeft])
  /** Gera o código Pix (só depois do aceite) e inicia a contagem regressiva. */
  const generatePix = () => {
    if (!accepted) {
      notify("Marque que leu as condições de cancelamento para continuar.")
      return
    }
    if (signal === null) {
      onConfirm(null)
      return
    }
    setTxid(
      `PRONTTO${Date.now().toString().slice(-9)}${Math.floor(100 + Math.random() * 900)}`,
    )
    setSecondsLeft(PIX_TTL)
    setPhase("pix")
  }
  /** Copia o código 'Pix copia e cola' para a área de transferência. */
  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      notify("Código Pix copiado.")
    } catch {
      notify("Não foi possível copiar. Selecione o código e copie manualmente.")
    }
  }
  /** Simula a verificação do pagamento ('Já paguei'). */
  const checkPayment = () => {
    setPhase("checking")
    window.setTimeout(() => {
      setPayment({
        id: makeEndToEndId(),
        paidAt: new Date().toISOString(),
        valor: signal ?? 0,
      })
      setPhase("paid")
    }, 3000)
  }
  // Resumo do serviço, repetido nas fases (duas colunas, como no layout de referência).
  const summary = (
    <BookingSummary
      items={[
        ["Procedimento", serviceName],
        ["Data e horário", `${dateLabel} · ${time}`],
        ["Duração", formatDuration(duration)],
        ["Valor total", brl(total)],
      ]}
    />
  )
  // Botão escuro "Voltar para a vitrine", igual em todas as fases.
  const backButton = (
    <button type="button" className="ff-btn ff-dark" onClick={onBack}>
      Voltar para a vitrine
    </button>
  )
  // Ícone do topo (calendário com check / cartão)
  const calendarIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4" />
    </svg>
  )

  // ===== FASE 1: revisão — "Confirme seu agendamento" =====
  if (phase === "review")
    return (
      <BookingFlowLayout
        icon={calendarIcon}
        title="Confirme seu agendamento"
        titleId="ff-dep-title"
        subtitle="Verifique e leia as informações com atenção!"
        company={company}
        cardLabel="Resumo do agendamento"
        actions={
          <>
            {backButton}
            <button type="button" className="ff-btn ff-primary" onClick={generatePix}>
              Confirmar agendamento
            </button>
          </>
        }
      >
        {summary}
        {recurring ? (
          <BookingStatus
            title="Pagamento de sinal – isento"
            text="Realizar pagamento do valor total ao final do procedimento."
          />
        ) : (
          <div className="bf-box">
            <h2>Política de sinal</h2>
            <p>
              Para clientes novas, a clínica cobra um sinal de {SIGNAL_PERCENT}%
              do valor do serviço para garantir o horário. O restante é pago no
              atendimento.
            </p>
            <dl className="bf-rows">
              <div>
                <dt>Sinal agora (Pix ou cartão)</dt>
                <dd>{brl(signal ?? 0)}</dd>
              </div>
              <div>
                <dt>Saldo no atendimento</dt>
                <dd>{brl(balance)}</dd>
              </div>
            </dl>
          </div>
        )}
        <div className="bf-box">
          <h2>Condições de cancelamento</h2>
          <p>
            Cancelamentos e reagendamentos devem ser pedidos com no mínimo 24
            horas de antecedência. Quando aplicável, vale o direito de
            arrependimento do Código de Defesa do Consumidor (art. 49).
          </p>
        </div>
        <label className="bf-check" htmlFor="ff-cancel">
          <input
            id="ff-cancel"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          Li as condições de cancelamento.
        </label>
      </BookingFlowLayout>
    )

  // ===== FASE 2: pagamento (Pix ou cartão) — "Garanta seu horário!" =====
  if (phase === "pix" || phase === "checking") {
    const methods = [
      { key: "card", label: "Cartão de crédito", icon: "card" },
      { key: "pix", label: "Pix", icon: "pix" },
    ]
    const busy = phase === "checking"
    const pickMethod = (key) => {
      if (busy) return
      setMethod(key)
    }
    const cardField = (id, label, error, children) => (
      <div className="pay-field">
        <label htmlFor={id}>{label}</label>
        {children}
        {error && (
          <small className="ff-error" role="alert">
            {error}
          </small>
        )}
      </div>
    )
    return (
      <BookingFlowLayout
        icon={<PayIcon kind="card" size={22} />}
        kicker="PAGAMENTO DE SINAL"
        title="Garanta seu horário!"
        titleId="pay-title"
        subtitle="Pague o sinal agora e o restante é pago no atendimento."
        company={company}
        cardLabel="Resumo do agendamento"
        actions={
          <>
            {backButton}
            {method === "pix" ? (
              <button type="button" className="ff-btn ff-primary" onClick={checkPayment} disabled={busy}>
                {busy ? "Verificando pagamento..." : "Já fiz o pagamento"}
              </button>
            ) : (
              <button type="button" className="ff-btn ff-primary" onClick={payWithCard} disabled={busy}>
                {busy ? "Processando pagamento..." : `Pagar ${brl(signal ?? 0)}`}
              </button>
            )}
          </>
        }
      >
        <span className="bf-section-label">Formas de pagamento</span>
        {/* Abas: cartão de crédito | Pix */}
        <div className="pay-tabs" role="tablist" aria-label="Formas de pagamento">
          {methods.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={m.key === method}
              className={`pay-tab ${m.key === method ? "active" : ""}`}
              onClick={() => pickMethod(m.key)}
            >
              <PayIcon kind={m.icon} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <div className="pay-body" role="tabpanel">
          {method === "pix" ? (
            <>
              <div className="pay-method-title">
                <PayIcon kind="pix" size={26} />
                <strong>Pagar com Pix</strong>
              </div>
              <p className="pay-copy">
                Pague com <b>Pix</b> em qualquer dia e a qualquer hora! O
                pagamento é instantâneo, prático e pode ser feito em poucos
                segundos.
              </p>
              <div className="pay-qr-row">
                <div className="pay-qr">{payload && <PixQr value={payload} />}</div>
                <ol className="pay-steps">
                  <li>
                    <span className="pay-step-icon"><PayIcon kind="phone" size={18} /></span>
                    <p>1. Abra o app do seu banco e entre no ambiente <b>Pix</b>.</p>
                  </li>
                  <li>
                    <span className="pay-step-icon"><PayIcon kind="qr" size={18} /></span>
                    <p>2. Escolha <b>pagar com QR code</b> e escaneie o código ao lado.</p>
                  </li>
                  <li>
                    <span className="pay-step-icon"><Icon name="check" size={18} /></span>
                    <p>3. Confirme as informações e finalize.</p>
                  </li>
                </ol>
              </div>
              <div className="pay-copy-box">
                <label htmlFor="ff-pix-code">
                  Ou copie o código e cole no app do banco (válido por{" "}
                  <b>{formatClock(secondsLeft)}</b>)
                </label>
                <div>
                  <input
                    id="ff-pix-code"
                    readOnly
                    value={payload}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" onClick={copyPix}>
                    Copiar código
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="pay-method-title">
                <PayIcon kind="card" size={26} />
                <strong>Pagar com cartão de crédito</strong>
              </div>
              <p className="pay-copy">
                Preencha os dados do cartão para pagar o sinal. O restante é
                pago no atendimento.
              </p>
              <div className="pay-card-form">
                {cardField(
                  "pay-number",
                  "Número do cartão",
                  cardErrors.number,
                  <input
                    id="pay-number"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0000 0000 0000 0000"
                    value={card.number}
                    onChange={(e) => setCardField("number", formatCardNumber(e.target.value))}
                    aria-invalid={cardErrors.number ? true : undefined}
                  />,
                )}
                {cardField(
                  "pay-name",
                  "Nome impresso no cartão",
                  cardErrors.name,
                  <input
                    id="pay-name"
                    autoComplete="off"
                    placeholder="Como está no cartão"
                    value={card.name}
                    onChange={(e) => setCardField("name", e.target.value.toUpperCase())}
                    aria-invalid={cardErrors.name ? true : undefined}
                  />,
                )}
                <div className="pay-card-row">
                  {cardField(
                    "pay-expiry",
                    "Validade",
                    cardErrors.expiry,
                    <input
                      id="pay-expiry"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="MM/AA"
                      value={card.expiry}
                      onChange={(e) => setCardField("expiry", formatExpiry(e.target.value))}
                      aria-invalid={cardErrors.expiry ? true : undefined}
                    />,
                  )}
                  {cardField(
                    "pay-cvv",
                    "Código de segurança (CVV)",
                    cardErrors.cvv,
                    <input
                      id="pay-cvv"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      placeholder="123"
                      value={card.cvv}
                      onChange={(e) => setCardField("cvv", e.target.value.replace(/\D/g, ""))}
                      aria-invalid={cardErrors.cvv ? true : undefined}
                    />,
                  )}
                </div>
                {cardField(
                  "pay-inst",
                  "Parcelas",
                  undefined,
                  <select
                    id="pay-inst"
                    value={card.installments}
                    onChange={(e) => setCardField("installments", e.target.value)}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}x de {brl((signal ?? 0) / n)} sem juros
                      </option>
                    ))}
                  </select>,
                )}
              </div>
            </>
          )}

          <div className="pay-total">
            <span>Total:</span>
            <strong>{brl(signal ?? 0)}</strong>
          </div>
          <p className="pay-balance">
            Sinal do agendamento · {serviceName} · {dateLabel} às {time}. Saldo
            no atendimento: {brl(balance)}.
          </p>
          <p className="pay-demo">
            Ambiente de demonstração: nenhum pagamento real é feito. Não use
            dados reais de cartão.
          </p>
          <div className="pay-status" role="status" aria-live="polite">
            <span className={busy ? "checking" : ""} />
            {busy
              ? "Verificando o pagamento..."
              : method === "pix"
                ? "Aguardando o pagamento"
                : "Aguardando os dados do cartão"}
          </div>
        </div>
      </BookingFlowLayout>
    )
  }

  // ===== FASE 3a: Pix expirado =====
  if (phase === "expired")
    return (
      <BookingFlowLayout
        icon={<Icon name="clock" size={22} />}
        kicker="PAGAMENTO DE SINAL"
        title="O código Pix expirou"
        titleId="ff-exp-title"
        subtitle="Seu horário continua selecionado."
        company={company}
        cardLabel="Resumo do agendamento"
        actions={
          <>
            {backButton}
            <button
              type="button"
              className="ff-btn ff-primary"
              onClick={() => {
                setTxid(`PRONTTO${Date.now().toString().slice(-9)}${Math.floor(100 + Math.random() * 900)}`)
                setSecondsLeft(PIX_TTL)
                setPhase("pix")
              }}
            >
              Gerar novo código
            </button>
          </>
        }
      >
        {summary}
        <div className="bf-box" role="alert">
          <p>
            Por segurança, o código vale por 15 minutos. Gere um novo código
            para pagar o sinal.
          </p>
        </div>
      </BookingFlowLayout>
    )

  // ===== FASE 3b: pagamento confirmado =====
  const paidDate = payment
    ? new Date(payment.paidAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : ""
  return (
    <BookingFlowLayout
      icon={<Icon name="check" size={22} />}
      kicker="PAGAMENTO CONFIRMADO"
      title="Sinal recebido!"
      titleId="ff-paid-title"
      subtitle="Recebemos o sinal do seu agendamento."
      company={company}
      cardLabel="Comprovante do sinal"
      actions={
        <>
          <span />
          <button
            type="button"
            className="ff-btn ff-primary"
            onClick={() => onConfirm(signal, payment ?? undefined)}
          >
            Ver confirmação do agendamento
          </button>
        </>
      }
    >
      <BookingSummary
        items={[
          ["Valor pago", brl(payment?.valor ?? 0)],
          ["Data e hora", paidDate],
          ["Recebedor", merchantName],
          ["Saldo no atendimento", brl(balance)],
          ["ID da transação", <span className="mono" key="id">{payment?.id}</span>, true],
        ]}
      />
    </BookingFlowLayout>
  )
}

export default DepositStep
