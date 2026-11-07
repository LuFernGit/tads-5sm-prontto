import Icon from "@/components/ui/Icon"
import NewTabHint from "@/components/ui/NewTabHint"
import { brl, formatDuration } from "@/lib/format"
import BookingFlowLayout, { BookingStatus, BookingSummary } from "./BookingFlowLayout"
import "./BookingConfirmation.css"

/* ============================================================
   Confirmação — RF11, RF12, RF13, RF22, RF23 (CDC art. 30/35)
   Mostra o resumo, a situação do sinal e leva os dados ao WhatsApp.
   ============================================================ */
/**
 * Tela final do agendamento: "Tudo certo, <nome>!".
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
      ? `cartão${payment.installments > 1 ? ` em ${payment.installments}x` : ""}`
      : "Pix"
  const balance = payment ? total - payment.valor : total
  const signalText = recurring
    ? "Isento (cliente recorrente)"
    : payment
      ? `${brl(payment.valor)} · pago via ${payLabel}`
      : signal === null
        ? "A definir"
        : `${brl(signal)} (pendente)`
  // Mensagem do comprovante enviada pelo WhatsApp
  const text = [
    `Olá! Meu agendamento na ${company.name} está confirmado.`,
    `Procedimento: ${service.name}`,
    `Data e horário: ${date} às ${time}`,
    `Valor: ${brl(total)}`,
    `Sinal: ${signalText}`,
    payment ? `${payment.method === "card" ? "Comprovante" : "ID do Pix"}: ${payment.id}` : "",
    `Local: ${company.address}`,
  ]
    .filter(Boolean)
    .join("\n")
  const href = `https://wa.me/55${company.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`

  return (
    <BookingFlowLayout
      icon={<Icon name="check" size={22} />}
      kicker="AGENDAMENTO CONFIRMADO"
      title={`Tudo certo, ${clientName}!`}
      titleId="ff-ok-title"
      subtitle="Seu horário está reservado. Agora é só se preparar para o seu momento."
      company={company}
      cardLabel="Confirmação de agendamento"
      actions={
        <>
          <button type="button" className="ff-btn ff-dark" onClick={onBack}>
            Voltar para a vitrine
          </button>
          <a className="ff-btn ff-primary" href={href} target="_blank" rel="noopener noreferrer">
            Enviar comprovante via WhatsApp{" "}
            <NewTabHint compact text="abre o WhatsApp em nova guia" />
          </a>
        </>
      }
    >
      <BookingSummary
        items={[
          ["Procedimento", service.name],
          ["Data e horário", `${date} · ${time}`],
          ["Duração", formatDuration(service.duration)],
          ["Valor total", brl(total)],
          // Com sinal pago: mostra o que já foi pago e o que falta pagar
          payment && ["Sinal pago", brl(payment.valor)],
          payment && ["Saldo restante a pagar", brl(balance)],
        ]}
      />
      {/* Situação do sinal: isento, pago ou pendente */}
      {recurring ? (
        <BookingStatus
          title="Pagamento de sinal – isento"
          text="Realizar pagamento do valor total ao final do procedimento."
        />
      ) : payment ? (
        <BookingStatus
          title="Pagamento de sinal – aprovado"
          text="Realizar pagamento do saldo restante ao final do procedimento."
        />
      ) : (
        <div className="bf-box">
          <h2>Sinal</h2>
          <p>{signalText}</p>
        </div>
      )}
    </BookingFlowLayout>
  )
}

export default BookingConfirmation
