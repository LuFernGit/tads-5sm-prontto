/**
 * Mensagens de WhatsApp montadas a partir dos MODELOS DA CLÍNICA
 * (GET /gestora/mensagens/modelos, editados na Central de Mensagens).
 *
 * Painel, Agenda e Central de Mensagens usam estas funções, então o texto que
 * a gestora edita num lugar vale em todos. Se a clínica excluiu ou desativou o
 * modelo de uma finalidade, usa o texto padrão abaixo (o mesmo do backend,
 * GestoraAdminService.MODELOS_PADRAO).
 */
import { toSlug } from "@/lib/format"

/** Horas antes do atendimento para a cliente confirmar (RegrasAgendamento.PRAZO_CONFIRMACAO_HORAS). */
export const CONFIRM_HOURS = 24

/** Textos padrão do sistema por finalidade (reserva quando não há modelo ativo). */
export const DEFAULT_TEXTS = {
  CONFIRMACAO:
    "Olá, {nome}! Seu horário de {procedimento} está reservado para {data} às {horario}. Para garantir a sua vaga, confirme sua presença pelo nosso site até {prazo}: {link} Sem a confirmação, o horário é liberado para outra cliente. Te esperamos! — {clinica}",
  CANCELAMENTO:
    "Olá, {nome}! Informamos que seu agendamento de {procedimento}, marcado para {data} às {horario}, precisou ser cancelado. Motivo: {motivo}. Pedimos desculpas pelo transtorno. — {clinica}",
  LEMBRETE:
    "Olá, {nome}! Passando para lembrar do seu atendimento de {procedimento}, no dia {data} às {horario}. Esperamos você! — {clinica}",
  MANUTENCAO:
    "Olá, {nome}! Informamos que a clínica estará em manutenção em {data}. Entre em contato conosco para verificar a disponibilidade de horários. — {clinica}",
  ALTERACAO:
    "Olá, {nome}! Precisamos conversar sobre o horário do seu atendimento de {procedimento}, previsto para {data} às {horario}. Por favor, fale conosco. — {clinica}",
  REAGENDAMENTO:
    "Olá, {nome}! Gostaríamos de combinar um novo horário para seu atendimento de {procedimento}. Entre em contato para escolhermos a melhor opção. — {clinica}",
}

/** Troca cada {variavel} do texto pelo valor correspondente. */
export const fillTemplate = (text, values) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value ?? ""),
    text || "",
  )

/** Endereço da vitrine da clínica (o mesmo do "Copiar link" do menu). */
export const storefrontUrl = (company) =>
  `${window.location.origin}${window.location.pathname}?clinica=${
    company?.slug || toSlug(company?.name || "")
  }`

const pad = (n) => String(n).padStart(2, "0")

/** "2026-11-17" → "17/11/2026". */
const isoToBr = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "")

/**
 * Prazo para a cliente confirmar: atendimento − 24h.
 * → { date: Date, label: "16/11 às 13:00" } ou null se a data for inválida.
 */
export const confirmDeadline = (dataIso, horario) => {
  const when = new Date(`${String(dataIso).slice(0, 10)}T${String(horario).slice(0, 5)}:00`)
  if (Number.isNaN(when.getTime())) return null
  const d = new Date(when.getTime() - CONFIRM_HOURS * 3600000)
  return {
    date: d,
    label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Texto do primeiro modelo ATIVO da finalidade; sem modelo, o texto padrão. */
export const templateText = (templates, finalidade) =>
  (templates ?? []).find((t) => t.finalidade === finalidade && t.ativo)?.texto ??
  DEFAULT_TEXTS[finalidade] ??
  ""

/**
 * Monta a mensagem de um agendamento com o modelo da finalidade.
 * appt = { cliente, servico, dataIso: "YYYY-MM-DD", horario: "HH:mm" }
 */
export const appointmentMessage = (templates, finalidade, appt, company, extra = {}) =>
  fillTemplate(templateText(templates, finalidade), {
    nome: appt.cliente?.split(" ")[0] || "cliente",
    nome_cliente: appt.cliente || "cliente",
    procedimento: appt.servico || "seu atendimento",
    servico: appt.servico || "seu atendimento",
    data: isoToBr(appt.dataIso),
    horario: String(appt.horario ?? "").slice(0, 5),
    prazo: confirmDeadline(appt.dataIso, appt.horario)?.label || "24 horas antes do horário",
    link: storefrontUrl(company),
    motivo: "indisponibilidade da clínica",
    clinica: company?.name || "",
    ...extra,
  })

/**
 * Mensagem certa para cada situação do agendamento:
 *  - aguardando confirmação → PEDIDO DE CONFIRMAÇÃO (confirme pelo site até o prazo);
 *  - confirmado            → LEMBRETE.
 */
export const reminderFor = (templates, appt, company) =>
  appointmentMessage(
    templates,
    appt.status === "PENDENTE" ? "CONFIRMACAO" : "LEMBRETE",
    appt,
    company,
  )
