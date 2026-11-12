/**
 * Normaliza o telefone e abre o WhatsApp com a mensagem previamente preenchida.
 * O número é obrigatório: sem ele, nada é aberto (antes havia um número de
 * demonstração como padrão, que mandaria a mensagem para a pessoa errada).
 */
function openWhatsApp(message, phone = "") {
  const rawNumber = String(phone ?? "").replace(/\D/g, "")
  if (!rawNumber) return false
  // Garante o código do país (55) no início do número.
  const number = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`
  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  )
  return true
}

export { openWhatsApp }
