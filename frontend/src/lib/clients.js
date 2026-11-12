/** Regras auxiliares relacionadas às clientes da clínica. */

import { daysSince, digits } from "@/lib/format"

// Modelo da mensagem: {nome}, {dias} e {servico} são trocados pelos dados da cliente.
const RETURN_MESSAGE =
  "Olá, {nome}! Já se passaram {dias} dias desde o seu último atendimento de {servico}. Que tal agendar a sua manutenção? Estamos à disposição!"

const pad = (n) => String(n).padStart(2, "0")

/** Data de hoje no fuso local, "YYYY-MM-DD". */
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Agora no fuso local, "YYYY-MM-DD HH:mm" (comparável com `${data} ${hora}`). */
const nowStamp = () => {
  const now = new Date()
  return `${todayIso()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/**
 * ÚLTIMA APLICAÇÃO = atendimento mais recente que JÁ ACONTECEU (data e hora até
 * agora) e não foi cancelado. Agendamentos futuros NÃO contam como aplicação
 * (ex.: em 12/11 às 10h, nem o de 17/11 nem o de 12/11 às 14h contam).
 * Devolve { date: "YYYY-MM-DD", service } ou null se ainda não houve nenhuma.
 */
const lastApplication = (c) => {
  const today = todayIso()
  const now = nowStamp()
  const done = (c.appts ?? [])
    .filter(
      (a) =>
        a.status !== "CANCELADO" &&
        `${a.data} ${String(a.hora ?? "00:00").slice(0, 5)}` <= now,
    )
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))
  if (done[0]) return { date: done[0].data, service: done[0].servico }
  // Sem histórico na resposta: usa a data do backend, se não for futura.
  if (/^\d{4}-\d{2}-\d{2}$/.test(c.lastDate ?? "") && c.lastDate <= today)
    return { date: c.lastDate, service: c.service }
  return null
}

/** "hoje", "há 1 dia", "há 12 dias". */
const daysAgoLabel = (days) =>
  days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`

/** RF40: dias desde o último procedimento + alerta de manutenção. */
const maintenance = (c) => {
  if (c.status === "ANONIMIZADO_LGPD")
    return { tone: "neutral", label: "Removido por LGPD", days: null }
  const last = lastApplication(c)
  if (!last) return { tone: "neutral", label: "Sem atendimentos", days: null }
  const days = daysSince(last.date)
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
  const last = lastApplication(c)
  const text = template
    .replaceAll("{nome}", c.name.split(" ")[0])
    .replaceAll("{servico}", last?.service ?? c.service)
    .replaceAll("{dias}", String(last ? daysSince(last.date) : 0))
  // wa.me é o link oficial do WhatsApp; 55 é o código do Brasil.
  return `https://wa.me/55${digits(c.whatsapp)}?text=${encodeURIComponent(text)}`
}

export { daysAgoLabel, lastApplication, maintenance, waRetorno }
