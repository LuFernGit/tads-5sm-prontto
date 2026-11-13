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
 * Textos que mudam quando o agendamento nasceu PENDENTE (a cliente ainda
 * precisa confirmar a presença em "Meu perfil") ou já CONFIRMADO.
 */
function confirmationTexts({ needsConfirmation, confirmByLabel, recurring, companyName }) {
  if (!needsConfirmation)
    return {
      kicker: "AGENDAMENTO CONFIRMADO",
      subtitle: "Seu horário está reservado. Agora é só se preparar para o seu momento.",
      reminder: "",
      greeting: `Meu agendamento na ${companyName} está confirmado.`,
    }
  const until = confirmByLabel ? `até ${confirmByLabel}` : "até 24 horas antes do horário"
  const lostSignal = recurring ? "" : " e o sinal fica retido"
  return {
    kicker: "AGENDAMENTO REALIZADO",
    subtitle: `Seu horário está reservado. Para garantir o atendimento, confirme sua presença em “Meu perfil” ${until}.`,
    reminder: ` Confirme sua presença em “Meu perfil” ${until}; sem a confirmação, o agendamento é cancelado automaticamente${lostSignal}.`,
    greeting: `Fiz um agendamento na ${companyName}.`,
  }
}

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
  clientWhatsapp,
  onBack,
  // Agendamento nasceu PENDENTE: a cliente ainda precisa confirmar a presença
  // em "Meu perfil" até confirmByLabel ("19/11 às 14:00").
  needsConfirmation = false,
  confirmByLabel = "",
}) {
  const texts = confirmationTexts({
    needsConfirmation,
    confirmByLabel,
    recurring,
    companyName: company.name,
  })
  // Lembrete de confirmação mostrado na situação do sinal (isento ou pago).
  const confirmReminder = texts.reminder
  const firstName = String(clientName ?? "").split(" ")[0]
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
    `Olá! Sou ${clientName}${clientWhatsapp ? ` (WhatsApp ${clientWhatsapp})` : ""}. ${texts.greeting}`,
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
      kicker={texts.kicker}
      title={`Tudo certo, ${firstName}!`}
      titleId="ff-ok-title"
      subtitle={texts.subtitle}
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
          text={`Realizar pagamento do valor total ao final do procedimento.${confirmReminder}`}
        />
      ) : payment ? (
        <BookingStatus
          title="Pagamento de sinal – aprovado"
          text={`Realizar pagamento do saldo restante ao final do procedimento.${confirmReminder}`}
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
