import { useState } from "react"
import Action from "@/components/ui/Action"
import NewTabHint from "@/components/ui/NewTabHint"
import Field from "@/components/ui/Field"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useServerSync } from "@/hooks/useLiveRefresh"
import { br, formatDuration, formatPrice } from "@/lib/format"
import { ruleError, toHorarioRows } from "@/lib/schedule"
import "./SchedulePage.css"

/** Situações em que o agendamento ainda pode ser cancelado pela gestora. */
const CANCELLABLE = ["PENDENTE", "CONFIRMADO"]

/**
 * Texto e cor do selo de situação de um agendamento na lista da Agenda
 * (mesmas cores do histórico em Clientes: verde, âmbar, vermelho).
 */
function appointmentStatus(a) {
  if (a.status === "CANCELADO") {
    if (a.canceladoPor === "SISTEMA")
      return { label: "Cancelado automaticamente", className: "cancelled" }
    const who = a.canceladoPor === "GESTORA" ? "gestora" : "cliente"
    return { label: `Cancelado pela ${who}`, className: "cancelled" }
  }
  if (a.status === "PENDENTE")
    return { label: "Aguardando confirmação", className: "pending" }
  if (a.status === "CONCLUIDO")
    return { label: "Concluído", className: "completed" }
  return { label: "Confirmado", className: "confirmed" }
}

/**
 * Selo do sinal (política de 24 horas), ao lado do selo de situação. Só existe
 * quando a CLIENTE cancelou um agendamento com sinal registrado; null nos outros.
 *  - 24h ou mais de antecedência → "Cliente aguardando reembolso" (pode pedir reembolso)
 *  - já analisado pela gestora → "Reembolso verificado"
 *  - menos de 24h → "Sinal retido" (só informativo: exceto força maior, quando
 *    a cliente entra em contato com a clínica)
 */
function refundTag(a) {
  if (a.reembolsoStatus === "VERIFICADO")
    return { label: "Reembolso verificado", className: "refund-done" }
  if (a.reembolsoStatus === "A_VERIFICAR")
    return { label: "Cliente aguardando reembolso", className: "refund" }
  if (
    a.status === "CANCELADO" &&
    // Cliente cancelou com menos de 24h, ou o sistema cancelou por falta de
    // confirmação da presença: o sinal fica retido.
    (a.canceladoPor === "CLIENTE" || a.canceladoPor === "SISTEMA") &&
    a.cancelamentoNoPrazo === false &&
    Number(a.valorSinal) > 0
  )
    return { label: "Sinal retido", className: "refund-late" }
  return null
}

/**
 * Configura horários de funcionamento, bloqueios e cancelamentos da agenda.
 */
function SchedulePageView({
  notify,
  booked = [],
  appointments: loadedAppointments = [],
  onCancelAppointment,
  initialRules,
  initialBlocks,
}) {
  // rules = horário de funcionamento de cada dia da semana; errors = erro por dia.
  const [rules, setRules] = useState(initialRules)
  const [errors, setErrors] = useState({})
  // blocks = bloqueios de agenda (folgas, feriados); form = formulário de novo bloqueio.
  const [blocks, setBlocks] = useState(initialBlocks)
  // Ao vivo: bloqueios criados no Painel ou em outra aba aparecem sem recarregar.
  // O horário só é atualizado se a gestora não estiver editando (keepEdits).
  useServerSync(initialBlocks, blocks, setBlocks)
  useServerSync(initialRules, rules, setRules, { keepEdits: true })
  const [form, setForm] = useState({
    data: "",
    inteiro: true,
    inicio: "",
    fim: "",
    motivo: "",
  })
  const [formError, setFormError] = useState("")
  const [warning, setWarning] = useState("")
  // Controle dos modais de confirmação (bloqueio, cancelamento e salvar horários).
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  // Motivo do cancelamento (vai para o backend e para a mensagem da cliente).
  const [cancelReason, setCancelReason] = useState("")
  const [cancelReasonError, setCancelReasonError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const openCancel = (a) => {
    setCancelReason("")
    setCancelReasonError("")
    setAppointmentToCancel(a)
  }
  const confirmCancel = async () => {
    const motivo = cancelReason.trim()
    if (!motivo) {
      setCancelReasonError(
        "Informe o motivo do cancelamento. Ele vai na mensagem para a cliente. Exemplo: indisponibilidade da profissional.",
      )
      return
    }
    setCancelling(true)
    const ok = await onCancelAppointment?.(appointmentToCancel.id, motivo)
    setCancelling(false)
    if (ok) setAppointmentToCancel(null)
  }
  // Agendamento aberto no modal "Detalhes do agendamento".
  const [appointmentDetails, setAppointmentDetails] = useState(null)
  // Confirmação de "Marcar reembolso como verificado" (agendamento) e envio.
  const [refundToVerify, setRefundToVerify] = useState(null)
  const [verifyingRefund, setVerifyingRefund] = useState(false)
  // Agendamentos já marcados aqui como verificados: o selo muda na hora, sem
  // esperar a próxima atualização ao vivo da lista (que vem do painel).
  const [verifiedNow, setVerifiedNow] = useState({})
  // Lista da Agenda: agendamentos mais recentes primeiro (data e hora, do mais
  // novo para o mais antigo). Os dados chegam em ordem crescente do backend.
  const appointments = loadedAppointments
    .map((a) =>
      verifiedNow[a.id] && a.reembolsoStatus === "A_VERIFICAR"
        ? { ...a, reembolsoStatus: "VERIFICADO" }
        : a,
    )
    .sort((a, b) =>
      `${b.dataIso} ${b.horario}`.localeCompare(`${a.dataIso} ${a.horario}`),
    )
  const confirmRefundVerified = async () => {
    if (!refundToVerify || verifyingRefund) return
    setVerifyingRefund(true)
    try {
      await api.appointments.markRefundVerified(refundToVerify.id)
      setVerifiedNow((current) => ({ ...current, [refundToVerify.id]: true }))
      setRefundToVerify(null)
      notify("Reembolso marcado como verificado.", "success")
    } catch (error) {
      notify(error.message, "error")
    } finally {
      setVerifyingRefund(false)
    }
  }
  const [pendingScheduleAction, setPendingScheduleAction] = useState(null)
  /** Altera só alguns campos da regra de um dia. Ex.: patch('SEGUNDA', { ativo: false }). */
  const patch = (dia, p) =>
    setRules((c) => c.map((r) => (r.dia === dia ? { ...r, ...p } : r)))
  /** Valida todos os dias e, se estiver tudo certo, pede confirmação antes de salvar. */
  const saveRules = () => {
    const next = {}
    rules.forEach((r) => {
      const e = ruleError(r)
      if (e) next[r.dia] = e
    })
    setErrors(next)
    if (Object.keys(next).length) {
      notify("Corrija os dias indicados para salvar.")
      return
    }
    const rows = toHorarioRows(rules)
    setPendingScheduleAction({
      title: "Confirmar horários de funcionamento?",
      message:
        "As alterações serão aplicadas à agenda da clínica e influenciarão os horários oferecidos para novos agendamentos.",
      label: "Sim, salvar horários",
      run: async () => {
        try {
          await api.schedule.saveBusinessHours(rules)
          notify(`Horários de funcionamento salvos (${rows.length} faixas).`)
        } catch (error) {
          notify(error.message)
        }
      },
    })
  }
  // Primeiro valida os campos e verifica se já existe algum agendamento no período.
  // Somente depois da confirmação o bloqueio é efetivamente cadastrado.
  const addBlock = () => {
    if (!form.data) {
      setFormError("Escolha a data do bloqueio.")
      return
    }
    if (
      !form.inteiro &&
      (!form.inicio || !form.fim || form.fim <= form.inicio)
    ) {
      setFormError("Informe início e fim, com o fim depois do início.")
      return
    }
    setFormError("")
    const conflicts = booked.filter(
      (b) =>
        b.data === form.data &&
        (form.inteiro || (b.hora >= form.inicio && b.hora < form.fim)),
    )
    // Regra do dicionário de dados: o bloqueio é PERMITIDO mesmo com
    // agendamentos no período. A gestora só é alertada; os agendamentos não
    // são cancelados automaticamente (ela cancela ou remarca depois, se quiser).
    setWarning(
      conflicts.length > 0
        ? `Existem agendamentos neste período: ${conflicts.map((c) => `${c.cliente} às ${c.hora}`).join(", ")}. Eles não serão cancelados automaticamente; fale com as clientes para cancelar ou remarcar, se for o caso.`
        : "",
    )
    setConfirmBlock(true)
  }
  /** A gestora confirmou: cria o bloqueio no backend e limpa o formulário. */
  const confirmAddBlock = async () => {
    try {
      const created = await api.schedule.createBlock({
        data: form.data,
        inicio: form.inteiro ? "" : form.inicio,
        fim: form.inteiro ? "" : form.fim,
        motivo: form.motivo.trim(),
      })
      setBlocks((current) => [...current, created])
      // O backend também devolve os agendamentos que caem no período.
      if (created?.agendamentosNoPeriodo?.length && !warning)
        setWarning(
          `Existem agendamentos neste período: ${created.agendamentosNoPeriodo.map((a) => `${a.cliente} às ${String(a.hora).slice(0, 5)}`).join(", ")}. Eles não foram cancelados.`,
        )
    } catch (error) {
      setConfirmBlock(false)
      notify(error.message)
      return
    }
    setConfirmBlock(false)
    setForm({ data: "", inteiro: true, inicio: "", fim: "", motivo: "" })
    notify(
      warning
        ? "Bloqueio criado. Os agendamentos já marcados no período foram mantidos."
        : "Bloqueio criado. Novos agendamentos nesse período ficam indisponíveis.",
    )
  }
  return (
    <section className="af-wrap">
      <div
        className="ff-card af-card af-blocks-card"
        role="region"
        aria-labelledby="af-h2"
      >
        <div className="af-blocks-heading">
          <div>
            <span className="section-kicker">INDISPONIBILIDADE</span>
            <h1 id="af-h2" className="section-title">
              Bloquear dia ou horário
            </h1>
          </div>
          <span className="af-blocks-icon">
            <Icon name="calendar" size={20} />
          </span>
        </div>
        <p className="ff-copy">
          Use esta opção para fechar a agenda em feriados, cursos, eventos ou
          imprevistos. Esta ação fica no início da página para ser encontrada
          rapidamente. Agendamentos já existentes não são cancelados
          automaticamente.
        </p>
        <div className="ff-grid">
          <Field id="af-bd" label="Data *">
            <input
              id="af-bd"
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </Field>
          <Field id="af-bm" label="Motivo">
            <input
              id="af-bm"
              maxLength={255}
              placeholder="Ex.: Curso, evento, indisponibilidade"
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />
          </Field>
        </div>
        <div className="ff-check">
          <input
            id="af-all"
            type="checkbox"
            checked={form.inteiro}
            onChange={(e) => setForm({ ...form, inteiro: e.target.checked })}
          />
          <label htmlFor="af-all">Bloquear o dia inteiro</label>
        </div>
        {!form.inteiro && (
          <div className="ff-grid">
            <Field id="af-bi" label="Início do bloqueio">
              <input
                id="af-bi"
                type="time"
                value={form.inicio}
                onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              />
            </Field>
            <Field id="af-bf" label="Fim do bloqueio">
              <input
                id="af-bf"
                type="time"
                value={form.fim}
                onChange={(e) => setForm({ ...form, fim: e.target.value })}
              />
            </Field>
          </div>
        )}
        {formError && (
          <small className="ff-error" role="alert">
            {formError}
          </small>
        )}
        <div className="ff-actions">
          <span />
          <button
            type="button"
            className="ff-btn ff-primary"
            onClick={addBlock}
          >
            Adicionar bloqueio
          </button>
        </div>
        {warning && (
          <div className="ff-notice" role="status">
            <p>{warning}</p>
          </div>
        )}
        <ul className="af-list" aria-label="Bloqueios cadastrados">
          {blocks.length === 0 && (
            <li className="ff-small">Nenhum bloqueio cadastrado.</li>
          )}
          {blocks.map((b) => (
            <li key={b.id}>
              <span>
                <strong>{br(b.data)}</strong> ·{" "}
                {b.inicio ? `${b.inicio} às ${b.fim}` : "Dia inteiro"}
                {b.motivo ? ` · ${b.motivo}` : ""}
              </span>
              <button
                type="button"
                className="ff-btn ff-secondary"
                onClick={() =>
                  setPendingScheduleAction({
                    title: "Confirmar remoção do bloqueio?",
                    message: `O bloqueio de ${br(b.data)}${
                      b.inicio
                        ? `, das ${b.inicio} às ${b.fim}`
                        : ", durante o dia inteiro"
                    } será removido e o período poderá voltar a receber agendamentos.`,
                    label: "Sim, remover bloqueio",
                    run: async () => {
                      try {
                        await api.schedule.deleteBlock(b.id)
                      } catch (error) {
                        notify(error.message)
                        return
                      }
                      setBlocks((c) => c.filter((x) => x.id !== b.id))
                      notify(
                        "Bloqueio removido. O horário voltou a ficar disponível.",
                      )
                    },
                  })
                }
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <div className="af-appointments">
          <div className="af-blocks-heading">
            <div>
              <span className="section-kicker">CONSULTA E CANCELAMENTO</span>
              <h2 className="section-title">Agendamentos da clínica</h2>
            </div>
          </div>
          <p className="ff-copy">
            Consulte os horários reservados e cancele diretamente pela agenda
            quando necessário.
          </p>
          {appointments.length === 0 && (
            <p className="ff-small">Nenhum agendamento cadastrado.</p>
          )}
          <ul className="af-list af-appt-list" aria-label="Agendamentos da clínica">
            {appointments.map((a) => {
              const status = appointmentStatus(a)
              const refund = refundTag(a)
              return (
                <li key={a.id} className="af-appt">
                  {/* Data e hora em destaque, à esquerda */}
                  <span className="af-appt-when">
                    <span>
                      <Icon name="calendar" size={14} /> {a.data}
                    </span>
                    <span>
                      <Icon name="clock" size={14} /> {a.horario}
                    </span>
                  </span>
                  {/* Cliente e procedimento, cada um na sua linha */}
                  <span className="af-appt-info">
                    <strong>{a.cliente}</strong>
                    <span>{a.servico}</span>
                  </span>
                  {/* Situação + selo do sinal (quando houver), um embaixo do outro */}
                  <span className="af-appt-tags">
                    <span className={`af-status ${status.className}`}>
                      {status.label}
                    </span>
                    {refund && (
                      <span className={`af-status ${refund.className}`}>
                        {refund.label}
                      </span>
                    )}
                  </span>
                  {/* Um botão só por linha: o cancelamento fica dentro dos detalhes */}
                  <button
                    type="button"
                    className="ff-btn ff-secondary"
                    onClick={() => setAppointmentDetails(a)}
                    aria-label={`Ver detalhes do agendamento de ${a.cliente} em ${a.data} às ${a.horario}`}
                  >
                    Ver detalhes
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="ff-card af-card" role="region" aria-labelledby="af-h1">
        <span className="section-kicker">FUNCIONAMENTO</span>
        <h1 id="af-h1" className="section-title">
          Dias e horários de funcionamento
        </h1>
        <p className="ff-copy">
          Defina o expediente de cada dia e o intervalo de almoço. O sistema só
          oferece horários dentro dessas faixas.
        </p>
        <div
          className="af-table"
          // É um formulário (um bloco por dia), não uma tabela de dados: role='group'.
          role="group"
          aria-label="Horários por dia da semana"
        >
          {rules.map((r) => (
            <div className="af-row" key={r.dia}>
              <div className="ff-check af-day">
                <input
                  id={`af-on-${r.dia}`}
                  type="checkbox"
                  checked={r.ativo}
                  onChange={(e) => patch(r.dia, { ativo: e.target.checked })}
                />
                <label htmlFor={`af-on-${r.dia}`}>{r.label}</label>
              </div>
              {r.ativo ? (
                <div className="af-times">
                  <Field id={`af-i-${r.dia}`} label="Início">
                    <input
                      id={`af-i-${r.dia}`}
                      type="time"
                      value={r.inicio}
                      onChange={(e) => patch(r.dia, { inicio: e.target.value })}
                    />
                  </Field>
                  <Field id={`af-ai-${r.dia}`} label="Almoço de">
                    <input
                      id={`af-ai-${r.dia}`}
                      type="time"
                      value={r.almocoIni}
                      onChange={(e) =>
                        patch(r.dia, { almocoIni: e.target.value })
                      }
                    />
                  </Field>
                  <Field id={`af-af-${r.dia}`} label="Almoço até">
                    <input
                      id={`af-af-${r.dia}`}
                      type="time"
                      value={r.almocoFim}
                      onChange={(e) =>
                        patch(r.dia, { almocoFim: e.target.value })
                      }
                    />
                  </Field>
                  <Field id={`af-f-${r.dia}`} label="Fim">
                    <input
                      id={`af-f-${r.dia}`}
                      type="time"
                      value={r.fim}
                      onChange={(e) => patch(r.dia, { fim: e.target.value })}
                    />
                  </Field>
                </div>
              ) : (
                <span className="ff-small">Fechado</span>
              )}
              {errors[r.dia] && (
                <small className="ff-error" role="alert">
                  {errors[r.dia]}
                </small>
              )}
            </div>
          ))}
        </div>
        <div className="ff-actions">
          <span />
          <button
            type="button"
            className="ff-btn ff-primary"
            onClick={saveRules}
          >
            Salvar horários
          </button>
        </div>
      </div>
      {appointmentDetails && (
        <Modal
          wide
          kicker="AGENDA"
          title="Detalhes do agendamento"
          onClose={() => setAppointmentDetails(null)}
        >
          <div className="modal-details af-appt-details">
            <span>
              <small>CLIENTE</small>
              <strong>{appointmentDetails.cliente}</strong>
            </span>
            <span>
              <small>PROCEDIMENTO</small>
              <strong>{appointmentDetails.servico}</strong>
            </span>
            <span>
              <small>DATA</small>
              <strong>{appointmentDetails.data}</strong>
            </span>
            <span>
              <small>HORÁRIO</small>
              <strong>{appointmentDetails.horario}</strong>
            </span>
            <span>
              <small>DURAÇÃO</small>
              <strong>{formatDuration(appointmentDetails.duracao)}</strong>
            </span>
            <span>
              <small>WHATSAPP</small>
              <strong>{appointmentDetails.whatsapp || "—"}</strong>
            </span>
            <span>
              <small>SITUAÇÃO</small>
              <strong>
                <span
                  className={`af-status ${appointmentStatus(appointmentDetails).className}`}
                >
                  {appointmentStatus(appointmentDetails).label}
                </span>
              </strong>
            </span>
          </div>
          {appointmentDetails.status === "CANCELADO" &&
            appointmentDetails.motivoCancelamento && (
              <div className="service-description">
                <span className="section-kicker">MOTIVO DO CANCELAMENTO</span>
                <p>{appointmentDetails.motivoCancelamento}</p>
              </div>
            )}
          {/* Agendamento ativo com sinal: prazo (backend) para a cliente
              cancelar ainda com direito a pedir o reembolso. */}
          {CANCELLABLE.includes(appointmentDetails.status) &&
            appointmentDetails.reembolsoAteLabel && (
              <div className="service-description af-refund">
                <span className="section-kicker">SINAL E CANCELAMENTO</span>
                <p>
                  Sinal registrado:{" "}
                  <strong>{formatPrice(appointmentDetails.valorSinal)}</strong>.
                  Se a cliente cancelar até{" "}
                  <strong>{appointmentDetails.reembolsoAteLabel}</strong> (24
                  horas antes), ela pode pedir o reembolso do sinal e o caso
                  aparece aqui como “Cliente aguardando reembolso”. Depois desse prazo,
                  o sinal fica retido, exceto em caso de força maior.
                </p>
              </div>
            )}
          {/* Sinal e reembolso (política de 24h): o Prontto não faz estorno,
              só mostra o que a gestora precisa para analisar. */}
          {refundTag(appointmentDetails) && (
            <div className="service-description af-refund">
              <span className="section-kicker">SINAL E REEMBOLSO</span>
              <span className={`af-status ${refundTag(appointmentDetails).className}`}>
                {refundTag(appointmentDetails).label}
              </span>
              <p>
                Sinal registrado neste agendamento:{" "}
                <strong>{formatPrice(appointmentDetails.valorSinal)}</strong>.{" "}
                {appointmentDetails.canceladoPor === "SISTEMA"
                  ? "O agendamento foi cancelado automaticamente porque a cliente não confirmou a presença até 24 horas antes"
                  : "A cliente cancelou"}{" "}
                {appointmentDetails.cancelamentoNoPrazo
                  ? "com 24 horas ou mais de antecedência e pode solicitar o reembolso do sinal."
                  : appointmentDetails.canceladoPor === "SISTEMA"
                    ? "— pela política da clínica, o sinal fica retido, exceto em caso de força maior. Se a cliente entrar em contato alegando força maior, avalie o caso e combine o reembolso diretamente com ela."
                    : "com menos de 24 horas de antecedência: pela política da clínica, o sinal fica retido, exceto em caso de força maior. Se a cliente entrar em contato alegando força maior, avalie o caso e combine o reembolso diretamente com ela."}
              </p>
              <p>
                {appointmentDetails.cancelamentoNoPrazo
                  ? "Confira se o pagamento do sinal foi realmente recebido e, se o reembolso for devido, faça-o diretamente com a cliente. "
                  : ""}
                O Prontto não realiza estornos nem transferências.
              </p>
            </div>
          )}
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setAppointmentDetails(null)}
            >
              Fechar
            </Action>
            {appointmentDetails.reembolsoStatus === "A_VERIFICAR" && (
              <Action
                onClick={() => {
                  setRefundToVerify(appointmentDetails)
                  setAppointmentDetails(null)
                }}
              >
                <Icon name="check" size={15} /> Marcar como verificado
              </Action>
            )}
            {/* Só agendamentos que ainda vão acontecer podem ser cancelados */}
            {CANCELLABLE.includes(appointmentDetails.status) && (
              <Action
                variant="danger"
                onClick={() => {
                  openCancel(appointmentDetails)
                  setAppointmentDetails(null)
                }}
              >
                Cancelar agendamento
              </Action>
            )}
          </div>
        </Modal>
      )}
      {appointmentToCancel && (
        <Modal
          wide
          kicker="AGENDA"
          title="Confirmar cancelamento?"
          onClose={() => setAppointmentToCancel(null)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="lock" />
            </div>
            <p>
              Deseja realmente cancelar o agendamento de{" "}
              <strong>{appointmentToCancel.cliente}</strong>?
            </p>
            <div className="af-confirm-summary">
              <strong>{appointmentToCancel.servico}</strong>
              <span>
                {appointmentToCancel.data} às {appointmentToCancel.horario}
              </span>
            </div>
            <p>
              O horário ficará disponível para novos agendamentos. A cliente
              será avisada por uma mensagem pronta no WhatsApp (modelo
              "Cancelamento" da Central de Mensagens), que poderá ser revisada
              antes do envio.
            </p>
          </div>
          <div className="af-cancel-reason">
            <Field id="af-cancel-reason" label="Motivo do cancelamento *" error={cancelReasonError}>
              <textarea
                id="af-cancel-reason"
                rows={3}
                aria-invalid={cancelReasonError ? true : undefined}
                aria-describedby={cancelReasonError ? "af-cancel-reason-error" : undefined}
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value)
                  setCancelReasonError("")
                }}
                placeholder="Ex.: indisponibilidade da profissional"
              />
            </Field>
          </div>
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setAppointmentToCancel(null)}
            >
              Não, manter agendamento
            </Action>
            <Action
              variant="danger"
              className={cancelling ? "disabled" : ""}
              onClick={() => !cancelling && confirmCancel()}
            >
              {cancelling ? "Cancelando…" : "Sim, cancelar agendamento"}{" "}
              <NewTabHint compact text="abre o WhatsApp em nova guia para avisar a cliente" />
            </Action>
          </div>
        </Modal>
      )}
      {/* Confirmação: marcar o reembolso como verificado (só registra a análise). */}
      {refundToVerify && (
        <Modal
          kicker="AGENDA"
          title="Marcar reembolso como verificado?"
          onClose={() => setRefundToVerify(null)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="check" />
            </div>
            <div className="af-confirm-summary">
              <strong>
                {refundToVerify.cliente} · {refundToVerify.servico}
              </strong>
              <span>
                {refundToVerify.data} às {refundToVerify.horario} · sinal
                registrado de {formatPrice(refundToVerify.valorSinal)}
              </span>
            </div>
            <p>
              Use esta opção depois de conferir o pagamento do sinal e de
              resolver o reembolso com a cliente, se ele for devido. O selo
              passa a mostrar “Reembolso verificado”. Nenhum valor é
              movimentado pelo Prontto.
            </p>
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setRefundToVerify(null)}>
              Voltar
            </Action>
            <Action
              className={verifyingRefund ? "disabled" : ""}
              onClick={confirmRefundVerified}
            >
              {verifyingRefund ? "Salvando…" : "Sim, marcar como verificado"}
            </Action>
          </div>
        </Modal>
      )}
      {pendingScheduleAction && (
        <Modal
          title={pendingScheduleAction.title}
          onClose={() => setPendingScheduleAction(null)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="lock" />
            </div>
            <p>{pendingScheduleAction.message}</p>
            <p>Deseja continuar?</p>
          </div>
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setPendingScheduleAction(null)}
            >
              Voltar
            </Action>
            <Action
              variant="danger"
              onClick={() => {
                const run = pendingScheduleAction.run
                setPendingScheduleAction(null)
                run()
              }}
            >
              {pendingScheduleAction.label}
            </Action>
          </div>
        </Modal>
      )}
      {confirmBlock && (
        <Modal
          title="Confirmar bloqueio da agenda?"
          onClose={() => setConfirmBlock(false)}
        >
          <div className="ff-notice" role="status">
            <p>
              Confira os dados antes de confirmar. Depois disso, novos
              agendamentos não poderão ser feitos neste período.
            </p>
            {warning && (
              <p>
                <strong>Atenção:</strong> {warning}
              </p>
            )}
          </div>
          <div className="af-confirm-summary">
            <strong>{br(form.data)}</strong>
            <span>
              {form.inteiro ? "Dia inteiro" : `${form.inicio} às ${form.fim}`}
            </span>
            {form.motivo.trim() && <small>Motivo: {form.motivo.trim()}</small>}
          </div>
          <p className="ff-copy">Deseja realmente bloquear este período?</p>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setConfirmBlock(false)}>
              Voltar e revisar
            </Action>
            <Action variant="danger" onClick={confirmAddBlock}>
              Confirmar bloqueio
            </Action>
          </div>
        </Modal>
      )}
    </section>
  )
}

/** Carrega horários de funcionamento e bloqueios do backend. */
// Busca os dados e, quando chegarem, mostra o SchedulePageView.
function SchedulePage(props) {
  const query = useApiQuery(
    async () => {
      const [rules, blocks] = await Promise.all([
        api.schedule.getBusinessHours(),
        api.schedule.listBlocks(),
      ])
      return { rules, blocks }
    },
    [],
  )
  return (
    <AsyncState query={query}>
      {({ rules, blocks }) => (
        <SchedulePageView
          {...props}
          initialRules={rules}
          initialBlocks={blocks}
        />
      )}
    </AsyncState>
  )
}

export default SchedulePage
