import { useEffect, useMemo, useState } from "react"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import AnamnesisFields from "@/components/forms/AnamnesisFields"
import Field, { aria } from "@/components/ui/Field"
import BookingConfirmation from "./BookingConfirmation"
import DepositStep from "./DepositStep"
import StorefrontFooter from "@/components/layout/StorefrontFooter"
import NewTabHint from "@/components/ui/NewTabHint"
import {
  EMPTY_SERVICE,
  PREVIEW_CLIENT,
  badgeClass,
  emptyAnamnesis,
  BOOKING_MONTHS,
  SIGNAL_PERCENT,
} from "@/constants"
import { clearToken } from "@/api/session"
import {
  clearPendingBooking,
  readPendingBooking,
  savePendingBooking,
} from "@/lib/pendingBooking"
import { toHealthRecord } from "@/lib/anamnesis"
import { formatDuration, formatPrice, toSlug } from "@/lib/format"
import { PLACEHOLDER, maskPhone } from "@/lib/masks"
import {
  durationInMinutes,
  fitsBusinessHours,
  getCategoryMeta,
  procedureIcon,
} from "@/lib/booking"
import { openWhatsApp } from "@/lib/whatsapp"
import {
  MIN_AGE_CLIENT,
  birthError,
  emailError,
  phoneError,
  validateAnamnesis,
} from "@/lib/validators"
import "./ClientApp.css"

/**
 * Compõe a vitrine e as áreas de serviços, agendamento e perfil da cliente.
 */
// Funções auxiliares usadas mais abaixo:
// formatUpdatedAt: '2026-05-13T...' → '13 de mai de 2026' (data da última atualização da ficha).
const formatUpdatedAt = (iso) =>
  iso
    ? new Date(iso)
        .toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        .replace(/\./g, "")
    : "—"

// pad(5) → '05' (completa com zero à esquerda).
const pad = (n) => String(n).padStart(2, "0")

/**
 * true se hoje não cabe mais nenhum atendimento com esta duração antes do
 * fechamento (19h, veja fitsBusinessHours). Nesse caso hoje conta como "Passado".
 */
const todayIsOver = (duration) => {
  const now = new Date()
  return !fitsBusinessHours(`${pad(now.getHours())}:${pad(now.getMinutes())}`, duration)
}

/**
 * Aviso sobre o sinal no "Cancelar agendamento?" (política de 24 horas).
 * preview = resposta do backend (GET /cliente/agendamentos/{id}/cancelamento):
 *   { noPrazo, temSinal, valorSinal, prazoReembolso, prazoHoras }.
 * O Prontto não faz reembolso: o texto orienta a pedir à clínica. Fora do
 * prazo o sinal é perdido, exceto em caso de força maior — aí a cliente deve
 * falar com a clínica, que avalia o caso.
 */
function CancelRefundNotice({ preview, recurring }) {
  if (!preview) return null
  const hours = preview.prazoHoras ?? 24
  // Formato único dos avisos: ícone + título curto + texto.
  const notice = (tone, icon, title, text, role = "note") => (
    <div className={`cancel-refund-notice ${tone}`} role={role}>
      <Icon name={icon} size={18} />
      <div>
        <strong className="cancel-refund-title">{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
  if (!preview.temSinal)
    return recurring
      ? notice(
          "is-neutral",
          "check",
          "Sem sinal a reembolsar",
          "Como cliente recorrente, você é isenta do sinal. Este cancelamento não gera cobrança nem reembolso.",
        )
      : notice(
          "is-neutral",
          "check",
          "Nenhum sinal registrado",
          "Este agendamento não possui sinal registrado, portanto não há valor a reembolsar. Caso tenha feito algum pagamento diretamente à clínica, entre em contato antes de cancelar.",
        )
  const signal = preview.valorSinal ? (
    <>
      {" "}
      Sinal registrado: <strong>{formatPrice(preview.valorSinal)}</strong>.
    </>
  ) : null
  if (preview.noPrazo)
    return notice(
      "is-ok",
      "check",
      "Reembolso do sinal disponível",
      <>
        Seu cancelamento está sendo realizado com {hours} horas ou mais de
        antecedência. Caso tenha realizado o pagamento do sinal, você poderá
        solicitar o reembolso diretamente à clínica. O reembolso não é
        realizado automaticamente pelo Prontto.{signal}
      </>,
    )
  return notice(
    "is-warning",
    "clock",
    `Menos de ${hours} horas para o horário`,
    <>
      Conforme a política da clínica, ao cancelar agora o valor do sinal será
      perdido, exceto em casos de força maior. Se for o seu caso, entre em
      contato com a clínica antes de continuar.{signal}
    </>,
    "alert",
  )
}

/** true se a data (AAAA-MM-DD) é hoje e o horário (HH:mm) já passou. */
const isPastTime = (dateIso, time) => {
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return dateIso === today && time <= `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// ClientAppView = a tela da vitrine em si. Tem 4 abas (state 'tab'):
//   home     → início (capa, especialidades, endereço)
//   services → lista de serviços por categoria
//   schedule → agendamento (calendário, horários, resumo e sinal)
//   profile  → meu perfil (agendamentos, ficha de saúde, dados pessoais)
// preview = true quando a gestora está só visualizando (sem agendar nem pagar).
function ClientAppView({
  setMode,
  notify,
  serviceCatalog,
  serviceCategories,
  // { [nome]: capa } — fotos de capa enviadas pela gestora (CATEGORIA.capa).
  categoryCovers,
  company,
  preview = false,
  // guest = visitante sem login: vê vitrine, serviços e agenda; para confirmar, faz login.
  guest = false,
  initialProfile,
  initialHealthRecord,
  initialAppointments,
}) {
  const clinicSlug = company.slug || toSlug(company.name)
  const [clientSession, setClientSession] = useState(initialProfile)
  // Escolha feita como VISITANTE antes de entrar/cadastrar (serviço, dia e horário).
  // Já logada, a cliente volta direto para a confirmação desse agendamento.
  const [resumed] = useState(() => {
    if (guest || preview) return null
    const pending = readPendingBooking(clinicSlug)
    const chosen = pending
      ? serviceCatalog.find((item) => item.active && String(item.id) === String(pending.serviceId))
      : null
    if (!chosen) return null
    const [y, m, d] = pending.dateIso.split("-").map(Number)
    const now = new Date()
    const start = new Date(y, m - 1, d)
    const [hh, mm] = pending.time.split(":").map(Number)
    start.setHours(hh, mm, 0, 0)
    if (start <= now) return null // horário já passou: ignora
    return {
      service: chosen,
      day: d,
      monthOffset: (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()),
      time: pending.time,
    }
  })
  // Aba aberta e escolhas do agendamento (categoria, serviço, dia, horário, pagamento).
  const [tab, setTab] = useState(resumed ? "schedule" : "home")
  const [category, setCategory] = useState("")
  // Sem serviço pré-escolhido: o calendário só aparece depois que a cliente
  // escolhe um serviço (a duração dele define os horários livres).
  const [service, setService] = useState(resumed?.service || EMPTY_SERVICE)
  const hasService = Boolean(service?.id)
  const [selectedTime, setSelectedTime] = useState(resumed?.time ?? "")
  const [selectedDay, setSelectedDay] = useState(resumed?.day ?? new Date().getDate())
  const [bookingMonthOffset, setBookingMonthOffset] = useState(resumed?.monthOffset ?? 0)
  const [confirmed, setConfirmed] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [depositStep, setDepositStep] = useState(Boolean(resumed))
  // Escolha recuperada: apaga do navegador e avisa a cliente (uma vez só).
  useEffect(() => {
    if (guest || preview) return
    clearPendingBooking(clinicSlug)
    if (resumed)
      notify(
        "Recuperamos o serviço, o dia e o horário que você escolheu. Confira e conclua o agendamento.",
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [signalValue, setSignalValue] = useState(null)
  // Agendamento recém-criado (vem do backend): diz se nasceu PENDENTE (precisa
  // confirmar a presença) e até quando confirmar — usado na tela "Tudo certo".
  const [createdAppointment, setCreatedAppointment] = useState(null)
  // "Confirmar presença" pede confirmação antes de enviar (agendamento escolhido).
  const [presenceToConfirm, setPresenceToConfirm] = useState(null)
  const [confirmingPresence, setConfirmingPresence] = useState(false)
  // Meu perfil
  const [appointments, setAppointments] = useState(initialAppointments)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  // Prévia do cancelamento (backend): está no prazo de 24h? tem sinal registrado?
  const [cancelPreview, setCancelPreview] = useState(null)
  const [loadingCancel, setLoadingCancel] = useState(false)
  // Meus agendamentos ao vivo: cancelamento pela gestora (ou automático) aparece
  // sem a cliente recarregar a página.
  useLiveRefresh(
    async () => {
      const list = await api.me.listAppointments()
      setAppointments(list)
      setSelectedAppointment((current) =>
        current ? (list.find((item) => item.id === current.id) ?? current) : current,
      )
    },
    { enabled: !guest && !preview, interval: 30000 },
  )
  const [editingHealth, setEditingHealth] = useState(false)
  const [healthUpdatedAt, setHealthUpdatedAt] = useState(() =>
    formatUpdatedAt(initialHealthRecord?.atualizadaEm),
  )
  const [health, setHealth] = useState(() => {
    const anamnese = initialHealthRecord?.respostas ?? {}
    return {
      ...emptyAnamnesis,
      ...anamnese,
      procedimentos: [...(anamnese.procedimentos ?? [])],
      sinaisAtuais: [...(anamnese.sinaisAtuais ?? [])],
    }
  })
  const [healthDraft, setHealthDraft] = useState(health)
  const [healthErrors, setHealthErrors] = useState({})
  const [editingProfile, setEditingProfile] = useState(false)
  const [confirmingAccountDeletion, setConfirmingAccountDeletion] =
    useState(false)
  const [profileData, setProfileData] = useState({
    name: clientSession.name,
    email: clientSession.email,
    whatsapp: clientSession.whatsapp,
    birthDate: clientSession.birthDate,
  })
  const [profileDraft, setProfileDraft] = useState(profileData)
  const [profileErrors, setProfileErrors] = useState({})
  // Agendamentos ainda por acontecer; o primeiro aparece em "Próximo agendamento".
  const upcomingAppointments = appointments.filter(
    (item) => item.status === "Agendado",
  )
  const nextAppointment = upcomingAppointments[0]
  // Pendentes de confirmação da cliente (aparecem no aviso do perfil).
  const pendingConfirmation = appointments.filter((item) => item.needsConfirmation)
  // Links do Google Maps: mapa embutido e botão 'Como chegar'.
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(company.address)}&output=embed`
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`
  const filtered = useMemo(
    () =>
      serviceCatalog.filter(
        (item) => item.active && item.category === category,
      ),
    [category, serviceCatalog],
  )
  /**
   * Vai para a aba de agendamento com o serviço escolhido. Sem serviço (ex.:
   * "Agendar agora" no topo), mantém o que já estava escolhido; se não houver
   * nenhum, a aba pede para escolher um serviço antes do calendário.
   */
  const goSchedule = (chosen = service) => {
    if (preview) {
      notify(
        "Ações de agendamento ficam desativadas no modo de visualização da gestora.",
      )
      return
    }
    setService(chosen)
    setTab("schedule")
    setDepositStep(false)
    setConfirmed(false)
  }
  /** Abre a aba de serviços filtrada pela categoria clicada. */
  const openCategory = (chosenCategory) => {
    setCategory(chosenCategory)
    setTab("services")
  }
  // Calendário do agendamento
  const bookingDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + bookingMonthOffset,
    1,
  )
  const todayOver = todayIsOver(durationInMinutes(service.duration))
  // Primeiro dia que ainda dá para agendar no mês mostrado.
  const firstBookableDay =
    bookingMonthOffset === 0 ? new Date().getDate() + (todayOver ? 1 : 0) : 1
  // Dia escolhido, ajustado para existir no mês mostrado e, no mês atual,
  // nunca ser anterior a hoje (não dá para agendar no passado).
  const requestedDay = Math.max(
    Math.min(
      selectedDay,
      new Date(
        bookingDate.getFullYear(),
        bookingDate.getMonth() + 1,
        0,
      ).getDate(),
    ),
    firstBookableDay,
  )
  const firstWeekday = bookingDate.getDay()
  const daysInMonth = new Date(
    bookingDate.getFullYear(),
    bookingDate.getMonth() + 1,
    0,
  ).getDate()
  const daysInPrevMonth = new Date(
    bookingDate.getFullYear(),
    bookingDate.getMonth(),
    0,
  ).getDate()
  // Quantidade de quadradinhos do calendário (sempre semanas completas de 7 dias).
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  // Busca no backend os dias lotados e os dias da semana em que a clínica fecha.
  const calendarQuery = useApiQuery(
    () =>
      api.clinic.getCalendar(
        clinicSlug,
        `${bookingDate.getFullYear()}-${pad(bookingDate.getMonth() + 1)}`,
      ),
    [clinicSlug, bookingMonthOffset],
    // live: false = esta tela já tem a própria atualização (useLiveRefresh abaixo).
    // Sem serviço escolhido o calendário não aparece, então não consulta.
    {
      initialData: { diasLotados: [], diasSemanaFechados: [0], diasBloqueados: [] },
      live: false,
      enabled: hasService,
    },
  )
  const busyDays = calendarQuery.data?.diasLotados ?? []
  const closedWeekdays = calendarQuery.data?.diasSemanaFechados ?? [0]
  // Dias com bloqueio do dia inteiro: aparecem como "Fechado".
  const blockedDays = calendarQuery.data?.diasBloqueados ?? []
  // Se o dia pedido estiver fechado ou lotado, a seleção vai para o próximo dia livre.
  const dayIsBookable = (day) =>
    !closedWeekdays.includes(new Date(bookingDate.getFullYear(), bookingDate.getMonth(), day).getDay()) &&
    !busyDays.includes(day) &&
    !blockedDays.includes(day)
  let selectedDaySafe = requestedDay
  while (selectedDaySafe <= daysInMonth && !dayIsBookable(selectedDaySafe)) selectedDaySafe++
  if (selectedDaySafe > daysInMonth) selectedDaySafe = requestedDay // nenhum dia livre no mês
  const selectedDateLabel = `${selectedDaySafe} de ${bookingDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`
  const selectedDateIso = `${bookingDate.getFullYear()}-${pad(
    bookingDate.getMonth() + 1,
  )}-${pad(selectedDaySafe)}`
  // Busca os horários livres do dia escolhido.
  const timesQuery = useApiQuery(
    () => api.clinic.getAvailableTimes(clinicSlug, selectedDateIso, service.id),
    [clinicSlug, selectedDateIso, service.id],
    { initialData: [], live: false, enabled: hasService },
  )
  const timePeriods = timesQuery.data ?? []

  /* ---------- AO VIVO: mudanças da gestora e de outras clientes ---------- */
  // Serviço desativado (ou alterado) pela gestora enquanto a cliente estava na
  // tela: o catálogo chega atualizado (useAppSession); aqui a escolha acompanha.
  // (setState no efeito é intencional: sincroniza com um dado que vem de fora.)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!service?.id) return
    const fresh = serviceCatalog.find((item) => String(item.id) === String(service.id))
    if (fresh?.active) {
      if (fresh !== service) setService(fresh) // preço, duração ou foto mudaram
      return
    }
    setService(EMPTY_SERVICE) // volta para "escolha um serviço"
    setSelectedTime("")
    setDepositStep(false)
    notify(
      `O serviço "${service.name}" não está mais disponível para agendamento. Escolha outro serviço.`,
      "error",
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceCatalog])
  // Na aba Agendar, dias lotados e horários livres são reconsultados: um
  // horário que outra cliente acabou de marcar deixa de aparecer como livre.
  useLiveRefresh(
    async () => {
      await Promise.all([calendarQuery.reload(), timesQuery.reload()])
    },
    { enabled: tab === "schedule" && !confirmed && hasService, interval: 20000 },
  )
  // Horário escolhido foi ocupado nesse meio-tempo: desmarca e avisa.
  useEffect(() => {
    if (!selectedTime) return
    const slot = timePeriods.flatMap((p) => p.slots ?? []).find((x) => x.time === selectedTime)
    if (slot?.occupied) {
      setSelectedTime("")
      notify("O horário que você escolheu acabou de ser reservado. Escolha outro horário.", "error")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriods])
  /* eslint-enable react-hooks/set-state-in-effect */
  const bookingTitle = bookingDate
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (letter) => letter.toUpperCase())
  // Monta cada célula do calendário: dia do mês anterior/seguinte, fechado, lotado ou livre.
  const calendarCells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1
    const inMonth = day >= 1 && day <= daysInMonth
    const label =
      day < 1
        ? daysInPrevMonth + day
        : day > daysInMonth
          ? day - daysInMonth
          : day
    // Dia que já passou: só existe no mês atual (meses anteriores não são exibidos).
    const past =
      inMonth &&
      (new Date(bookingDate.getFullYear(), bookingDate.getMonth(), day) <
        new Date(new Date().setHours(0, 0, 0, 0)) ||
        // hoje, quando não cabe mais nenhum horário
        (bookingMonthOffset === 0 && day === new Date().getDate() && todayOver))
    const closed =
      inMonth && !past && (closedWeekdays.includes(index % 7) || blockedDays.includes(day))
    const full = inMonth && !past && busyDays.includes(day)
    // Dia de hoje: número num quadradinho âmbar escuro (igual ao painel da gestora)
    const today = inMonth && bookingMonthOffset === 0 && day === new Date().getDate()
    return {
      index,
      day,
      label,
      inMonth,
      past,
      closed,
      full,
      today,
      unavailable: past || closed || full,
    }
  })
  /** Clique em um dia do calendário (dias fechados ou lotados só mostram aviso). */
  const chooseDay = (day, unavailable = false, past = false) => {
    if (preview) {
      notify("O calendário está somente para visualização.")
      return
    }
    if (past) {
      notify("Essa data já passou. Escolha hoje ou um dia mais à frente.")
      return
    }
    if (unavailable) {
      notify("Este dia está indisponível. Escolha outra data.")
      return
    }
    setSelectedDay(day)
    setSelectedTime("")
  }
  /** Clique em um horário (horários ocupados só mostram aviso). */
  const chooseTime = (time, occupied = false, past = false) => {
    if (preview) {
      notify("Os horários estão somente para visualização.")
      return
    }
    if (past) {
      notify("Esse horário de hoje já passou. Escolha um horário mais tarde ou outro dia.")
      return
    }
    if (occupied) {
      notify("Este horário já está ocupado.")
      return
    }
    setSelectedTime(time)
  }
  /** 'Agendar novamente': abre o agendamento com o mesmo serviço de um atendimento antigo. */
  const rebook = (appointment) => {
    const chosen =
      serviceCatalog.find((item) => item.id === appointment.servicoId) ||
      serviceCatalog.find((item) => item.name === appointment.name) ||
      serviceCatalog.find((item) => item.active)
    setSelectedAppointment(null)
    goSchedule(chosen)
  }
  /**
   * "Cancelar agendamento": antes de abrir a confirmação, pergunta ao backend
   * se o cancelamento agora fica dentro das 24h (regra só no backend) para
   * mostrar o aviso certo sobre o reembolso do sinal.
   */
  const askCancel = async (appointment) => {
    if (loadingCancel) return
    setLoadingCancel(true)
    try {
      setCancelPreview(await api.me.getCancellationPreview(appointment.id))
      setCancelling(appointment)
    } catch (error) {
      notify(error.message, "error")
    } finally {
      setLoadingCancel(false)
    }
  }
  const closeCancel = () => {
    setCancelling(null)
    setCancelPreview(null)
  }
  /** Cliente confirma o cancelamento: cancela no backend e abre o WhatsApp da clínica. */
  const confirmCancel = async () => {
    if (
      !cancelling ||
      cancelling.status === "Cancelado" ||
      cancelling.status === "Realizado"
    )
      return
    let updated
    try {
      updated = await api.me.cancelAppointment(
        cancelling.id,
        "Solicitado pela cliente",
      )
      setAppointments((current) =>
        current.map((item) => (item.id === cancelling.id ? updated : item)),
      )
    } catch (error) {
      notify(error.message)
      return
    }
    // O resultado vale pelo momento REAL do cancelamento (backend), não pela prévia.
    const hasSignal = Boolean(cancelPreview?.temSinal)
    const canAskRefund = hasSignal && updated.cancelledInTime === true
    const refundLine = canAskRefund
      ? ` Como cancelei com 24 horas ou mais de antecedência, gostaria de solicitar o reembolso do sinal${
          cancelPreview.valorSinal ? ` (${formatPrice(cancelPreview.valorSinal)})` : ""
        }, caso o pagamento tenha sido confirmado.`
      : ""
    const message = `Olá! Sou ${profileData.name || clientSession.name}. Gostaria de confirmar o cancelamento do meu agendamento de ${cancelling.name}, marcado para ${cancelling.date} às ${cancelling.time}.${refundLine} Poderiam confirmar o recebimento?`
    openWhatsApp(message, company.phone)
    closeCancel()
    setSelectedAppointment(null)
    let outcome = ""
    if (canAskRefund)
      outcome = " A clínica foi avisada para analisar o reembolso do sinal."
    else if (hasSignal)
      outcome = " Como faltavam menos de 24 horas, o sinal não será devolvido, exceto em caso de força maior: nesse caso, fale com a clínica."
    notify(
      `Agendamento cancelado.${outcome} O WhatsApp foi aberto com a mensagem pronta.`,
    )
  }
  /**
   * "Confirmar presença" (todo agendamento nasce PENDENTE): abre o modal
   * "Confirmar presença?"; só depois do "Sim" o agendamento vira CONFIRMADO.
   */
  const confirmPresence = (appointment) => setPresenceToConfirm(appointment)
  const sendPresenceConfirmation = async () => {
    const appointment = presenceToConfirm
    if (!appointment || confirmingPresence) return
    setConfirmingPresence(true)
    try {
      const updated = await api.me.confirmAppointment(appointment.id)
      setAppointments((current) =>
        current.map((item) => (item.id === appointment.id ? updated : item)),
      )
      setSelectedAppointment((current) =>
        current?.id === appointment.id ? updated : current,
      )
      setPresenceToConfirm(null)
      notify("Presença confirmada. Te esperamos!", "success")
    } catch (error) {
      notify(error.message, "error")
    } finally {
      setConfirmingPresence(false)
    }
  }
  /** Abre o modal de edição da ficha de saúde com uma cópia dos dados atuais. */
  const openHealthEditor = () => {
    setHealthDraft({
      ...health,
      procedimentos: [...health.procedimentos],
      sinaisAtuais: [...health.sinaisAtuais],
      cienciaInformacoes: false,
    })
    setHealthErrors({})
    setEditingHealth(true)
  }
  /** Valida e salva a ficha de saúde (anamnese). */
  const saveHealth = async () => {
    const errs = validateAnamnesis(healthDraft)
    setHealthErrors(errs)
    if (Object.keys(errs).length > 0) {
      notify("Corrija os campos indicados para continuar.")
      return
    }
    const updatedHealth = {
      ...healthDraft,
      procedimentos: [...healthDraft.procedimentos],
      sinaisAtuais: [...healthDraft.sinaisAtuais],
    }
    try {
      // resumo (alergias/observacoes_medicas) + respostas completas (JSON)
      const saved = await api.me.updateHealthRecord(toHealthRecord(updatedHealth))
      setHealthUpdatedAt(formatUpdatedAt(saved?.atualizadaEm))
    } catch (error) {
      notify(error.message)
      return
    }
    setHealth(updatedHealth)
    setEditingHealth(false)
    notify("Ficha de saúde atualizada com sucesso.")
  }
  /** Copia o endereço da clínica para a área de transferência. */
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(company.address)
      notify("Endereço copiado.")
    } catch {
      notify("Não foi possível copiar o endereço.")
    }
  }
  // Atalho para os inputs do perfil: onChange={setDraftField('name')}.
  const setDraftField = (key) => (e) =>
    setProfileDraft((c) => ({ ...c, [key]: e.target.value }))
  /** Abre o modal de edição dos dados pessoais. */
  const openProfileEditor = () => {
    setProfileDraft({ ...profileData, name: clientSession.name })
    setProfileErrors({})
    setEditingProfile(true)
  }
  /** Valida e salva os dados pessoais da cliente. */
  const saveProfile = async () => {
    const errs = {}
    if (!profileDraft.name.trim())
      errs.name = "Informe seu nome completo. Exemplo: Jamily Souza."
    if (profileDraft.email.trim() && emailError(profileDraft.email))
      errs.email = emailError(profileDraft.email)
    if (profileDraft.whatsapp.trim() && phoneError(profileDraft.whatsapp))
      errs.whatsapp = phoneError(profileDraft.whatsapp)
    if (
      profileDraft.birthDate &&
      birthError(profileDraft.birthDate, MIN_AGE_CLIENT)
    )
      errs.birthDate = birthError(profileDraft.birthDate, MIN_AGE_CLIENT)
    setProfileErrors(errs)
    if (Object.keys(errs).length) {
      notify("Corrija os campos indicados para continuar.")
      return
    }
    const name = profileDraft.name.trim()
    try {
      const saved = await api.me.updateProfile({ ...profileDraft, name })
      setClientSession((current) => ({ ...current, ...saved }))
    } catch (error) {
      notify(error.message)
      return
    }
    setProfileData({ ...profileDraft, name })
    setEditingProfile(false)
    notify("Seus dados foram atualizados.")
  }
  return (
    <div className={`client-app ${preview ? "preview-mode" : ""}`}>
      {/* Faixa de aviso quando a gestora está só visualizando a vitrine. */}
      {preview && (
        <div className="preview-banner">
          <Icon name="lock" size={14} />
          <span>
            Modo de visualização da gestora — agendamento e pagamento estão
            desativados.
          </span>
          <button type="button" onClick={() => setMode("admin")}>
            Voltar ao painel
          </button>
        </div>
      )}

      {/* Cabeçalho: logo da clínica e menu das abas (computador). */}
      <header className="client-header">
        {/* Logo e nome levam para a página inicial (aba Início) */}
        <button
          type="button"
          className="client-brand brand-home"
          aria-label={`${company.name} — ir para a página inicial`}
          onClick={() => {
            setCategory("")
            setTab("home")
          }}
        >
          <span className="ca-monogram">
            {company.logoImage ? (
              <img src={company.logoImage} alt="" />
            ) : (
              company.initials
            )}
          </span>
          <strong>{company.name}</strong>
        </button>
        <div className="client-nav">
          <button
            type="button"
            onClick={() => setTab("home")}
            className={tab === "home" ? "active" : ""}
            aria-current={tab === "home" ? "page" : undefined}
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory("")
              setTab("services")
            }}
            className={tab === "services" ? "active" : ""}
            aria-current={tab === "services" ? "page" : undefined}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setTab("schedule")}
            className={tab === "schedule" ? "active" : ""}
            aria-current={tab === "schedule" ? "page" : undefined}
          >
            Agendar
          </button>
          {!preview && !guest && (
            <button
              type="button"
              onClick={() => setTab("profile")}
              className={tab === "profile" ? "active" : ""}
              aria-current={tab === "profile" ? "page" : undefined}
            >
              Meu perfil
            </button>
          )}
        </div>
        <div className="client-head-actions">
          {preview ? (
            <Action variant="secondary" onClick={() => setMode("admin")}>
              <Icon name="arrow" size={15} /> Voltar ao painel
            </Action>
          ) : (
            <>
              {guest ? (
                <Action variant="ghost" onClick={() => setMode("login")}>
                  <Icon name="login" size={14} /> Login
                </Action>
              ) : (
                // Sair encerra a sessão e volta para a vitrine (modo visitante)
                <Action variant="ghost" onClick={() => setMode("guest")}>
                  <Icon name="logout" size={14} /> Sair
                </Action>
              )}
              <Action onClick={() => goSchedule()}>Agendar agora</Action>
            </>
          )}
        </div>
      </header>

      {/* ===== INÍCIO ===== */}
      {/* ===== ABA INÍCIO ===== */}
      {tab === "home" && (
        <main className="storefront">
          <section className="hero">
            <img
              src={company.heroImage}
              alt={`Atendimento da ${company.name}`}
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <span className="hero-kicker">{company.tagline}</span>
              <p className="hero-title">{company.heroTitle}</p>
              <p className="hero-copy">{company.description}</p>
              <Action onClick={() => setTab("services")}>
                Conheça nossos serviços <Icon name="arrow" />
              </Action>
            </div>
          </section>
          <section className="specialties">
            <span className="section-kicker">NOSSAS ESPECIALIDADES</span>
            <div className="client-section-title">Cuidado em cada detalhe</div>
            <div className="specialty-grid">
              {serviceCategories.map((categoryName, index) => {
                const item = getCategoryMeta(categoryName, categoryCovers)
                return (
                  <button
                    type="button"
                    className="specialty-card"
                    key={item.name}
                    onClick={() => openCategory(item.name)}
                  >
                    <img src={item.image} alt={item.name} />
                    <div>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.name}</strong>
                      <p>{item.copy}</p>
                      <small>
                        VER SERVIÇOS <Icon name="arrow" size={14} />
                      </small>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
          <StorefrontFooter company={company} />
        </main>
      )}

      {/* ===== SERVIÇOS ===== */}
      {/* ===== ABA SERVIÇOS ===== */}
      {tab === "services" && (
        <main className="client-page">
          <span className="section-kicker">NOSSO CATÁLOGO</span>
          <div className="client-section-title">
            {category || "Escolha uma categoria"}
          </div>
          <p className="client-intro">
            {category
              ? "Escolha o procedimento ideal para o seu momento."
              : "Primeiro selecione a área de cuidado que você deseja conhecer."}
          </p>
          {!category ? (
            <div className="category-showcase">
              {serviceCategories.map((categoryName) => {
                const item = getCategoryMeta(categoryName, categoryCovers)
                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => setCategory(item.name)}
                  >
                    <img src={item.image} alt="" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {
                          serviceCatalog.filter(
                            (serviceItem) =>
                              serviceItem.active &&
                              serviceItem.category === item.name,
                          ).length
                        }{" "}
                        serviços disponíveis
                      </small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="back-categories"
                onClick={() => setCategory("")}
              >
                ← Ver todas as categorias
              </button>
              <div className="service-cards">
                {filtered.map((item) => (
                  <div className="service-card" key={item.id}>
                    <img
                      src={item.image || getCategoryMeta(item.category, categoryCovers).image}
                      alt={item.name}
                    />
                    <div className="service-card-body">
                      <span>{item.category.toUpperCase()}</span>
                      <strong>{item.name}</strong>
                      {/* Resumo: o CSS mostra até 3 linhas; o texto completo
                          fica no title (mouse) e é lido inteiro pelo leitor de tela. */}
                      <p
                        className="service-card-description"
                        title={item.description || undefined}
                      >
                        {item.description ||
                          "Resultado delicado e personalizado para valorizar sua beleza."}
                      </p>
                      <div>
                        <small>
                          <Icon name="clock" size={14} />{" "}
                          {formatDuration(item.duration)}
                        </small>
                        <b>{formatPrice(item.price)}</b>
                      </div>
                      <Action
                        className={preview ? "disabled" : ""}
                        onClick={() => goSchedule(item)}
                      >
                        {preview ? "Somente visualização" : "Agendar horário"}{" "}
                        <Icon name={preview ? "lock" : "arrow"} size={15} />
                      </Action>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {/* ===== AGENDAR ===== */}
      {/* ===== ABA AGENDAR ===== */}
      {tab === "schedule" && (
        <main className="bk-page">
          {depositStep && !confirmed ? (
            <DepositStep
              serviceName={service.name}
              price={service.price}
              dateLabel={selectedDateLabel}
              time={selectedTime}
              merchantName={company.name}
              company={company}
              duration={service.duration}
              recurring={clientSession.recurring}
              onBack={() => setDepositStep(false)}
              onConfirm={async (value, payment) => {
                try {
                  // O pagamento do sinal é simulado (mock) e não vai para o banco;
                  // só o valor do sinal é gravado em AGENDAMENTO.valor_sinal.
                  const created = await api.me.createAppointment({
                    servicoId: service.id,
                    data: selectedDateIso,
                    hora: selectedTime,
                    valorSinal: value ?? null,
                  })
                  setAppointments((current) => [created, ...current])
                  setCreatedAppointment(created)
                } catch (error) {
                  notify(error.message)
                  return
                }
                setSignalValue(value)
                setPaymentInfo(payment ?? null)
                setConfirmed(true)
              }}
              notify={notify}
            />
          ) : !confirmed && !hasService ? (
            // Sem serviço escolhido não há calendário: os horários livres
            // dependem da duração do serviço.
            // Mesmo cabeçalho da aba Catálogo (kicker + título + texto).
            <section className="bk-choose-service" aria-labelledby="bk-choose-title">
              <span className="section-kicker">AGENDE SEU HORÁRIO</span>
              <h1 id="bk-choose-title" className="client-section-title">
                Primeiro, escolha o serviço
              </h1>
              <p className="client-intro">
                Para ver os dias e horários disponíveis, escolha antes qual
                serviço você quer agendar. Os horários dependem da duração de
                cada procedimento.
              </p>
              <Action
                onClick={() => {
                  setCategory("")
                  setTab("services")
                }}
              >
                Escolher um serviço <Icon name="arrow" size={15} />
              </Action>
            </section>
          ) : !confirmed ? (
            <>
              <div className="bk-head">
                <span className="bk-kicker">
                  {preview ? "VISUALIZAÇÃO DA AGENDA" : "AGENDE SEU HORÁRIO"}
                </span>
                <h1>Quando você quer se cuidar?</h1>
              </div>

              <div className="bk-layout">
                <section className="bk-card bk-cal">
                  <div className="bk-cal-head">
                    <div>
                      <span className="bk-kicker">ESCOLHA SUA DATA</span>
                      <h2>{bookingTitle}</h2>
                    </div>

                    <div className="bk-month-nav">
                      <button
                        type="button"
                        className="bk-arrow bk-arrow-prev"
                        disabled={bookingMonthOffset <= 0}
                        aria-label="Mês anterior (meses passados indisponíveis)"
                        onClick={() => {
                          setBookingMonthOffset((value) =>
                            Math.max(0, value - 1),
                          )
                          setSelectedTime("")
                        }}
                      >
                        <Icon name="chevron" size={18} />
                      </button>

                      <button
                        type="button"
                        aria-label={
                          bookingMonthOffset >= BOOKING_MONTHS - 1
                            ? `Próximo mês (agenda aberta só para ${BOOKING_MONTHS} meses)`
                            : "Próximo mês"
                        }
                        className="bk-arrow"
                        // Agenda limitada ao mês atual e ao seguinte
                        disabled={bookingMonthOffset >= BOOKING_MONTHS - 1}
                        onClick={() => {
                          setBookingMonthOffset((value) =>
                            Math.min(BOOKING_MONTHS - 1, value + 1),
                          )
                          setSelectedTime("")
                        }}
                      >
                        <Icon name="chevron" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Legenda: mesmos nomes e cores que aparecem nos dias do calendário */}
                  <div className="bk-cal-legend">
                    <span>
                      <i className="bk-dot free" />
                      Livre
                    </span>
                    <span>
                      <i className="bk-dot busy" />
                      Lotado
                    </span>
                    <span>
                      <i className="bk-dot closed" />
                      Fechado ou passado
                    </span>
                    <span>
                      <i className="bk-dot today" />
                      Hoje
                    </span>
                    <span>
                      <i className="bk-dot chosen" />
                      Selecionado
                    </span>
                    <small>
                      <Icon name="calendar" size={13} />
                      Toque em um dia livre para ver os horários
                    </small>
                  </div>

                  <div className="bk-cal-weekdays">
                    {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map(
                      (name) => (
                        <span key={name}>{name}</span>
                      ),
                    )}
                  </div>

                  <div className="bk-cal-grid">
                    {calendarCells.map((cell) => {
                      if (!cell.inMonth) {
                        return (
                          <div className="bk-cal-cell out" key={cell.index}>
                            <strong>{cell.label}</strong>
                          </div>
                        )
                      }
                      const isSelected =
                        cell.day === selectedDaySafe && !cell.unavailable
                      const state = isSelected
                        ? "selected"
                        : cell.today
                          ? "today"
                          : cell.past
                          ? "past"
                          : cell.closed
                          ? "closed"
                          : cell.full
                            ? "full"
                            : "free"
                      const tag = isSelected
                        ? "Selecionado"
                        : cell.today
                          ? "Hoje"
                          : cell.past
                          ? "Passado"
                          : cell.closed
                          ? "Fechado"
                          : cell.full
                            ? "Lotado"
                            : "Livre"
                      return (
                        <button
                          type="button"
                          key={cell.index}
                          className={`bk-cal-cell ${state}`}
                          onClick={() =>
                            chooseDay(cell.day, cell.unavailable, cell.past)
                          }
                          aria-label={`${cell.today ? "Hoje, " : ""}Dia ${cell.day}: ${tag}`}
                          aria-current={cell.today ? "date" : undefined}
                          // Dia passado: avisa o leitor de tela que o botão está inativo
                          aria-disabled={cell.past || undefined}
                        >
                          <strong>{cell.day}</strong>
                          {/* Dia passado: só o número riscado, sem texto. O leitor de tela
                              continua ouvindo "Passado" pelo aria-label do botão. */}
                          {(!cell.past || cell.today) && <small>{tag}</small>}
                        </button>
                      )
                    })}
                  </div>

                  <div className="bk-cal-foot">
                    <span>
                      <Icon name="sparkle" size={14} />
                      Dica: escolha um dia e depois o horário na coluna ao lado.
                    </span>
                    <span>Atendemos de segunda a sábado</span>
                  </div>
                </section>

                <aside className="bk-side">
                  <section className="bk-card bk-times">
                    <span className="bk-kicker">
                      {selectedDateLabel.toUpperCase()}
                    </span>
                    <h2>Horários disponíveis</h2>

                    {/* Sempre os três períodos, nesta ordem; período sem horário mostra um aviso. */}
                    {["MANHÃ", "TARDE", "NOITE"]
                      .map(
                        (label) =>
                          timePeriods.find((period) => period.label === label) ?? {
                            label,
                            slots: [],
                          },
                      )
                      .map((period) => ({
                        ...period,
                        slots: period.slots
                          .filter((slot) =>
                            fitsBusinessHours(
                              slot.time,
                              durationInMinutes(service.duration),
                            ),
                          )
                          // Hoje: horário que já passou fica indisponível.
                          .map((slot) =>
                            isPastTime(selectedDateIso, slot.time)
                              ? { ...slot, occupied: true, past: true }
                              : slot,
                          ),
                      }))
                      .map((period) => (
                        <div className="bk-period" key={period.label}>
                          <span>{period.label}</span>

                          {period.slots.length === 0 ? (
                            <p className="bk-period-empty">
                              Sem horários neste período.
                            </p>
                          ) : (
                          <div className="bk-slots">
                            {period.slots.map((slot) => (
                              <button
                                type="button"
                                key={slot.time}
                                className={`bk-slot ${
                                  slot.occupied ? "occupied" : ""
                                } ${
                                  selectedTime === slot.time ? "selected" : ""
                                }`}
                                onClick={() =>
                                  chooseTime(slot.time, slot.occupied, slot.past)
                                }
                              >
                                {slot.time}
                                {slot.occupied && (
                                  <small>{slot.past ? "Já passou" : "Indisponível"}</small>
                                )}
                              </button>
                            ))}
                          </div>
                          )}
                        </div>
                      ))}
                  </section>

                  <section className="bk-card bk-summary">
                    <span className="bk-kicker">
                      {preview ? "RESUMO DE EXEMPLO" : "SEU AGENDAMENTO"}
                    </span>

                    <div className="bk-service">
                      <img
                        src={
                          service.image || getCategoryMeta(service.category, categoryCovers).image
                        }
                        alt=""
                      />
                      <div>
                        <strong>{service.name}</strong>
                        <small>
                          {formatDuration(service.duration)}
                        </small>
                      </div>
                    </div>

                    <div className="bk-line">
                      <span>Data</span>
                      <strong>{selectedDateLabel}</strong>
                    </div>

                    <div className="bk-line">
                      <span>Horário</span>
                      <strong>{selectedTime || "Selecione ao lado"}</strong>
                    </div>

                    <div className="bk-line">
                      <span>Investimento</span>
                      <strong>{formatPrice(service.price)}</strong>
                    </div>

                    {/* Mesma regra do resumo (DepositStep): recorrente é isenta do
                        sinal; cliente nova (ou visitante) paga 30% para reservar. */}
                    <div
                      className={`bk-loyal ${
                        !preview && !clientSession.recurring ? "is-signal" : ""
                      }`}
                    >
                      <Icon
                        name={preview ? "lock" : clientSession.recurring ? "check" : "clock"}
                        size={18}
                      />
                      <div>
                        <strong>
                          {preview
                            ? "Modo de visualização"
                            : clientSession.recurring
                              ? "Cliente recorrente · isenta de sinal"
                              : `Sinal de ${SIGNAL_PERCENT}%: ${formatPrice(
                                  Math.round(Number(service.price || 0) * SIGNAL_PERCENT) / 100,
                                )}`}
                        </strong>
                        <small>
                          {preview
                            ? "A gestora não pode concluir agendamentos."
                            : clientSession.recurring
                              ? "Você confirma a presença até 24 horas antes do horário."
                              : "Pago na próxima etapa para garantir o horário. O restante é pago no atendimento. Depois, confirme sua presença em “Meu perfil” até 24 horas antes. Se cancelar com menos de 24 horas de antecedência, você perde o sinal (exceto em caso de força maior)."}
                        </small>
                      </div>
                    </div>

                    <Action
                      className={`full bk-confirm ${
                        preview || !selectedTime ? "disabled" : ""
                      }`}
                      onClick={() =>
                        preview
                          ? notify(
                              "A confirmação está desativada para a gestora.",
                            )
                          : guest && selectedTime
                            ? (savePendingBooking(clinicSlug, {
                                serviceId: service.id,
                                dateIso: selectedDateIso,
                                time: selectedTime,
                              }),
                              notify(
                                "Entre na sua conta (ou crie uma) para confirmar. Sua escolha fica guardada.",
                              ),
                              setMode("login"))
                          : selectedTime
                            ? setDepositStep(true)
                            : notify("Selecione um horário para continuar.")
                      }
                    >
                      {preview
                        ? "Confirmação desativada"
                        : guest
                          ? "Entrar para confirmar"
                          : "Confirmar agendamento"}
                      <Icon name={preview ? "lock" : "arrow"} size={16} />
                    </Action>
                  </section>
                </aside>
              </div>
            </>
          ) : (
            <BookingConfirmation
              service={service}
              time={selectedTime}
              date={selectedDateLabel}
              company={company}
              recurring={clientSession.recurring}
              signal={signalValue}
              payment={paymentInfo}
              // Nasceu PENDENTE: a tela pede para confirmar a presença até o prazo.
              needsConfirmation={Boolean(createdAppointment?.needsConfirmation)}
              confirmByLabel={createdAppointment?.confirmByLabel ?? ""}
              clientName={clientSession.name}
              clientWhatsapp={clientSession.whatsapp}
              onBack={() => {
                setTab("home")
                setConfirmed(false)
                setDepositStep(false)
              }}
            />
          )}
          <footer className="booking-footer pf-footer">
            <p>
              © {new Date().getFullYear()} Prontto. Todos os direitos
              reservados.
            </p>
            <nav aria-label="Links institucionais da agenda">
              <a href="#termos">Termos de Uso</a>
              <span aria-hidden="true">·</span>
              <a href="#privacidade">Política de Privacidade</a>
            </nav>
          </footer>
        </main>
      )}

      {/* ===== MEU PERFIL ===== */}
      {/* ===== ABA PERFIL (não existe no modo de visualização da gestora) ===== */}
      {!preview && !guest && tab === "profile" && (
        <main className="pf-page">
          <section className="pf-hero">
            <div className="pf-hero-inner">
              <div className="pf-greeting">
                <div className="pf-avatar">{clientSession.name[0]}</div>
                <div>
                  <span className="pf-kicker">MINHA CONTA</span>
                  <h1>Olá, {clientSession.name.split(" ")[0]}</h1>
                  <span className="pf-sub">
                    <Icon name="sparkle" size={14} /> Cliente da {company.name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="pf-edit-profile"
                onClick={openProfileEditor}
              >
                <Icon name="user" size={16} /> Editar dados pessoais
              </button>
            </div>
          </section>

          <div className="pf-container">
            {/* LEMBRETE: agendamentos que a cliente ainda precisa confirmar
                (todos nascem pendentes). Sem confirmação até 24h antes, o sistema cancela. */}
            {pendingConfirmation.length > 0 && (
              <section
                className="pf-confirm-alert"
                aria-labelledby="pf-confirm-title"
              >
                <h2 id="pf-confirm-title">
                  <Icon name="bell" size={18} /> Confirme sua presença
                </h2>
                <p>
                  Se não confirmar até o prazo, o horário é cancelado
                  automaticamente e liberado para outra cliente. Se você pagou
                  sinal, ele fica retido.
                </p>
                <ul>
                  {pendingConfirmation.map((item) => (
                    <li key={item.id}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.date} às {item.time} · confirme até{" "}
                          {item.confirmByLabel}
                        </small>
                      </span>
                      <Action onClick={() => confirmPresence(item)}>
                        <Icon name="check" size={15} /> Confirmar presença
                      </Action>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className="pf-row">
              <div className="pf-card">
                <h2 className="pf-title">Próximo agendamento</h2>
                {nextAppointment ? (
                  <button
                    type="button"
                    className="pf-next"
                    onClick={() => setSelectedAppointment(nextAppointment)}
                  >
                    <div className="pf-date">
                      <span>{nextAppointment.weekday}</span>
                      <strong>{nextAppointment.date.split(" ")[0]}</strong>
                      <small>
                        {nextAppointment.date
                          .split(" ")[2]
                          .slice(0, 3)
                          .toUpperCase()}
                      </small>
                    </div>
                    <div className="pf-next-info">
                      <strong>{nextAppointment.name}</strong>
                      <small>
                        {nextAppointment.time} ·{" "}
                        {formatDuration(nextAppointment.duration)}
                      </small>
                      <small>{company.name}</small>
                    </div>
                    <Icon name="chevron" />
                  </button>
                ) : (
                  <div className="pf-empty">
                    <p>Você não tem agendamentos futuros.</p>
                    <Action onClick={() => goSchedule()}>Agendar agora</Action>
                  </div>
                )}
              </div>

              <div className="pf-card">
                <h2 className="pf-title">Seus benefícios</h2>
                <div className="pf-benefit">
                  {/* Recorrente: benefício já conquistado (✓ verde). Cliente nova:
                      benefício a conquistar (presente), sem parecer concedido. */}
                  <div
                    className={`pf-icon-box ${clientSession.recurring ? "pf-icon-green" : "pf-icon-purple"}`}
                    aria-hidden="true"
                  >
                    <Icon name={clientSession.recurring ? "check" : "gift"} size={22} />
                  </div>
                  {clientSession.recurring ? (
                    <div>
                      <strong>Isenção automática da taxa de sinal</strong>
                      <p>
                        Benefício exclusivo para clientes recorrentes da{" "}
                        {company.name}.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong>Isenção da taxa de sinal</strong>
                      <p>
                        Clientes recorrentes da {company.name} ficam isentas do
                        sinal. Continue agendando para se tornar um cliente
                        recorrente e conquistar esse benefício.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pf-row pf-row-top">
              <div className="pf-card">
                <div className="pf-title-row">
                  <div className="pf-icon-box">
                    <Icon name="calendar" size={20} />
                  </div>
                  <h2 className="pf-title">Seus atendimentos</h2>
                </div>
                <div className="pf-list">
                  {appointments.map((item) => (
                    <button
                      type="button"
                      className="pf-item"
                      key={item.id}
                      onClick={() => setSelectedAppointment(item)}
                    >
                      <div className="pf-icon-box">
                        <Icon name={procedureIcon(item.name)} size={20} />
                      </div>
                      <div className="pf-item-info">
                        <strong>{item.name}</strong>
                        <small>
                          <Icon name="calendar" size={13} /> {item.date} ·{" "}
                          {item.time}
                        </small>
                      </div>
                      <span className={`pf-pill ${badgeClass[item.badge]}`}>
                        {item.badge}
                      </span>
                      <Icon name="chevron" size={16} />
                    </button>
                  ))}
                  {appointments.length === 0 && (
                    <div className="pf-empty">
                      <p>Você ainda não tem atendimentos.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pf-card">
                <div className="pf-title-row">
                  <div className="pf-icon-box">
                    <Icon name="heart" size={20} />
                  </div>
                  <h2 className="pf-title">Ficha de saúde</h2>
                </div>
                <p className="pf-text">
                  Mantenha seus dados sempre atualizados para um atendimento
                  ainda mais seguro e personalizado.
                </p>
                <button
                  type="button"
                  className="pf-health-status"
                  onClick={openHealthEditor}
                >
                  <div className="pf-round-icon">
                    <Icon name="clock" size={18} />
                  </div>
                  <div>
                    <strong>Sua ficha de saúde está atualizada</strong>
                    <small>Última atualização: {healthUpdatedAt}</small>
                  </div>
                  <Icon name="chevron" size={16} />
                </button>
                <button
                  type="button"
                  className="pf-solid-btn"
                  onClick={openHealthEditor}
                >
                  <Icon name="edit" size={16} /> Editar ficha de saúde
                </button>
              </div>
            </div>
          </div>

          {/* Modal: detalhes de um atendimento. */}
          {selectedAppointment && (
            <Modal
              wide
              title="Detalhes do atendimento"
              onClose={() => setSelectedAppointment(null)}
            >
              <div className="pf-receipt">
                <div className="pf-receipt-top">
                  <div className="ca-monogram">
                    {company.logoImage ? (
                      <img src={company.logoImage} alt="" />
                    ) : (
                      company.initials
                    )}
                  </div>
                  <div>
                    <strong>{company.name}</strong>
                    <span>COMPROVANTE DE AGENDAMENTO</span>
                  </div>
                </div>
                <div className="pf-receipt-grid">
                  <span>
                    <small>PROCEDIMENTO</small>
                    <strong>{selectedAppointment.name}</strong>
                  </span>
                  <span>
                    <small>STATUS</small>
                    <strong
                      className={`pf-pill ${badgeClass[selectedAppointment.badge]}`}
                    >
                      {selectedAppointment.badge}
                    </strong>
                  </span>{" "}
                  <span>
                    <small>DATA E HORÁRIO</small>
                    <strong>
                      {selectedAppointment.date} · {selectedAppointment.time}
                    </strong>
                  </span>
                  <span>
                    <small>DURAÇÃO</small>
                    <strong>
                      {formatDuration(selectedAppointment.duration)}
                    </strong>
                  </span>
                  <span>
                    <small>VALOR</small>
                    <strong>{formatPrice(selectedAppointment.price)}</strong>
                  </span>
                </div>
                <div className="pf-receipt-free">
                  <Icon name="check" size={16} />
                  <span>
                    {selectedAppointment.signal ? (
                      <>
                        <strong>
                          Sinal pago: {formatPrice(selectedAppointment.signal)}
                        </strong>
                        <small>Descontado do valor no dia do atendimento</small>
                      </>
                    ) : (
                      <>
                        <strong>Sinal financeiro isento</strong>
                        <small>Benefício de cliente recorrente</small>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="pf-location">
                <div className="pf-location-info">
                  <span className="section-kicker">LOCAL DO ATENDIMENTO</span>
                  <strong>{company.name}</strong>
                  <p>{company.address}</p>
                  <small>Seg–Sáb · 09h às 19h</small>
                  <div className="pf-location-actions">
                    <a href={directionsUrl} target="_blank" rel="noreferrer">
                      <Icon name="arrow" size={13} /> Como chegar{" "}
                      <NewTabHint compact />
                    </a>
                    <button type="button" onClick={copyAddress}>
                      Copiar endereço
                    </button>
                  </div>
                </div>
                <div className="pf-map">
                  <iframe
                    title="Mapa da clínica"
                    src={mapUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {selectedAppointment.status === "Agendado" &&
                (selectedAppointment.refundUntilLabel ? (
                  // Com sinal: prazo exato (backend) para cancelar sem perder o sinal.
                  <div className="cancel-refund-notice is-warning" role="note">
                    <Icon name="clock" size={18} />
                    <p>
                      Se precisar cancelar, faça isso até{" "}
                      <strong>{selectedAppointment.refundUntilLabel}</strong>{" "}
                      (24 horas antes) para poder pedir o reembolso do sinal.
                      Depois desse prazo, o sinal é perdido, exceto em caso de
                      força maior; nesse caso, fale com a clínica.
                    </p>
                  </div>
                ) : (
                  <p className="pf-policy">
                    Cancelamentos e reagendamentos devem ser solicitados com no
                    mínimo 24 horas de antecedência.
                  </p>
                ))}

              {selectedAppointment.needsConfirmation && (
                <p className="pf-policy">
                  Confirme sua presença até {selectedAppointment.confirmByLabel}.
                  Sem confirmação, o horário é cancelado automaticamente.
                </p>
              )}
              {selectedAppointment.rawStatus === "CANCELADO" &&
                selectedAppointment.cancellationReason && (
                  <p className="pf-policy">
                    Motivo do cancelamento: {selectedAppointment.cancellationReason}
                  </p>
                )}

              <div className="modal-actions service-detail-actions">
                {selectedAppointment.needsConfirmation && (
                  <Action onClick={() => confirmPresence(selectedAppointment)}>
                    <Icon name="check" size={15} /> Confirmar presença
                  </Action>
                )}
                {selectedAppointment.status === "Agendado" && (
                  <Action
                    variant="danger"
                    className={loadingCancel ? "disabled" : ""}
                    onClick={() => askCancel(selectedAppointment)}
                  >
                    {loadingCancel ? "Verificando prazo..." : "Cancelar agendamento"}
                  </Action>
                )}
                <span />
                <Action
                  variant="secondary"
                  onClick={() => rebook(selectedAppointment)}
                >
                  {selectedAppointment.status === "Agendado"
                    ? "Reagendar"
                    : "Agendar novamente"}
                </Action>
                <Action
                  onClick={() =>
                    openWhatsApp(
                      `Olá! Sou ${clientSession.name}. Segue o comprovante do meu agendamento: ${selectedAppointment.name} em ${selectedAppointment.date} às ${selectedAppointment.time} na ${company.name}.`,
                      company.phone, // WhatsApp da clínica
                    )
                  }
                >
                  <Icon name="whatsapp" size={15} /> Enviar por WhatsApp{" "}
                  <NewTabHint compact text="abre o WhatsApp em nova guia" />
                </Action>
              </div>
            </Modal>
          )}

          {/* Modal: confirmar a presença (o agendamento só vira "Confirmado" aqui). */}
          {presenceToConfirm && (
            <Modal
              title="Confirmar presença?"
              onClose={() => setPresenceToConfirm(null)}
            >
              <div className="confirmation-content">
                <div className="confirmation-icon success">
                  <Icon name="check" />
                </div>
                <p>
                  Você confirma que vai comparecer ao atendimento de{" "}
                  <strong>{presenceToConfirm.name}</strong> em{" "}
                  {presenceToConfirm.date} às {presenceToConfirm.time}?
                </p>
                <p>
                  Depois de confirmado, o horário fica garantido para você. Se
                  precisar desmarcar, cancele com pelo menos 24 horas de
                  antecedência.
                </p>
              </div>
              <div className="modal-actions">
                <Action
                  variant="secondary"
                  onClick={() => setPresenceToConfirm(null)}
                >
                  Voltar
                </Action>
                <Action
                  className={confirmingPresence ? "disabled" : ""}
                  onClick={sendPresenceConfirmation}
                >
                  {confirmingPresence ? "Confirmando..." : "Sim, confirmar presença"}
                </Action>
              </div>
            </Modal>
          )}

          {/* Modal: confirmar cancelamento. */}
          {cancelling && (
            <Modal
              title="Cancelar agendamento?"
              onClose={closeCancel}
            >
              <div className="confirmation-content">
                <div className="confirmation-icon warning">
                  <Icon name="lock" />
                </div>
                <p>
                  Seu horário de <strong>{cancelling.name}</strong> em{" "}
                  {cancelling.date} às {cancelling.time} será liberado para
                  outras clientes.
                </p>
              </div>
              {/* Aviso do sinal: regra de 24h calculada no backend (prévia). */}
              <CancelRefundNotice
                preview={cancelPreview}
                recurring={Boolean(clientSession.recurring)}
              />
              <div className="modal-actions">
                <Action variant="secondary" onClick={closeCancel}>
                  Manter agendamento
                </Action>
                <Action variant="danger" onClick={confirmCancel}>
                  Sim, cancelar{" "}
                  <NewTabHint compact text="abre o WhatsApp da clínica em nova guia" />
                </Action>
              </div>
            </Modal>
          )}

          {/* Modal: editar ficha de saúde. */}
          {editingHealth && (
            <Modal
              wide
              title="Editar ficha de saúde"
              onClose={() => setEditingHealth(false)}
            >
              <p className="modal-copy">
                Esses são os dados que você preencheu no cadastro. Atualize o
                que mudou e confirme a declaração para salvar. A gestora apenas
                consulta.
              </p>
              <AnamnesisFields
                h={healthDraft}
                errors={healthErrors}
                updateHealth={(key, value) =>
                  setHealthDraft((c) => ({ ...c, [key]: value }))
                }
                defaultName={clientSession.name}
                editing
              />
              <div className="modal-actions">
                <Action
                  variant="secondary"
                  onClick={() => setEditingHealth(false)}
                >
                  Cancelar
                </Action>
                <Action onClick={saveHealth}>Salvar ficha</Action>
              </div>
            </Modal>
          )}

          {/* Modal: editar dados pessoais. */}
          {editingProfile && (
            <Modal
              wide
              title="Editar dados pessoais"
              onClose={() => setEditingProfile(false)}
            >
              <p className="modal-copy">
                Mantenha suas informações atualizadas para facilitar seus
                agendamentos e a comunicação com a clínica.
              </p>

              <div className="ff-grid">
                <Field
                  id="profile-name"
                  label="Nome completo"
                  error={profileErrors.name}
                >
                  <input
                    {...aria("profile-name", profileErrors.name)}
                    autoComplete="name"
                    autoFocus
                    value={profileDraft.name}
                    onChange={setDraftField("name")}
                  />
                </Field>
                <Field
                  id="profile-birth"
                  label="Data de nascimento"
                  error={profileErrors.birthDate}
                  hint={`Cadastro permitido a partir de ${MIN_AGE_CLIENT} anos.`}
                >
                  <input
                    {...aria("profile-birth", profileErrors.birthDate, "x")}
                    type="date"
                    autoComplete="bday"
                    value={profileDraft.birthDate}
                    onChange={setDraftField("birthDate")}
                  />
                </Field>
                <Field
                  id="profile-whatsapp"
                  label="WhatsApp com DDD"
                  error={profileErrors.whatsapp}
                >
                  <input
                    {...aria("profile-whatsapp", profileErrors.whatsapp)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={PLACEHOLDER.phone}
                    value={profileDraft.whatsapp}
                    onChange={(event) =>
                      setProfileDraft((c) => ({
                        ...c,
                        whatsapp: maskPhone(event.target.value),
                      }))
                    }
                  />
                </Field>
                <Field
                  id="profile-email"
                  label="E-mail"
                  error={profileErrors.email}
                >
                  <input
                    {...aria("profile-email", profileErrors.email)}
                    type="email"
                    autoComplete="email"
                    value={profileDraft.email}
                    onChange={setDraftField("email")}
                  />
                </Field>
              </div>

              <div className="pf-danger-zone">
                <div>
                  <strong>Excluir minha conta</strong>
                  <p>
                    Seus dados pessoais serão anonimizados. Registros de
                    atendimento e valores ficam guardados sem identificação pelo
                    prazo legal.
                  </p>
                </div>
                <button
                  type="button"
                  className="pf-danger-btn"
                  onClick={() => setConfirmingAccountDeletion(true)}
                >
                  Excluir conta
                </button>
              </div>

              <div className="modal-actions">
                <Action
                  variant="secondary"
                  onClick={() => setEditingProfile(false)}
                >
                  Cancelar
                </Action>
                <Action onClick={saveProfile}>Salvar alterações</Action>
              </div>
            </Modal>
          )}

          {/* Modal: excluir conta (LGPD). */}
          {confirmingAccountDeletion && (
            <Modal
              title="Excluir minha conta?"
              onClose={() => setConfirmingAccountDeletion(false)}
            >
              <div className="confirmation-content">
                <div className="confirmation-icon warning">
                  <Icon name="lock" />
                </div>
                <p>
                  Seus dados pessoais serão anonimizados e essa ação não pode
                  ser desfeita. Os registros de atendimento e valores continuam
                  guardados, sem identificar você, pelo prazo legal.
                </p>
              </div>
              <div className="modal-actions">
                <Action
                  variant="secondary"
                  onClick={() => setConfirmingAccountDeletion(false)}
                >
                  Cancelar
                </Action>
                <Action
                  variant="danger"
                  onClick={async () => {
                    // Exclusão imediata: o backend anonimiza a conta na hora e
                    // invalida o token. Não existe pedido aguardando a clínica.
                    try {
                      await api.me.deleteAccount()
                    } catch (error) {
                      notify(error.message)
                      return
                    }
                    clearToken()
                    setConfirmingAccountDeletion(false)
                    setEditingProfile(false)
                    setMode("guest")
                    notify(
                      "Sua conta foi excluída e seus dados pessoais foram anonimizados.",
                    )
                  }}
                >
                  Sim, excluir minha conta
                </Action>
              </div>
            </Modal>
          )}

          <footer className="booking-footer pf-footer">
            <p>
              © {new Date().getFullYear()} Prontto. Todos os direitos
              reservados.
            </p>

            <nav aria-label="Links institucionais">
              <a href="#termos">Termos de Uso</a>
              <span aria-hidden="true">·</span>
              <a href="#privacidade">Política de Privacidade</a>
            </nav>
          </footer>
        </main>
      )}

      {/* Menu inferior das abas (celular). A aba Perfil não aparece no modo de visualização. */}
      <nav className="mobile-nav">
        {[
          { key: "home", icon: "home", label: "Início" },
          { key: "services", icon: "sparkle", label: "Catálogo" },
          { key: "schedule", icon: "calendar", label: "Agendar" },
          // Logada: aba Perfil. Visitante: botão Entrar. Gestora (visualização): nada.
          ...(preview
            ? []
            : guest
              ? [{ key: "login", icon: "login", label: "Entrar" }]
              : [{ key: "profile", icon: "user", label: "Perfil" }]),
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => {
              if (item.key === "login") return setMode("login")
              if (item.key === "services") setCategory("")
              setTab(item.key)
            }}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

/**
 * Na área da cliente, carrega perfil, ficha de saúde e agendamentos do backend.
 * No modo de visualização da gestora, usa uma cliente fictícia e não chama a API.
 */
function ClientApp(props) {
  const query = useApiQuery(
    async () => {
      // Busca as três informações ao mesmo tempo (mais rápido que uma de cada vez).
      const [profile, healthRecord, appointments] = await Promise.all([
        api.me.getProfile(),
        api.me.getHealthRecord(),
        api.me.listAppointments(),
      ])
      return { profile, healthRecord, appointments }
    },
    [],
    // live: false = os agendamentos já se atualizam sozinhos dentro da tela.
    { enabled: !props.preview && !props.guest, live: false },
  )
  // Visualização da gestora ou visitante sem login: não chama a API da conta.
  if (props.preview || props.guest)
    return (
      <ClientAppView
        {...props}
        initialProfile={PREVIEW_CLIENT}
        initialHealthRecord={null}
        initialAppointments={[]}
      />
    )
  return (
    <AsyncState query={query} fullPage>
      {({ profile, healthRecord, appointments }) => (
        <ClientAppView
          {...props}
          initialProfile={profile}
          initialHealthRecord={healthRecord}
          initialAppointments={appointments}
        />
      )}
    </AsyncState>
  )
}

export default ClientApp
