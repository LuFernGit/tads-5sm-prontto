import { brl, formatDuration } from "@/lib/format"
import "./BookingConfirmation.css"

/* ============================================================
   Confirmação — RF11, RF12, RF13, RF22, RF23 (CDC art. 30/35)
   Agora mostra o pagamento do sinal e leva os dados ao WhatsApp.
   ============================================================ */
/**
 * Exibe o comprovante final do agendamento e os dados do pagamento do sinal.
 */
function BookingConfirmation({
  service,
  time,
  date,
  company,
  recurring,
  signal,
  payment,
  clientName,
  onBack,
}) {
  // Preço em reais (número), vindo de SERVICO.preco
  const total = Number(service.price) || 0
  // Texto da forma de pagamento: 'Pix', 'cartão' ou 'cartão em 3x'.
  const payLabel =
    payment?.method === "card"
      ? `cartão${
          payment.installments && payment.installments > 1
            ? ` em ${payment.installments}x`
            : ""
        }`
      : "Pix"
  const signalText = recurring
    ? "Isento (cliente recorrente)"
    : payment
      ? `${brl(payment.valor)} · pago via ${payLabel}`
      : signal === null
        ? "A definir"
        : `${brl(signal)} (pendente)`
  const text = [
    `Olá! Meu agendamento na ${company.name} está confirmado.`,
    `Procedimento: ${service.name}`,
    `Data e horário: ${date} às ${time}`,
    `Valor: ${brl(total)}`,
    `Sinal: ${signalText}`,
    payment
      ? `${
          payment.method === "card" ? "Comprovante" : "ID do Pix"
        }: ${payment.id}`
      : "",
    `Local: ${company.address}`,
  ]
    .filter(Boolean)
    .join("\n")
  const href = `https://wa.me/55${company.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
  return (
    <section
      className="ff-card ff-deposit confirmation"
      aria-labelledby="ff-ok-title"
    >
      <div className="ff-free" role="status">
        <strong>Agendamento confirmado</strong>
        <span>Seu horário está reservado.</span>
      </div>
      <h1 id="ff-ok-title">Tudo certo, {clientName}!</h1>
      <dl className="ff-summary">
        <div>
          <dt>Procedimento</dt>
          <dd>{service.name}</dd>
        </div>
        <div>
          <dt>Data e horário</dt>
          <dd>
            {date} · {time}
          </dd>
        </div>
        <div>
          <dt>Duração</dt>
          <dd>{formatDuration(service.duration)}</dd>
        </div>
        <div>
          <dt>Valor</dt>
          <dd>{brl(total)}</dd>
        </div>
        <div>
          <dt>Sinal</dt>
          <dd>{signalText}</dd>
        </div>
        {payment && (
          <div>
            <dt>{payment.method === "card" ? "Comprovante" : "ID do Pix"}</dt>
            <dd className="ff-mono">{payment.id}</dd>
          </div>
        )}{" "}
        <div>
          <dt>Local</dt>
          <dd>{company.address}</dd>
        </div>
      </dl>
      <p className="ff-small">
        Cancelamentos e reagendamentos: com no mínimo 24 horas de antecedência.
      </p>
      <div className="ff-actions">
        <button type="button" className="ff-btn ff-secondary" onClick={onBack}>
          Voltar para a vitrine
        </button>
        <a
          className="ff-btn ff-primary ff-link-btn"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Enviar comprovante por WhatsApp <small>(abre em nova guia)</small>
        </a>
      </div>
    </section>
  )
}

export default BookingConfirmation
