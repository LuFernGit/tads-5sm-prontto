/** Regras auxiliares relacionadas às clientes da clínica. */

import { daysSince, digits } from "@/lib/format"

// Modelo da mensagem: {nome}, {dias} e {servico} são trocados pelos dados da cliente.
const RETURN_MESSAGE =
  "Olá, {nome}! Já se passaram {dias} dias desde o seu último atendimento de {servico}. Que tal agendar a sua manutenção? Estamos à disposição!"

/** RF40: dias desde o último procedimento + alerta de manutenção. */
const maintenance = (c) => {
  if (c.status === "ANONIMIZADO_LGPD")
    return { tone: "neutral", label: "Removido por LGPD", days: null }
  const days = daysSince(c.lastDate)
  // Faixas: 45+ dias = vermelho (alerta), 21 a 44 = amarelo, menos de 21 = verde.
  return days >= 45
    ? { tone: "red", label: "Alerta de manutenção", days }
    : days >= 21
      ? { tone: "amber", label: "Próxima manutenção", days }
      : { tone: "green", label: "Em dia", days }
}

/**
 * Monta o link de WhatsApp para a mensagem de retorno da cliente.
 */
const waRetorno = (c, template = RETURN_MESSAGE) => {
  const text = template
    .replaceAll("{nome}", c.name.split(" ")[0])
    .replaceAll("{servico}", c.service)
    .replaceAll("{dias}", String(daysSince(c.lastDate)))
  // wa.me é o link oficial do WhatsApp; 55 é o código do Brasil.
  return `https://wa.me/55${digits(c.whatsapp)}?text=${encodeURIComponent(text)}`
}

export { maintenance, waRetorno }
