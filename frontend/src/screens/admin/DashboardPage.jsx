import { useEffect, useState } from "react"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useFieldErrors } from "@/hooks/useFieldErrors"
import Action from "@/components/ui/Action"
import NewTabHint from "@/components/ui/NewTabHint"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { openWhatsApp } from "@/lib/whatsapp"
import { appointmentMessage, reminderFor } from "@/lib/messageTemplates"
import "./DashboardPage.css"

/* ---- Datas (sempre no fuso local; ISO = "YYYY-MM-DD") ---- */
const toIso = (date) => date.toLocaleDateString("sv-SE")
const parseIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}
/** Segunda-feira (ISO) da semana que contém a data. */
const mondayOf = (date) => {
  const monday = new Date(date)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return toIso(monday)
}
const addDays = (iso, days) => {
  const date = parseIso(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}
const capitalize = (text) => text.replace(/^./, (letter) => letter.toUpperCase())
const monthName = (date) => date.toLocaleDateString("pt-BR", { month: "long" })
/** "2 a 8 de novembro de 2026" ou "30 de novembro a 6 de dezembro de 2026". */
const weekRangeLabel = (startIso) => {
  const start = parseIso(startIso)
  const end = parseIso(addDays(startIso, 6))
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  const yearSuffix = sameYear ? "" : ` de ${start.getFullYear()}`
  const from = sameMonth
    ? start.getDate()
    : `${start.getDate()} de ${monthName(start)}${yearSuffix}`
  return `${from} a ${end.getDate()} de ${monthName(end)} de ${end.getFullYear()}`
}
/** "09:00" + 90 min → "10:30". */
const addMinutes = (hhmm, minutes) => {
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + (Number(minutes) || 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}
const MONTH_WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
const SHORT_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
/** "2026-11-11" → "Hoje" | "Amanhã" | "Sex, 13/11". */
const dayLabel = (iso, now = new Date()) => {
  if (!iso) return ""
  const today = toIso(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (iso === today) return "Hoje"
  if (iso === toIso(tomorrow)) return "Amanhã"
  const date = parseIso(iso)
  return `${SHORT_WEEKDAYS[date.getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}
/** Item de "próximos atendimentos" (backend) → dados usados nos modelos de mensagem. */
const nextToAppt = (item) => ({
  cliente: item.name,
  servico: item.service || item.detail,
  dataIso: item.data,
  horario: item.time,
  status: item.status,
})
const STATUS_LABEL ={ CONFIRMADO: "Confirmado", PENDENTE: "Aguardando confirmação da cliente" }
const pad2 = (n) => String(n).padStart(2, "0")
/** Agendamentos (não cancelados) agrupados por dia ("2026-11-12" → [...]), em ordem de horário. */
const groupByDay = (appointments) => {
  const byDay = {}
  appointments
    .filter((item) => item.status !== "CANCELADO")
    .sort((a, b) => a.horario.localeCompare(b.horario))
    .forEach((item) => {
      byDay[item.dataIso] = [...(byDay[item.dataIso] ?? []), item]
    })
  return byDay
}
const isPending = (slot) => slot.appointmentStatus === "PENDENTE"
/** Situação do horário para o leitor de tela: "agendado com X, confirmado" | "bloqueado" | "livre". */
const slotStatusText = (slot) => {
  if (slot.status === "busy") {
    const confirmation = isPending(slot) ? ", aguardando confirmação" : ", confirmado"
    return `agendado com ${slot.client}${confirmation}`
  }
  return slot.status === "blocked" ? "bloqueado" : "livre"
}
/** Resumo do horário no modal "Ajustar": cliente · serviço | "Bloqueado" | "Disponível". */
const slotSummary = (slot) => {
  if (slot.status === "busy") return `${slot.client} · ${slot.service}`
  return slot.status === "blocked" ? "Bloqueado" : "Disponível"
}
/** Balão do mês não sai pelas bordas: 1ª coluna abre para a direita, as últimas para a esquerda. */
const tooltipEdge = (column) => {
  if (column === 0) return "edge-left"
  return column >= 5 ? "edge-right" : ""
}

/**
 * Grade do mês: espaços até a 1ª segunda-feira + dias do mês + espaços até
 * completar a última semana. null = dia de outro mês (aparece apagado).
 * outsideDayLabel(index) = número a mostrar num espaço de outro mês.
 */
const buildMonthGrid = (monthCursor) => {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const leadingBlanks = (monthCursor.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const monthDays = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toIso(new Date(year, month, index + 1))),
  ]
  const cells = [
    ...monthDays,
    ...Array.from({ length: (7 - (monthDays.length % 7)) % 7 }, () => null),
  ]
  const outsideDayLabel = (index) =>
    index < leadingBlanks
      ? daysInPrevMonth - leadingBlanks + index + 1
      : index - leadingBlanks - daysInMonth + 1
  return { cells, rows: Math.ceil(cells.length / 7), leadingBlanks, outsideDayLabel }
}
/**
 * Situação do dia, com as MESMAS cores da agenda da cliente:
 * passado/fechado = cinza · lotado = âmbar claro · livre = branco com "Livre"
 * verde · hoje = âmbar escuro preenchido.
 * availability = resposta de GET /clinicas/{slug}/calendario.
 */
const dayStateOf = (iso, todayIso, availability) => {
  if (iso === todayIso) return { cls: "today", tag: "Hoje" }
  if (iso < todayIso) return { cls: "past", tag: "" }
  const day = Number(iso.slice(8, 10))
  const weekday = parseIso(iso).getDay()
  const closed =
    (availability?.diasSemanaFechados ?? []).includes(weekday) ||
    (availability?.diasBloqueados ?? []).includes(day)
  if (closed) return { cls: "closed", tag: "Fechado" }
  if ((availability?.diasLotados ?? []).includes(day)) return { cls: "full", tag: "Lotado" }
  return { cls: "free", tag: "Livre" }
}
/** Texto de quanto um bloqueio cobre (para avisar antes de liberar). */
const blockRange = (slot) =>
  slot.bloqueio?.inicio
    ? `das ${slot.bloqueio.inicio.slice(0, 5)} às ${slot.bloqueio.fim.slice(0, 5)}`
    : "o dia inteiro"
/**
 * Pedido de bloqueio: com horário, bloqueia só aquele intervalo; sem horário,
 * o dia inteiro (hora_inicio/hora_fim NULL). Devolve o corpo e o aviso de sucesso.
 */
const blockRequest = (date, slot) =>
  slot
    ? {
        body: { data: date, inicio: slot.time, fim: slot.end, motivo: "Horário bloqueado pelo painel" },
        success: "Horário bloqueado com sucesso.",
      }
    : {
        body: { data: date, inicio: null, fim: null, motivo: "Dia bloqueado pelo painel" },
        success: "Dia bloqueado. Os agendamentos existentes foram preservados.",
      }

/** Cartão "Próxima cliente": quem é, quando, procedimento e atalho do WhatsApp. */
function NextClient({ item, open, onToggle, now, messageTemplates, company }) {
  return (
    <>
      <div className="next-profile">
        <div className="large-avatar">{item.initial}</div>
        <div>
          <strong>{item.name}</strong>
          <span>
            {item.recorrente ? "Cliente recorrente" : "Cliente nova"}
          </span>
        </div>
        <button
          type="button"
          className={`expand-btn ${open ? "open" : ""}`}
          aria-expanded={open}
          aria-controls="next-main"
          aria-label={`Detalhes do atendimento de ${item.name}`}
          onClick={onToggle}
        >
          <Icon name="chevron" />
        </button>
      </div>

      <div
        id="next-main"
        className={`expand-panel ${open ? "open" : ""}`}
      >
        <div>
          <div className="appointment-time">
            <div>
              <Icon name="clock" />
              <span>
                {dayLabel(item.data, now)}, {item.time}
              </span>
            </div>
            {item.duracao && <small>{item.duracao} min</small>}
          </div>
          <div className="procedure">
            <span>PROCEDIMENTO</span>
            <strong>{item.service}</strong>
            <small>
              {item.time} — {item.end}
            </small>
          </div>
          <div className="next-tags">
            <span>
              <Icon
                name={item.status === "CONFIRMADO" ? "check" : "clock"}
                size={13}
              />{" "}
              {item.status === "PENDENTE"
                ? "AGUARDANDO CONFIRMAÇÃO"
                : item.status}
            </span>
            {item.signal && (
              <span>{item.signal.toUpperCase()}</span>
            )}
          </div>
          <Action
            className="full"
            onClick={() =>
              openWhatsApp(
                reminderFor(messageTemplates, nextToAppt(item), company),
                item.whatsapp,
              )
            }
          >
            <Icon name="whatsapp" />{" "}
            {item.status === "PENDENTE"
              ? "Lembrar de confirmar"
              : "Ir para o WhatsApp"}{" "}
            <NewTabHint compact />
          </Action>
        </div>
      </div>
    </>
  )
}

/** Cartões de números no topo do painel (dados reais do backend). */
function DashboardMetrics({ todayCount, confirmedToday, freeSlots, isCurrentWeek, clientsTotal }) {
  const noneToday = todayCount === 0
  return (
    <section className="metrics">
      <div className="metric-card">
        <div className="metric-icon rose">
          <Icon name="calendar" />
        </div>
        <div>
          <small>AGENDAMENTOS HOJE</small>
          <strong>{pad2(todayCount)}</strong>
          <span>{noneToday ? "Nenhum atendimento hoje" : "Sem contar os cancelados"}</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-icon green">
          <Icon name="check" />
        </div>
        <div>
          <small>CONFIRMADOS</small>
          <strong>{pad2(confirmedToday)}</strong>
          <span>{noneToday ? "Nenhum atendimento hoje" : `de ${todayCount} agendados hoje`}</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-icon gold">
          <Icon name="clock" />
        </div>
        <div>
          <small>HORÁRIOS LIVRES</small>
          <strong>{pad2(freeSlots)}</strong>
          <span>{isCurrentWeek ? "Disponíveis esta semana" : "Disponíveis na semana exibida"}</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-icon navy">
          <Icon name="users" />
        </div>
        <div>
          <small>TOTAL DE CLIENTES</small>
          <strong>{clientsTotal == null ? "—" : pad2(clientsTotal)}</strong>
          <span>Cadastradas na clínica</span>
        </div>
      </div>
    </section>
  )
}

/** Balão de um horário agendado na semana (abre ao passar o mouse ou focar). */
function SlotTooltip({ slot, dateIso, messageTemplates, company }) {
  const pending = isPending(slot)
  return (
    <div className="slot-tooltip">
      <div className="tooltip-head">
        <div className="client-avatar">
          {slot.client?.slice(0, 1)}
        </div>
        <div>
          <strong>{slot.client}</strong>
          <span>{pending ? "Aguardando confirmação" : "Cliente confirmada"}</span>
        </div>
        <div
          className={`status-dot ${pending ? "pending" : ""}`}
          aria-hidden="true"
        />
      </div>
      <div className="tooltip-detail">
        <Icon name="sparkle" />
        <div>
          <small>PROCEDIMENTO</small>
          <span>{slot.service}</span>
        </div>
      </div>
      <div className="tooltip-row">
        <span>
          <Icon name="clock" size={14} /> {slot.time} —{" "}
          {slot.end}
        </span>
        <span className={pending ? "pending" : "confirmed"}>
          {pending ? "Pendente" : "Confirmado"}
        </span>
      </div>
      <div>
        <Action
          onClick={() =>
            openWhatsApp(
              reminderFor(
                messageTemplates,
                {
                  cliente: slot.client,
                  servico: slot.service,
                  dataIso: dateIso,
                  horario: slot.time,
                  status: slot.appointmentStatus,
                },
                company,
              ),
              slot.whatsapp,
            )
          }
        >
          <Icon name="whatsapp" size={15} /> Chamar no
          WhatsApp <NewTabHint compact />
        </Action>
      </div>
    </div>
  )
}

/**
 * Visão geral da operação com métricas, agenda semanal e próximos atendimentos.
 *
 * Agenda semanal (decisão do projeto — opção A): os horários vêm calculados do
 * backend a partir de HORARIO + BLOQUEIO_HORARIO + AGENDAMENTO. Aqui a gestora:
 *   - bloqueia um horário ou o dia inteiro  → cria um BLOQUEIO_HORARIO;
 *   - libera um horário/dia bloqueado       → apaga o BLOQUEIO_HORARIO;
 *   - cancela um atendimento                → cancela o AGENDAMENTO.
 * Não há horário avulso: para abrir mais horários, a gestora muda o horário de
 * funcionamento em "Agenda". Depois de cada ação o painel é recarregado.
 */
function DashboardPageView({
  notify,
  dashboard,
  appointments,
  clientsTotal,
  company,
  messageTemplates = [],
  reload,
  weekStart,
  setWeekStart,
}) {
  // Dados que vieram do backend (GET /gestora/painel?semana=...).
  const nextAppointments = dashboard.proximos
  const slots = dashboard.horarios
  const days = dashboard.dias
  const dates = dashboard.datas
  const todayIso = toIso(new Date())
  const currentWeek = mondayOf(new Date())
  // view = 'Semana' ou 'Mês'; monthCursor = 1º dia do mês mostrado no calendário.
  const [view, setView] = useState("Semana")
  const [monthCursor, setMonthCursor] = useState(() => {
    const start = parseIso(weekStart)
    return new Date(start.getFullYear(), start.getMonth(), 1)
  })
  // Estados dos modais: horário clicado, motivo do cancelamento, dia sendo
  // gerenciado e ações esperando confirmação.
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [cancelReason, setCancelReason] = useState("")
  // Erro do motivo do cancelamento, mostrado embaixo do campo.
  const { a11y, errorFor, showErrors, clearOnInput, setErrors } =
    useFieldErrors(notify)
  const REASON_ID = "pai-motivo-do-cancelamento"
  const [confirmSlotCancellation, setConfirmSlotCancellation] = useState(false)
  const [managingDay, setManagingDay] = useState(null)
  const [pendingBlock, setPendingBlock] = useState(null)
  const [pendingCalendarAction, setPendingCalendarAction] = useState(null)
  const monthLabel = capitalize(
    monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  )
  const isCurrentMonth =
    monthCursor.getFullYear() === new Date().getFullYear() &&
    monthCursor.getMonth() === new Date().getMonth()
  /** Troca para o mês: começa no mês da semana que está aberta. */
  const openMonth = () => {
    const start = parseIso(weekStart)
    setMonthCursor(new Date(start.getFullYear(), start.getMonth(), 1))
    setView("Mês")
  }
  /** Clique num dia do mês: abre a semana daquele dia com os detalhes. */
  const openWeekOf = (iso) => {
    setWeekStart(mondayOf(parseIso(iso)))
    setView("Semana")
  }
  /** Setas: na semana andam 7 dias; no mês, um mês. */
  const step = (direction) => {
    if (view === "Semana") {
      setWeekStart(addDays(weekStart, 7 * direction))
      return
    }
    setMonthCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    )
  }
  const goToday = () => {
    setWeekStart(currentWeek)
    setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  }
  const showingToday = view === "Semana" ? weekStart === currentWeek : isCurrentMonth
  // MÉTRICAS DO TOPO — calculadas com dados reais do backend (nada fixo):
  //   hoje / confirmados → GET /gestora/agendamentos (data de hoje, sem cancelados)
  //   horários livres    → GET /gestora/painel (slots "free" da semana exibida)
  //   total de clientes  → GET /gestora/clientes
  // O backend não guarda histórico para comparar com ontem/meses anteriores,
  // por isso não há porcentagens nem variações.
  const todayAppointments = appointments.filter(
    (item) => item.dataIso === todayIso && item.status !== "CANCELADO",
  )
  const confirmedToday = todayAppointments.filter(
    (item) => item.status === "CONFIRMADO",
  ).length
  const freeSlots = slots.flat().filter((slot) => slot.status === "free").length
  // Agendamentos (não cancelados) agrupados por dia, em ordem de horário.
  const appointmentsByDay = groupByDay(appointments)
  // Células do mês (dias de outros meses = null, aparecem apagados).
  const {
    cells: monthCells,
    rows: monthRows,
    leadingBlanks,
    outsideDayLabel,
  } = buildMonthGrid(monthCursor)
  // Disponibilidade do mês — a MESMA rota que a agenda da cliente usa
  // (GET /clinicas/{slug}/calendario?mes=YYYY-MM): lotados, fechados e bloqueados.
  const monthKey = toIso(monthCursor).slice(0, 7)
  const availabilityQuery = useApiQuery(
    () => api.clinic.getCalendar(company.slug, monthKey),
    [company?.slug, monthKey],
    { enabled: Boolean(company?.slug) },
  )
  const dayState = (iso) => dayStateOf(iso, todayIso, availabilityQuery.data)
  // Qual item da lista 'Próximos atendimentos' está aberto (sanfona).
  const [openNext, setOpenNext] = useState("main")
  // Atualiza a cada minuto o selo "EM X MIN" da próxima cliente.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  // Próximos atendimentos (backend): o 1º é a "Próxima cliente", os outros vão na lista.
  const [firstNext, ...otherNext] = nextAppointments ?? []
  const toggleNext = (key) =>
    setOpenNext((current) => (current === key ? null : key))
  /** Executa a ação no backend, recarrega o painel e avisa o resultado. */
  const run = async (action, success) => {
    try {
      await action()
      await reload()
      notify(success)
      return true
    } catch (error) {
      notify(error.message)
      return false
    }
  }
  /**
   * Clique em um horário da agenda semanal:
   *   ocupado/cancelado → abre os detalhes do atendimento
   *   bloqueado         → pergunta se quer liberar
   *   livre             → pergunta se quer bloquear
   */
  const handleSlot = (slot, dayIndex) => {
    if (slot.status === "busy") {
      setCancelReason("")
      setErrors({})
      setSelectedSlot({ ...slot, day: days[dayIndex], dayIndex })
      return
    }
    // Liberar = apagar o bloqueio. Se ele cobre mais que este horário, avisa.
    if (slot.status === "blocked") {
      setPendingCalendarAction({
        title: "Confirmar liberação do horário?",
        message: `O bloqueio de ${days[dayIndex]} (${blockRange(slot)}) será removido e o período voltará a ficar disponível para novos agendamentos.`,
        label: "Sim, liberar",
        run: () =>
          run(
            () => api.schedule.deleteBlock(slot.bloqueio.id),
            "Horário liberado com sucesso.",
          ),
      })
      return
    }
    setPendingBlock({ dayIndex, slot })
  }
  /** Bloqueia o dia inteiro ou, se ele já estiver todo bloqueado, libera. */
  const toggleWholeDay = (dayIndex) => {
    const availableSlots = slots[dayIndex].filter(
      (slot) => slot.status !== "busy",
    )
    const shouldRelease =
      availableSlots.length > 0 &&
      availableSlots.every((slot) => slot.status === "blocked")
    if (!shouldRelease) {
      setPendingBlock({ dayIndex })
      return
    }
    const blockIds = [
      ...new Set(availableSlots.map((slot) => slot.bloqueio?.id)),
    ].filter(Boolean)
    setPendingCalendarAction({
      title: "Confirmar liberação do dia?",
      message: `Os bloqueios de ${days[dayIndex]} serão removidos e os horários voltarão a ficar disponíveis. Os atendimentos existentes serão preservados.`,
      label: "Sim, liberar dia",
      run: () =>
        run(
          () => Promise.all(blockIds.map((id) => api.schedule.deleteBlock(id))),
          "Dia liberado para novos agendamentos.",
        ),
    })
  }
  /** A gestora confirmou o bloqueio: cria o BLOQUEIO_HORARIO no backend. */
  const confirmCalendarBlock = async () => {
    if (!pendingBlock) return
    const { dayIndex, slot } = pendingBlock
    setPendingBlock(null)
    const { body, success } = blockRequest(dates[dayIndex], slot)
    await run(() => api.schedule.createBlock(body), success)
  }
  /** Cancela o atendimento selecionado (motivo obrigatório) e abre o WhatsApp para avisar a cliente. */
  const confirmCalendarCancellation = async () => {
    if (!selectedSlot) return
    if (showErrors({ [REASON_ID]: !cancelReason.trim() && "Informe o motivo do cancelamento. Ele vai na mensagem para a cliente. Exemplo: indisponibilidade da profissional." })) return
    const reason = cancelReason.trim()
    const slot = selectedSlot
    const ok = await run(
      () => api.appointments.cancel(slot.agendamentoId, reason),
      "Agendamento cancelado. O WhatsApp foi aberto com a mensagem pronta para revisão e envio.",
    )
    if (!ok) return
    openWhatsApp(
      appointmentMessage(
        messageTemplates,
        "CANCELAMENTO",
        { cliente: slot.client, servico: slot.service, dataIso: dates[slot.dayIndex], horario: slot.time },
        company,
        { motivo: reason },
      ),
      slot.whatsapp,
    )
    setConfirmSlotCancellation(false)
    setSelectedSlot(null)
    setCancelReason("")
  }
  return (
    <>
      {/* Cartões de números no topo (atendimentos, faturamento etc.). */}
      <DashboardMetrics
        todayCount={todayAppointments.length}
        confirmedToday={confirmedToday}
        freeSlots={freeSlots}
        isCurrentWeek={weekStart === currentWeek}
        clientsTotal={clientsTotal}
      />
      {/* Agenda (semana ou mês) à esquerda e próximos atendimentos à direita. */}
      <section className="dashboard-grid">
        <div className="calendar-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">AGENDA INTELIGENTE</span>
              <div className="section-title" aria-live="polite">
                {view === "Semana" ? weekRangeLabel(weekStart) : monthLabel}
              </div>
            </div>
            <div className="calendar-tools">
              <div className="segmented">
                {["Semana", "Mês"].map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => (v === "Mês" ? openMonth() : setView(v))}
                    className={view === v ? "selected" : ""}
                    aria-pressed={view === v}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {!showingToday && (
                <button type="button" className="today-control" onClick={goToday}>
                  Hoje
                </button>
              )}
              <button
                type="button"
                aria-label={view === "Semana" ? "Semana anterior" : "Mês anterior"}
                className="circle-control rotate"
                onClick={() => step(-1)}
              >
                <Icon name="chevron" />
              </button>
              <button
                type="button"
                aria-label={view === "Semana" ? "Próxima semana" : "Próximo mês"}
                className="circle-control"
                onClick={() => step(1)}
              >
                <Icon name="chevron" />
              </button>
            </div>
          </div>
          {/* Legenda da SEMANA (a do mês fica junto da grade do mês, mais abaixo). */}
          {view === "Semana" && (
            <div className="calendar-legend">
              <span>
                <i className="dot free" />Disponível
              </span>
              <span>
                <i className="dot busy" />Agendado
              </span>
              <span>
                <i className="dot blocked" />Bloqueado
              </span>
              <small>
                <Icon name="lock" size={13} /> Clique em um horário livre para
                bloquear
              </small>
            </div>
          )}
          {view === "Semana" ? (
            <div className="week-grid">
              {days.map((day, dayIndex) => (
                <div
                  className={`day-column ${dates[dayIndex] === todayIso ? "today" : ""}`}
                  key={day}
                >
                  <div className="day-head">
                    <span>{day.split(" ")[0]}</span>
                    <strong>{day.split(" ")[1]}</strong>
                    <button
                      type="button"
                      onClick={() => setManagingDay(dayIndex)}
                    >
                      Ajustar
                    </button>
                  </div>
                  <div className="day-slots">
                    {slots[dayIndex].map((slot) => (
                      // ACESSIBILIDADE (WCAG 4.1.2): o horário é um <button> de verdade e o
                      // balão (com o botão do WhatsApp) fica AO LADO dele, não dentro.
                      // O balão abre ao passar o mouse ou ao focar pelo teclado (Tab).
                      <div className="time-slot-wrap" key={slot.time}>
                      <button
                        type="button"
                        onClick={() => handleSlot(slot, dayIndex)}
                        className={`time-slot ${slot.status}`}
                        aria-label={`${days[dayIndex]} ${slot.time}: ${slotStatusText(slot)}`}
                      >
                        <span>{slot.time}</span>
                        {slot.status === "busy" && <i />}
                        {slot.status === "blocked" && (
                          <Icon name="lock" size={12} />
                        )}
                      </button>
                        {slot.status === "busy" && (
                          <SlotTooltip
                            slot={slot}
                            dateIso={dates[dayIndex]}
                            messageTemplates={messageTemplates}
                            company={company}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
            {/* Legenda: mesmas cores do calendário que a cliente vê na vitrine. */}
            <div className="month-legend" aria-hidden="true">
              <span><i className="month-dot free" /> Livre</span>
              <span><i className="month-dot full" /> Lotado</span>
              <span><i className="month-dot closed" /> Fechado ou passado</span>
              <span><i className="month-dot today" /> Hoje</span>
              <small>
                <Icon name="calendar" size={14} /> Clique em um dia para abrir a semana
              </small>
            </div>
            <div className="month-overview">
              {MONTH_WEEKDAYS.map((label) => (
                <span className="month-weekday" key={label} aria-hidden="true">
                  {label}
                </span>
              ))}
              {monthCells.map((iso, index) => {
                if (!iso) {
                  // Dia do mês anterior ("prev-30") ou do seguinte ("next-1").
                  const outsideDay = outsideDayLabel(index)
                  const side = index < leadingBlanks ? "prev" : "next"
                  return (
                    <span
                      className="month-out"
                      key={`${side}-${outsideDay}`}
                      aria-hidden="true"
                    >
                      {outsideDay}
                    </span>
                  )
                }
                const state = dayState(iso)
                const dayNumber = Number(iso.slice(8, 10))
                const list = appointmentsByDay[iso] || []
                const column = index % 7
                const row = Math.floor(index / 7)
                // Posição do balão: não sair pelas bordas do calendário.
                const tooltipPosition = [
                  tooltipEdge(column),
                  row >= monthRows - 2 && monthRows > 3 ? "above" : "",
                ].join(" ")
                const summary = list.length
                  ? list
                      .map((item) => `${item.horario} ${item.cliente}, ${item.servico}`)
                      .join("; ")
                  : "nenhum agendamento"
                return (
                  <button
                    type="button"
                    key={iso}
                    className={`month-day ${state.cls}`}
                    onClick={() => openWeekOf(iso)}
                    aria-label={`${dayNumber} de ${monthName(monthCursor)}, ${state.tag || "dia passado"}: ${summary}. Abrir a semana.`}
                    aria-current={iso === todayIso ? "date" : undefined}
                  >
                    <span className="month-day-number">{dayNumber}</span>
                    {list.slice(0, 2).map((item) => (
                      <small className="month-chip" key={item.id}>
                        <b>{item.horario}</b> {item.cliente.split(" ")[0]}
                      </small>
                    ))}
                    {list.length > 2 && (
                      // <span> (e não <small>): o painel força todo <small> a ficar cinza
                      // (.admin-main small em AdminApp.css), o que apagava a cor no dia de hoje.
                      <span className="month-more">+{list.length - 2} mais</span>
                    )}
                    {state.tag && <span className="month-tag">{state.tag}</span>}
                    {list.length > 0 && (
                      <span
                        className={`month-tooltip ${tooltipPosition}`}
                        aria-hidden="true"
                      >
                        <span className="month-tooltip-title">
                          {dayNumber} de {monthName(monthCursor)} ·{" "}
                          {list.length}{" "}
                          {list.length === 1 ? "atendimento" : "atendimentos"}
                        </span>
                        {list.map((item) => (
                          <span className="month-tooltip-item" key={item.id}>
                            <span className="month-tooltip-time">
                              {item.horario}–{addMinutes(item.horario, item.duracao)}
                            </span>
                            <span className="month-tooltip-info">
                              <strong>{item.cliente}</strong>
                              <small>{item.servico}</small>
                            </span>
                          </span>
                        ))}
                        <span className="month-tooltip-hint">
                          Clique para ver a semana
                        </span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            </>
          )}
          <div className="calendar-foot">
            <span>
              <Icon name="sparkle" size={14} /> Dica Prontto: passe o mouse nos
              agendamentos para ver detalhes.
            </span>
            <Action variant="ghost" onClick={openMonth}>
              Abrir agenda completa <Icon name="arrow" size={14} />
            </Action>
          </div>
        </div>
        <aside
          className="next-card"
          aria-label="Próxima cliente e próximos atendimentos"
        >
          <div className="next-top">
            <span className="section-kicker">PRÓXIMA CLIENTE</span>
          </div>

          {firstNext ? (
            <NextClient
              item={firstNext}
              open={openNext === "main"}
              onToggle={() => toggleNext("main")}
              now={now}
              messageTemplates={messageTemplates}
              company={company}
            />
          ) : (
            <p className="next-empty">
              Nenhum atendimento agendado a partir de agora. Quando uma cliente
              agendar, ela aparece aqui.
            </p>
          )}

          {otherNext.length > 0 && (
            <div className="mini-list">
              <span className="section-kicker">PRÓXIMOS ATENDIMENTOS</span>
              {otherNext.map((item, index) => {
                const open = openNext === item.id
                // Subtítulo do dia ("Amanhã", "Sáb, 14/11") quando o dia muda.
                const newDay = index === 0 || otherNext[index - 1].data !== item.data
                return (
                  <div className="mini-item" key={item.id}>
                    {newDay && (
                      <span className="mini-day">{dayLabel(item.data, now)}</span>
                    )}
                    <button
                      type="button"
                      className="mini-row"
                      aria-expanded={open}
                      aria-controls={`next-${item.id}`}
                      onClick={() => toggleNext(item.id)}
                    >
                      <span className="mini-time">{item.time}</span>
                      <span className={`tiny-avatar ${item.alt ? "alt" : ""}`}>
                        {item.initial}
                      </span>
                      <span className="mini-name">
                        <strong>{item.name}</strong>
                        <small>{item.service}</small>
                      </span>
                      <span
                        className={`expand-btn ${open ? "open" : ""}`}
                        aria-hidden="true"
                      >
                        <Icon name="chevron" />
                      </span>
                    </button>
                    <div
                      id={`next-${item.id}`}
                      className={`expand-panel ${open ? "open" : ""}`}
                    >
                      <div>
                        <dl className="mini-facts">
                          <div>
                            <dt>Dia e horário</dt>
                            <dd>
                              {dayLabel(item.data, now)}, {item.time} — {item.end}
                            </dd>
                          </div>
                          <div>
                            <dt>Procedimento</dt>
                            <dd>{item.detail}</dd>
                          </div>
                          <div>
                            <dt>Situação</dt>
                            <dd>{STATUS_LABEL[item.status] ?? item.status}</dd>
                          </div>
                          <div>
                            <dt>Sinal</dt>
                            <dd>{item.signal}</dd>
                          </div>
                        </dl>
                        <Action
                          variant="secondary"
                          className="full"
                          onClick={() =>
                            openWhatsApp(
                              reminderFor(messageTemplates, nextToAppt(item), company),
                              item.whatsapp,
                            )
                          }
                        >
                          <Icon name="whatsapp" size={15} />{" "}
                          {item.status === "PENDENTE"
                            ? "Lembrar de confirmar"
                            : "Chamar no WhatsApp"}{" "}
                          <NewTabHint compact />
                        </Action>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      </section>
      {selectedSlot && (
        <Modal
          title="Detalhes do atendimento"
          onClose={() => setSelectedSlot(null)}
        >
          <div className="modal-details">
            <span>
              <small>CLIENTE</small>
              <strong>{selectedSlot.client}</strong>
            </span>
            <span>
              <small>PROCEDIMENTO</small>
              <strong>{selectedSlot.service}</strong>
            </span>
            <span>
              <small>DATA E HORÁRIO</small>
              <strong>
                {selectedSlot.day} · {selectedSlot.time}
              </strong>
            </span>
            <span>
              <small>SITUAÇÃO</small>
              <strong>
                {selectedSlot.appointmentStatus === "PENDENTE"
                  ? "Aguardando confirmação da cliente"
                  : "Confirmado"}
              </strong>
            </span>
          </div>
          {selectedSlot.status === "busy" && (
            <label
              htmlFor={REASON_ID}
              className="manager-cancel-reason"
              onInput={clearOnInput}
            >
              <span>MOTIVO DO CANCELAMENTO *</span>
              <textarea {...a11y(REASON_ID)}
                rows={2}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ex.: indisponibilidade da profissional"
              />
              {errorFor(REASON_ID)}
            </label>
          )}
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setSelectedSlot(null)}>
              Fechar
            </Action>
            {selectedSlot.status === "busy" && (
              <>
                <Action
                  variant="danger"
                  onClick={() => {
                    if (
                      showErrors({
                        [REASON_ID]: !cancelReason.trim() && "Informe o motivo do cancelamento. Ele vai na mensagem para a cliente. Exemplo: indisponibilidade da profissional.",
                      })
                    )
                      return
                    setConfirmSlotCancellation(true)
                  }}
                >
                  <Icon name="x-circle" /> Cancelar agendamento
                </Action>
                <Action
                  onClick={() =>
                    openWhatsApp(
                      reminderFor(
                        messageTemplates,
                        {
                          cliente: selectedSlot.client,
                          servico: selectedSlot.service,
                          dataIso: dates[selectedSlot.dayIndex],
                          horario: selectedSlot.time,
                          status: selectedSlot.appointmentStatus,
                        },
                        company,
                      ),
                      selectedSlot.whatsapp,
                    )
                  }
                >
                  <Icon name="whatsapp" /> WhatsApp <NewTabHint compact />
                </Action>
              </>
            )}
          </div>
        </Modal>
      )}
      {confirmSlotCancellation && selectedSlot && (
        <Modal
          title="Confirmar cancelamento?"
          onClose={() => setConfirmSlotCancellation(false)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="lock" />
            </div>
            <p>
              Você está prestes a cancelar o atendimento de{" "}
              <strong>{selectedSlot.client}</strong>, referente a{" "}
              <strong>{selectedSlot.service}</strong>, em{" "}
              <strong>
                {selectedSlot.day} às {selectedSlot.time}
              </strong>
              .
            </p>
            <p>
              Motivo informado: <strong>{cancelReason.trim()}</strong>
            </p>
            <p>
              Essa ação liberará o horário para novos agendamentos. Deseja
              continuar?
            </p>
          </div>
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setConfirmSlotCancellation(false)}
            >
              Não, manter agendamento
            </Action>
            <Action variant="danger" onClick={confirmCalendarCancellation}>
              Sim, cancelar agendamento{" "}
              <NewTabHint compact text="abre o WhatsApp em nova guia para avisar a cliente" />
            </Action>
          </div>
        </Modal>
      )}
      {managingDay !== null && (
        <Modal
          wide
          title={`Disponibilidade — ${days[managingDay]}`}
          onClose={() => setManagingDay(null)}
        >
          <div className="day-availability-head">
            <div>
              <span className="section-kicker">PERSONALIZE A AGENDA</span>
              <p>
                Bloqueie o dia inteiro ou cada horário. Para abrir mais
                horários, altere o horário de funcionamento em Agenda.
              </p>
            </div>
            <Action
              variant="secondary"
              onClick={() => toggleWholeDay(managingDay)}
            >
              <Icon name="lock" size={15} />
              {slots[managingDay]
                .filter((slot) => slot.status !== "busy")
                .every((slot) => slot.status === "blocked")
                ? "Liberar dia"
                : "Bloquear dia"}
            </Action>
          </div>
          <div className="slot-manager">
            {slots[managingDay].length === 0 && (
              <p className="ff-copy">
                Sem expediente neste dia (horário de funcionamento inativo).
              </p>
            )}
            {slots[managingDay].map((slot) => (
              <div key={slot.time} className={slot.status}>
                <span>
                  <strong>{slot.time}</strong>
                  <small>
                    {slotSummary(slot)}
                  </small>
                </span>
                {slot.status === "busy" ? (
                  <span className="locked-booking">
                    <Icon name="lock" size={13} />
                    Agendado
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`slot-status-button ${slot.status}`}
                    onClick={() => handleSlot(slot, managingDay)}
                  >
                    {slot.status === "blocked" ? "Liberar" : "Bloquear"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setManagingDay(null)}>
              Concluir ajustes
            </Action>
          </div>
        </Modal>
      )}
      {pendingCalendarAction && (
        <Modal
          title={pendingCalendarAction.title}
          onClose={() => setPendingCalendarAction(null)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="lock" />
            </div>
            <p>{pendingCalendarAction.message}</p>
            <p>Deseja continuar?</p>
          </div>
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setPendingCalendarAction(null)}
            >
              Voltar
            </Action>
            <Action
              variant="danger"
              onClick={() => {
                const run = pendingCalendarAction.run
                setPendingCalendarAction(null)
                run()
              }}
            >
              {pendingCalendarAction.label}
            </Action>
          </div>
        </Modal>
      )}
      {pendingBlock && (
        <Modal
          title="Confirmar bloqueio?"
          onClose={() => setPendingBlock(null)}
        >
          <p className="ff-copy">
            {!pendingBlock.slot
              ? `Você está prestes a bloquear todos os horários disponíveis de ${days[pendingBlock.dayIndex]}. Os atendimentos já agendados serão preservados.`
              : `Você está prestes a bloquear ${pendingBlock.slot.time}–${pendingBlock.slot.end} de ${days[pendingBlock.dayIndex]}.`}
          </p>
          <p className="ff-copy">
            Novos agendamentos não poderão ser feitos neste período. Deseja
            continuar?
          </p>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setPendingBlock(null)}>
              Voltar
            </Action>
            <Action variant="danger" onClick={confirmCalendarBlock}>
              Confirmar bloqueio
            </Action>
          </div>
        </Modal>
      )}
    </>
  )
}

/**
 * Carrega a grade da semana escolhida (GET /gestora/painel?semana=...) e os
 * agendamentos usados no calendário do mês (GET /gestora/agendamentos).
 * 'weekStart' fica aqui porque muda a busca; trocar de semana refaz o GET.
 */
function DashboardPage(props) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const query = useApiQuery(
    () => api.schedule.getDashboard(weekStart),
    [weekStart],
  )
  const appointmentsQuery = useApiQuery(() => api.appointments.list(), [])
  // Só para o cartão "Total de clientes" (GET /gestora/clientes).
  const clientsQuery = useApiQuery(() => api.clients.list(), [])
  // Depois de bloquear/cancelar, atualiza a semana e o mês juntos.
  const reload = () => Promise.all([query.reload(), appointmentsQuery.reload()])
  return (
    <AsyncState query={query}>
      {(dashboard) => (
        <DashboardPageView
          {...props}
          dashboard={dashboard}
          appointments={appointmentsQuery.data ?? []}
          clientsTotal={clientsQuery.data?.length}
          reload={reload}
          weekStart={weekStart}
          setWeekStart={setWeekStart}
        />
      )}
    </AsyncState>
  )
}

export default DashboardPage
