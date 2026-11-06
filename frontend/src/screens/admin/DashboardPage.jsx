import { useState } from "react"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { openWhatsApp } from "@/lib/whatsapp"
import "./DashboardPage.css"

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
function DashboardPageView({ notify, dashboard, reload }) {
  // Dados que vieram do backend (GET /gestora/painel).
  const nextAppointments = dashboard.proximos
  const slots = dashboard.horarios
  const days = dashboard.dias
  const dates = dashboard.datas
  const todayIso = new Date().toLocaleDateString("sv-SE") // YYYY-MM-DD local
  // view = 'Semana' ou 'Mês'; monthOffset = quantos meses avançou/voltou no calendário.
  const [view, setView] = useState("Semana")
  const [monthOffset, setMonthOffset] = useState(0)
  // Estados dos modais: horário clicado, motivo do cancelamento, dia sendo
  // gerenciado e ações esperando confirmação.
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [cancelReason, setCancelReason] = useState("")
  const [confirmSlotCancellation, setConfirmSlotCancellation] = useState(false)
  const [managingDay, setManagingDay] = useState(null)
  const [pendingBlock, setPendingBlock] = useState(null)
  const [pendingCalendarAction, setPendingCalendarAction] = useState(null)
  // Mês mostrado no calendário (base: outubro de 2026; o mês 9 é outubro porque começa em 0).
  const monthDate = new Date(2026, 9 + monthOffset, 1)
  const monthLabel = monthDate
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (letter) => letter.toUpperCase())
  // Qual item da lista 'Próximos atendimentos' está aberto (sanfona).
  const [openNext, setOpenNext] = useState("main")
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
  /** Texto de quanto um bloqueio cobre (para avisar antes de liberar). */
  const blockRange = (slot) =>
    !slot.bloqueio?.inicio
      ? "o dia inteiro"
      : `das ${slot.bloqueio.inicio.slice(0, 5)} às ${slot.bloqueio.fim.slice(0, 5)}`
  /**
   * Clique em um horário da agenda semanal:
   *   ocupado/cancelado → abre os detalhes do atendimento
   *   bloqueado         → pergunta se quer liberar
   *   livre             → pergunta se quer bloquear
   */
  const handleSlot = (slot, dayIndex) => {
    if (slot.status === "busy" || slot.status === "cancelled") {
      setCancelReason("")
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
    // Horário: bloqueio só daquele intervalo. Dia: hora_inicio/hora_fim NULL.
    await run(
      () =>
        api.schedule.createBlock({
          data: dates[dayIndex],
          inicio: slot ? slot.time : null,
          fim: slot ? slot.end : null,
          motivo: slot ? "Horário bloqueado pelo painel" : "Dia bloqueado pelo painel",
        }),
      slot
        ? "Horário bloqueado com sucesso."
        : "Dia bloqueado. Os agendamentos existentes foram preservados.",
    )
  }
  /** Cancela o atendimento selecionado (motivo obrigatório) e abre o WhatsApp para avisar a cliente. */
  const confirmCalendarCancellation = async () => {
    if (!selectedSlot || !cancelReason.trim()) {
      notify("Informe o motivo do cancelamento.")
      return
    }
    const reason = cancelReason.trim()
    const slot = selectedSlot
    const ok = await run(
      () => api.appointments.cancel(slot.agendamentoId, reason),
      "Agendamento cancelado. O WhatsApp foi aberto com a mensagem pronta para revisão e envio.",
    )
    if (!ok) return
    openWhatsApp(
      `Olá, ${slot.client}! Informamos que seu agendamento de ${slot.service}, marcado para ${slot.day} às ${slot.time}, precisou ser cancelado. Motivo: ${reason}. Pedimos desculpas pelo transtorno.`,
      slot.whatsapp,
    )
    setConfirmSlotCancellation(false)
    setSelectedSlot(null)
    setCancelReason("")
  }
  return (
    <>
      {/* Cartões de números no topo (atendimentos, faturamento etc.). */}
      <section className="metrics">
        <div className="metric-card accent">
          <div className="metric-icon rose">
            <Icon name="calendar" />
          </div>
          <div>
            <small>AGENDAMENTOS HOJE</small>
            <strong>06</strong>
            <span>
              <b>+2</b> em relação a ontem
            </span>
          </div>
          <div className="metric-decoration" />
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <Icon name="check" />
          </div>
          <div>
            <small>CONFIRMADOS</small>
            <strong>05</strong>
            <span>83% de confirmação</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon gold">
            <Icon name="clock" />
          </div>
          <div>
            <small>HORÁRIOS LIVRES</small>
            <strong>08</strong>
            <span>Disponíveis esta semana</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon navy">
            <Icon name="users" />
          </div>
          <div>
            <small>TOTAL DE CLIENTES</small>
            <strong>120</strong>
            <span>
              <b>+12%</b> desde abril
            </span>
          </div>
        </div>
      </section>
      {/* Agenda (semana ou mês) à esquerda e próximos atendimentos à direita. */}
      <section className="dashboard-grid">
        <div className="calendar-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">AGENDA INTELIGENTE</span>
              <div className="section-title">{monthLabel}</div>
            </div>
            <div className="calendar-tools">
              <div className="segmented">
                {["Semana", "Mês"].map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setView(v)}
                    className={view === v ? "selected" : ""}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Mês anterior"
                className="circle-control rotate"
                onClick={() => setMonthOffset((value) => value - 1)}
              >
                <Icon name="chevron" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                className="circle-control"
                onClick={() => setMonthOffset((value) => value + 1)}
              >
                <Icon name="chevron" />
              </button>
            </div>
          </div>
          <div className="calendar-legend">
            <span>
              <i className="dot free" />
              Disponível
            </span>
            <span>
              <i className="dot busy" />
              Agendado
            </span>
            <span>
              <i className="dot blocked" />
              Bloqueado
            </span>
            <small>
              <Icon name="lock" size={13} /> Clique em um horário livre para
              bloquear
            </small>
          </div>
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
                    {slots[dayIndex].map((slot, index) => (
                      // O slot contém um botão de WhatsApp no tooltip; por isso,
                      // o contêiner interativo não pode ser outro <button>.
                      <div
                        role="button"
                        tabIndex={0}
                        key={slot.time}
                        onClick={() => handleSlot(slot, dayIndex)}
                        className={`time-slot ${slot.status}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            handleSlot(slot, dayIndex)
                          }
                        }}
                        aria-label={`${days[dayIndex]} ${slot.time}: ${
                          slot.status === "busy"
                            ? "agendado"
                            : slot.status === "cancelled"
                              ? "cancelado"
                              : slot.status === "blocked"
                                ? "bloqueado"
                                : "livre"
                        }`}
                      >
                        <span>{slot.time}</span>
                        {(slot.status === "busy" ||
                          slot.status === "cancelled") && <i />}
                        {slot.status === "busy" && (
                          <div
                            className="slot-tooltip"
                            style={
                              dayIndex === 2 && index === 1
                                ? {
                                    opacity: 1,
                                    visibility: "visible",
                                    transform: "translateY(0)",
                                  }
                                : undefined
                            }
                          >
                            <div className="tooltip-head">
                              <div className="client-avatar">
                                {slot.client?.slice(0, 1)}
                              </div>
                              <div>
                                <strong>{slot.client}</strong>
                                <span>Cliente confirmada</span>
                              </div>
                              <div className="status-dot" />
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
                                {slot.time === "09:00" ? "10:00" : "15:00"}
                              </span>
                              <span className="confirmed">
                                {dayIndex === 2 && index === 1
                                  ? "CONFIRMADO"
                                  : "Confirmado"}
                              </span>
                            </div>
                            <div onClick={(event) => event.stopPropagation()}>
                              <Action
                                onClick={() =>
                                  openWhatsApp(
                                    `Olá, ${slot.client}! Confirmando seu atendimento de ${slot.service} às ${slot.time}.`,
                                  )
                                }
                              >
                                <Icon name="whatsapp" size={15} /> Chamar no
                                WhatsApp
                              </Action>
                            </div>
                          </div>
                        )}
                        {slot.status === "blocked" && (
                          <Icon name="lock" size={12} />
                        )}
                        {slot.status === "cancelled" && (
                          <small>Cancelado</small>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="month-overview">
              {Array.from({ length: 35 }, (_, index) => {
                const day = index + 1
                const hasBooking = [2, 6, 9, 14, 18, 23, 27, 30].includes(day)
                return (
                  <button
                    type="button"
                    key={day}
                    className={hasBooking ? "has-booking" : ""}
                    onClick={() =>
                      notify(
                        hasBooking
                          ? `${day} de ${monthLabel}: há atendimento agendado.`
                          : `${day} de ${monthLabel}: agenda livre.`,
                      )
                    }
                  >
                    <span>{day}</span>
                    {hasBooking && <small>Agendado</small>}
                  </button>
                )
              })}
            </div>
          )}
          <div className="calendar-foot">
            <span>
              <Icon name="sparkle" size={14} /> Dica Prontto: passe o mouse nos
              agendamentos para ver detalhes.
            </span>
            <Action variant="ghost" onClick={() => setView("Mês")}>
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
            <span className="live-dot">EM 25 MIN</span>
          </div>

          <div className="next-profile">
            <div className="large-avatar">J</div>
            <div>
              <strong>Jamily Souza</strong>
              <span>Cliente recorrente</span>
            </div>
            <button
              type="button"
              className={`expand-btn ${openNext === "main" ? "open" : ""}`}
              aria-expanded={openNext === "main"}
              aria-controls="next-main"
              aria-label="Detalhes do atendimento de Jamily Souza"
              onClick={() => toggleNext("main")}
            >
              <Icon name="chevron" />
            </button>
          </div>

          <div
            id="next-main"
            className={`expand-panel ${openNext === "main" ? "open" : ""}`}
          >
            <div>
              <div className="appointment-time">
                <div>
                  <Icon name="clock" />
                  <span>Hoje, 09:00</span>
                </div>
                <small>150 min</small>
              </div>
              <div className="procedure">
                <span>PROCEDIMENTO</span>
                <strong>Lash Design</strong>
                <small>Volume brasileiro</small>
              </div>
              <div className="next-tags">
                <span>
                  <Icon name="check" size={13} /> CONFIRMADO
                </span>
                <span>ISENTA DE SINAL</span>
              </div>
              <Action
                className="full"
                onClick={() =>
                  openWhatsApp(
                    "Olá, Jamily! Seu atendimento está confirmado para hoje às 09:00.",
                  )
                }
              >
                <Icon name="whatsapp" /> Ir para o Whatsapp{" "}
                <small>(abre em nova guia)</small>
              </Action>
            </div>
          </div>

          <div className="mini-list">
            <span className="section-kicker">PRÓXIMOS ATENDIMENTOS</span>
            {nextAppointments.map((item) => {
              const open = openNext === item.id
              return (
                <div className="mini-item" key={item.id}>
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
                          <dt>Horário</dt>
                          <dd>
                            {item.time} — {item.end}
                          </dd>
                        </div>
                        <div>
                          <dt>Procedimento</dt>
                          <dd>{item.detail}</dd>
                        </div>
                        <div>
                          <dt>Situação</dt>
                          <dd>{item.status}</dd>
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
                            `Olá, ${item.name.split(" ")[0]}! Falando sobre seu atendimento de ${item.detail} às ${item.time}.`,
                          )
                        }
                      >
                        <Icon name="whatsapp" size={15} /> Chamar no WhatsApp{" "}
                        <small>(abre em nova guia)</small>
                      </Action>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </section>
      {selectedSlot && (
        <Modal
          title={
            selectedSlot.status === "cancelled"
              ? "Agendamento cancelado"
              : "Detalhes do atendimento"
          }
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
                {selectedSlot.status === "cancelled"
                  ? "Cancelado pela gestora"
                  : "Agendado"}
              </strong>
            </span>
            {selectedSlot.cancelReason && (
              <span>
                <small>MOTIVO</small>
                <strong>{selectedSlot.cancelReason}</strong>
              </span>
            )}
          </div>
          {selectedSlot.status === "busy" && (
            <label className="manager-cancel-reason">
              <span>MOTIVO DO CANCELAMENTO</span>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Ex.: indisponibilidade da profissional"
              />
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
                    if (!cancelReason.trim()) {
                      notify("Informe o motivo do cancelamento.")
                      return
                    }
                    setConfirmSlotCancellation(true)
                  }}
                >
                  <Icon name="x-circle" /> Cancelar agendamento
                </Action>
                <Action
                  onClick={() =>
                    openWhatsApp(
                      `Olá, ${selectedSlot.client}! Falando sobre seu atendimento de ${selectedSlot.service}.`,
                      selectedSlot.whatsapp,
                    )
                  }
                >
                  <Icon name="whatsapp" /> WhatsApp
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
              Voltar
            </Action>
            <Action variant="danger" onClick={confirmCalendarCancellation}>
              Sim, cancelar compromisso
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
                    {slot.status === "busy"
                      ? `${slot.client} · ${slot.service}`
                      : slot.status === "blocked"
                        ? "Bloqueado"
                        : "Disponível"}
                  </small>
                </span>
                {slot.status === "busy" ? (
                  <span className="locked-booking">
                    <Icon name="lock" size={13} />
                    Agendado
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`slot-status-button ${slot.status}`}
                      onClick={() => handleSlot(slot, managingDay)}
                    >
                      {slot.status === "blocked" ? "Liberar" : "Bloquear"}
                    </button>
                  </>
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

/** Carrega a grade semanal e os próximos atendimentos (GET /gestora/painel). */
// Busca o painel e, quando chegar, mostra o DashboardPageView. 'reload' é repassado
// para o painel se atualizar depois de cada ação.
function DashboardPage(props) {
  const query = useApiQuery(() => api.schedule.getDashboard(), [])
  return (
    <AsyncState query={query}>
      {(dashboard) => (
        <DashboardPageView
          {...props}
          dashboard={dashboard}
          reload={query.reload}
        />
      )}
    </AsyncState>
  )
}

export default DashboardPage
