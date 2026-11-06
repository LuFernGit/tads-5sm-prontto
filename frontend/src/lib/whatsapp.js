/**
 * Normaliza o telefone e abre o WhatsApp com a mensagem previamente preenchida.
 */
function openWhatsApp(message, phone = "5511999887766") {
  const rawNumber = phone.replace(/\D/g, "")
  if (!rawNumber) return
  // Garante o código do país (55) no início do número.
  const number = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`
  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  )
}

export { openWhatsApp }
