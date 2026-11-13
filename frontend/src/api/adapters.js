/**
 * Conversores entre o formato do banco/backend e o formato usado pelas telas.
 *
 * O backend devolve os agendamentos com os campos da tabela AGENDAMENTO
 * (data "YYYY-MM-DD", hora "HH:mm", status PENDENTE/CONFIRMADO/CONCLUIDO/
 * CANCELADO/ARQUIVADO, valores em número). As telas mostram datas por extenso
 * e rótulos como "Agendado"/"Realizado"; essa tradução é feita só aqui.
 */
import { apptLabel } from "@/constants"

// Índice 0 = domingo, igual ao Date.getDay() do JavaScript.
const WEEKDAY_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

/** "2026-05-13" → "13 de maio de 2026" */
const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

/** "2026-05-13" → "13/05/2026" */
export const isoToBr = (iso) => (iso ? iso.split("-").reverse().join("/") : "")

/** "2026-11-19T14:00" → "19/11 às 14:00" (prazos vindos do backend). */
const deadlineLabel = (iso) =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} às ${iso.slice(11, 16)}` : ""

/**
 * AgendamentoCliente (backend) → item da tela "Meu perfil".
 * Backend: { id, servicoId, nomeProcedimento, data, hora, duracao, valorServico,
 *            valorSinal, status, canceladoPor?, motivoCancelamento?, dataCancelamento? }
 */
export function toClientAppointment(a) {
  const status = a.status
  return {
    id: a.id,
    servicoId: a.servicoId,
    name: a.nomeProcedimento,
    weekday: WEEKDAY_SHORT[new Date(`${a.data}T00:00:00`).getDay()],
    date: longDate(a.data),
    dateIso: a.data,
    time: String(a.hora).slice(0, 5),
    duration: a.duracao, // minutos
    price: a.valorServico, // reais
    signal: a.valorSinal, // reais ou null
    rawStatus: status,
    // Agrupamento usado pelas listas da tela
    status:
      status === "CONCLUIDO"
        ? "Realizado"
        : status === "CANCELADO"
          ? "Cancelado"
          : status === "ARQUIVADO"
            ? "Arquivado"
            : "Agendado",
    badge: apptLabel[status] ?? status,
    cancelledBy: a.canceladoPor,
    cancellationReason: a.motivoCancelamento,
    // Cancelado pela cliente: true = com 24h ou mais de antecedência (pode
    // pedir reembolso do sinal); false = menos de 24h; null = não se aplica.
    cancelledInTime: a.cancelamentoNoPrazo ?? null,
    // Ativo com sinal: até quando cancelar e ainda pedir o sinal de volta
    // (prazo calculado no backend, 24h antes do horário).
    refundUntil: a.cancelarComReembolsoAte ?? null,
    refundUntilLabel: deadlineLabel(a.cancelarComReembolsoAte),
    // PENDENTE: prazo para a cliente confirmar ("2026-11-13T14:00" → "13/11 às 14:00")
    needsConfirmation: status === "PENDENTE",
    confirmBy: a.confirmarAte ?? null,
    confirmByLabel: a.confirmarAte
      ? `${a.confirmarAte.slice(8, 10)}/${a.confirmarAte.slice(5, 7)} às ${a.confirmarAte.slice(11, 16)}`
      : "",
  }
}

/**
 * AgendamentoGestora (backend) → item das telas da gestora (agenda, mensagens).
 * Backend: { id, cliente, whatsapp, nomeProcedimento, data, hora, duracao, status, ... }
 */
export function toManagerAppointment(a) {
  return {
    id: a.id,
    cliente: a.cliente,
    whatsapp: a.whatsapp,
    servico: a.nomeProcedimento,
    data: isoToBr(a.data),
    dataIso: a.data,
    horario: String(a.hora).slice(0, 5),
    duracao: a.duracao,
    status: a.status,
    canceladoPor: a.canceladoPor,
    motivoCancelamento: a.motivoCancelamento,
    dataCancelamento: a.dataCancelamento,
    // Política de 24h: sinal REGISTRADO (não confirma pagamento), se a cliente
    // cancelou com 24h+ e a análise de reembolso (null | A_VERIFICAR | VERIFICADO).
    valorSinal: a.valorSinal ?? null,
    cancelamentoNoPrazo: a.cancelamentoNoPrazo ?? null,
    reembolsoStatus: a.reembolsoStatus ?? null,
    // Ativo com sinal: prazo da cliente para cancelar com reembolso ("19/11 às 14:00").
    reembolsoAteLabel: deadlineLabel(a.cancelarComReembolsoAte),
  }
}
