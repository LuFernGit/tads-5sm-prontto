import { useEffect, useRef, useState } from "react"
import NewTabHint from "@/components/ui/NewTabHint"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useFieldErrors } from "@/hooks/useFieldErrors"
import Field from "@/components/ui/Field"
import { br, digits } from "@/lib/format"
import { confirmDeadline, fillTemplate, storefrontUrl as buildStorefrontUrl } from "@/lib/messageTemplates"

/* =====================================================================
   CENTRAL DE MENSAGENS WHATSAPP — duas abas com funções separadas:
   1. "Enviar mensagem": escolher modelo → para quem → revisar → abrir o WhatsApp.
      Ajustes no texto valem SÓ para aquela mensagem (o modelo não muda).
   2. "Modelos da clínica": CRUD dos modelos (criar, editar, ativar/desativar,
      excluir, restaurar texto padrão), sempre com confirmação.
   Cancelamentos NÃO são feitos aqui: ficam no Painel (modal com motivo →
   confirma → abre o WhatsApp).
   ===================================================================== */

/** Nome legível de cada finalidade (no banco: MODELO_MENSAGEM.finalidade). */
const FINALIDADE_LABEL = {
  CONFIRMACAO: "Pedido de confirmação",
  LEMBRETE: "Lembrete",
  ALTERACAO: "Alteração de horário",
  REAGENDAMENTO: "Reagendamento",
  MANUTENCAO: "Manutenção da clínica",
  CANCELAMENTO: "Cancelamento",
  PERSONALIZADA: "Personalizada",
}
const FINALIDADES = Object.keys(FINALIDADE_LABEL)

/** Variáveis que o Prontto troca pelos dados reais ao preparar a mensagem. */
const VARIABLES = [
  { key: "nome", label: "Primeiro nome" },
  { key: "nome_cliente", label: "Nome completo" },
  { key: "procedimento", label: "Procedimento" },
  { key: "data", label: "Data" },
  { key: "horario", label: "Horário" },
  { key: "prazo", label: "Prazo para confirmar" },
  { key: "link", label: "Link do site" },
  { key: "motivo", label: "Motivo" },
  { key: "clinica", label: "Nome da clínica" },
]
const MAX_TEXT = 1000

/** O modelo fala de um agendamento específico (data, horário ou procedimento)? */
const needsAppointment = (tpl) =>
  tpl.finalidade !== "MANUTENCAO" &&
  /\{(data|horario|procedimento|servico|prazo)\}/.test(tpl.texto || "")

/** Data de hoje "YYYY-MM-DD" no fuso local. */
const todayIso = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Finalidades que têm modelo padrão do sistema (todas menos a personalizada). */
const DEFAULT_FINALIDADES = FINALIDADES.filter((f) => f !== "PERSONALIZADA")

const EMPTY_FORM = { id: null, nome: "", finalidade: "PERSONALIZADA", texto: "", ativo: true }

function MessagesPageView({
  notify,
  clients = [],
  company,
  initialTemplates,
  appointments = [],
  onTemplatesChange,
}) {
  const [tab, setTab] = useState("send")
  const [templates, setTemplates] = useState(initialTemplates)
  // Avisa o painel quando os modelos mudam: Painel e Agenda passam a usar o
  // texto novo na hora, sem recarregar a página.
  useEffect(() => {
    onTemplatesChange?.(templates)
  }, [templates, onTemplatesChange])
  // Confirmação genérica: { title, message, confirmLabel, cancelLabel, danger, icon, run }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  // Endereço da vitrine da clínica (mesmo link do menu lateral), para {link}.
  const storefrontUrl = buildStorefrontUrl(company)

  /* ---------------- ABA 1: ENVIAR MENSAGEM ---------------- */
  // Cancelamento fica fora: é feito no Painel.
  const sendable = templates.filter((t) => t.ativo && t.finalidade !== "CANCELAMENTO")
  const [tplId, setTplId] = useState(sendable[0]?.id ?? "")
  const tpl = sendable.find((t) => String(t.id) === String(tplId)) || sendable[0]

  // Próximos agendamentos (hoje em diante, não cancelados), do mais próximo ao mais distante.
  // No PEDIDO DE CONFIRMAÇÃO, só entram os agendamentos aguardando confirmação
  // cujo prazo (24h antes) ainda não passou.
  const isConfirmRequest = tpl?.finalidade === "CONFIRMACAO"
  const upcoming = appointments
    .filter((a) => a.status !== "CANCELADO" && (a.dataIso ?? "") >= todayIso())
    .filter(
      (a) =>
        !isConfirmRequest ||
        (a.status === "PENDENTE" &&
          (confirmDeadline(a.dataIso, a.horario)?.date ?? 0) > new Date()),
    )
    .sort((a, b) => `${a.dataIso} ${a.horario}`.localeCompare(`${b.dataIso} ${b.horario}`))
  const [appointmentId, setAppointmentId] = useState(upcoming[0]?.id ?? "")
  const appointment =
    upcoming.find((a) => String(a.id) === String(appointmentId)) || upcoming[0]

  // Clientes únicas (pelo WhatsApp), em ordem alfabética.
  const clientList = [
    ...new Map(
      [
        ...clients.map((c) => ({ nome: c.nome, whatsapp: c.whatsapp })),
        ...appointments.map((a) => ({ nome: a.cliente, whatsapp: a.whatsapp })),
      ]
        .filter((c) => c.nome && c.whatsapp)
        .map((c) => [digits(c.whatsapp), c]),
    ).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  const [clientKey, setClientKey] = useState(digits(clientList[0]?.whatsapp ?? ""))
  const client = clientList.find((c) => digits(c.whatsapp) === clientKey) || clientList[0]
  const [maintenanceDate, setMaintenanceDate] = useState("")

  const byAppointment = tpl ? needsAppointment(tpl) : false
  const recipient = byAppointment
    ? appointment && { nome: appointment.cliente, whatsapp: appointment.whatsapp }
    : client
  const values = {
    nome: recipient?.nome?.split(" ")[0] || "cliente",
    nome_cliente: recipient?.nome || "cliente",
    procedimento: (byAppointment && appointment?.servico) || "seu atendimento",
    servico: (byAppointment && appointment?.servico) || "seu atendimento",
    data:
      tpl?.finalidade === "MANUTENCAO"
        ? maintenanceDate ? br(maintenanceDate) : "[data da manutenção]"
        : (byAppointment && appointment?.data) || "a combinar",
    horario: (byAppointment && appointment?.horario) || "a combinar",
    prazo:
      (byAppointment && appointment && confirmDeadline(appointment.dataIso, appointment.horario)?.label) ||
      "24 horas antes do horário",
    link: storefrontUrl,
    motivo: "[motivo]",
    clinica: company?.name || "",
  }
  const rendered = fillTemplate(tpl?.texto, values)
  // Texto ajustado só para esta mensagem: vale enquanto modelo e destinatária forem os mesmos.
  const draftKey = `${tpl?.id}|${byAppointment ? appointment?.id : client?.whatsapp}|${maintenanceDate}`
  const [edit, setEdit] = useState(null) // { key, text }
  const draft = edit?.key === draftKey ? edit.text : rendered
  const edited = draft !== rendered
  const href = recipient?.whatsapp
    ? `https://wa.me/55${digits(recipient.whatsapp)}?text=${encodeURIComponent(draft)}`
    : undefined

  /* ---------------- ABA 2: MODELOS (CRUD) ---------------- */
  const [form, setForm] = useState(null) // null = modal fechado
  const textRef = useRef(null)
  const { errors, a11y, showErrors, clearError, setErrors } = useFieldErrors(notify)

  const openForm = (item) => {
    setErrors({})
    setForm(item ? { ...item } : { ...EMPTY_FORM })
  }
  const patchForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    clearError(`mg-form-${field}`)
  }
  /** Insere a variável na posição do cursor do texto. */
  const insertVariable = (key) => {
    const el = textRef.current
    const token = `{${key}}`
    const text = form.texto
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = (text.slice(0, start) + token + text.slice(end)).slice(0, MAX_TEXT)
    patchForm("texto", next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  /** Executa a chamada ao backend com aviso de erro e trava contra clique duplo. */
  const run = async (action, success) => {
    setBusy(true)
    try {
      await action()
      notify(success, "success")
      return true
    } catch (error) {
      notify(error.message, "error")
      return false
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const askSave = () => {
    if (
      showErrors({
        "mg-form-nome": !form.nome.trim() && "Informe o nome do modelo. Exemplo: Aviso de feriado.",
        "mg-form-texto":
          !form.texto.trim() && "Escreva o texto da mensagem. Exemplo: Olá, {nome}! Tudo bem?",
      })
    )
      return
    const creating = !form.id
    setConfirm({
      title: creating ? "Criar modelo?" : "Salvar alterações no modelo?",
      message: creating
        ? `O modelo "${form.nome.trim()}" ficará disponível para preparar mensagens.`
        : `O texto de "${form.nome.trim()}" será substituído pelo novo. Mensagens já enviadas não mudam.`,
      cancelLabel: "Não, continuar editando",
      confirmLabel: creating ? "Sim, criar modelo" : "Sim, salvar alterações",
      icon: "check",
      run: async () => {
        const payload = {
          nome: form.nome.trim(),
          finalidade: form.finalidade,
          texto: form.texto.trim(),
          ativo: form.ativo,
        }
        const ok = await run(async () => {
          if (creating) {
            const created = await api.messages.createTemplate(payload)
            setTemplates((current) => [...current, created])
          } else {
            const updated = await api.messages.updateTemplate(form.id, payload)
            setTemplates((current) => current.map((t) => (t.id === form.id ? updated : t)))
          }
        }, creating ? "Modelo criado." : "Alterações salvas.")
        if (ok) setForm(null)
      },
    })
  }

  const askRestore = () =>
    setConfirm({
      title: "Restaurar texto padrão?",
      message: `O nome e o texto de "${form.nome}" voltam a ser os originais do sistema. O texto atual será perdido.`,
      cancelLabel: "Não, manter o texto atual",
      confirmLabel: "Sim, restaurar padrão",
      danger: true,
      icon: "lock",
      run: async () => {
        const ok = await run(async () => {
          const restored = await api.messages.restoreTemplate(form.id)
          setTemplates((current) => current.map((t) => (t.id === form.id ? restored : t)))
        }, "Texto padrão restaurado.")
        if (ok) setForm(null)
      },
    })

  const askToggle = (item) =>
    setConfirm({
      title: item.ativo ? "Desativar modelo?" : "Ativar modelo?",
      message: item.ativo
        ? `"${item.nome}" deixará de aparecer em "Enviar mensagem". O texto continua guardado e você pode ativá-lo de novo quando quiser.`
        : `"${item.nome}" voltará a aparecer em "Enviar mensagem".`,
      cancelLabel: item.ativo ? "Não, manter ativo" : "Não, manter inativo",
      confirmLabel: item.ativo ? "Sim, desativar modelo" : "Sim, ativar modelo",
      danger: item.ativo,
      icon: item.ativo ? "lock" : "check",
      run: () =>
        run(async () => {
          const updated = await api.messages.updateTemplate(item.id, { ...item, ativo: !item.ativo })
          setTemplates((current) => current.map((t) => (t.id === item.id ? updated : t)))
        }, item.ativo ? "Modelo desativado." : "Modelo ativado."),
    })

  const askDelete = (item) =>
    setConfirm({
      title: "Excluir modelo?",
      message:
        item.finalidade === "PERSONALIZADA"
          ? `"${item.nome}" será excluído definitivamente. Esta ação não pode ser desfeita.`
          : `"${item.nome}" será excluído. Se precisar dele de novo, use "Adicionar modelos padrão" para recriar o texto original.`,
      cancelLabel: "Não, manter modelo",
      confirmLabel: "Sim, excluir modelo",
      danger: true,
      icon: "x-circle",
      run: () =>
        run(async () => {
          await api.messages.deleteTemplate(item.id)
          setTemplates((current) => current.filter((t) => t.id !== item.id))
        }, "Modelo excluído."),
    })

  const hasDefault = form && form.id && form.finalidade !== "PERSONALIZADA"
  // Tipos padrão que a clínica não tem mais (foram excluídos).
  const missingDefaults = DEFAULT_FINALIDADES.filter(
    (f) => !templates.some((t) => t.finalidade === f),
  )
  const askAddDefaults = () =>
    setConfirm({
      title: "Adicionar modelos padrão?",
      message: `Serão criados os modelos padrão que estão faltando: ${missingDefaults
        .map((f) => FINALIDADE_LABEL[f])
        .join(", ")}. Os modelos atuais não mudam.`,
      cancelLabel: "Não, voltar",
      confirmLabel: "Sim, adicionar modelos",
      icon: "plus",
      run: () =>
        run(async () => {
          const list = await api.messages.addDefaultTemplates()
          setTemplates(list)
        }, "Modelos padrão adicionados."),
    })
  const example = {
    nome: "Jamily",
    nome_cliente: "Jamily Souza",
    procedimento: "Brow Lamination",
    servico: "Brow Lamination",
    data: "17/11/2026",
    horario: "13:00",
    prazo: "16/11 às 13:00",
    link: storefrontUrl,
    motivo: "indisponibilidade da profissional",
    clinica: company?.name || "sua clínica",
  }

  return (
    <section className="af-wrap">
      <div className="ff-card af-card" role="region" aria-labelledby="mg-h1">
        <div className="mg-heading">
          <span className="section-kicker">COMUNICAÇÃO</span>
          <h1 id="mg-h1" className="section-title">
            Central de Mensagens WhatsApp
          </h1>
        </div>
        <p className="ff-copy">
          Prepare mensagens com os dados da cliente já preenchidos e gerencie os
          modelos da clínica. O envio é sempre feito por você, no WhatsApp.
        </p>

        <div className="segmented mg-tabs" role="group" aria-label="Seções da Central de Mensagens">
          <button
            type="button"
            className={tab === "send" ? "selected" : ""}
            aria-pressed={tab === "send"}
            onClick={() => setTab("send")}
          >
            Enviar mensagem
          </button>
          <button
            type="button"
            className={tab === "templates" ? "selected" : ""}
            aria-pressed={tab === "templates"}
            onClick={() => setTab("templates")}
          >
            Modelos da clínica ({templates.length})
          </button>
        </div>

        {/* ================= ABA 1: ENVIAR ================= */}
        {tab === "send" &&
          (!tpl ? (
            <div className="ff-notice">
              <p>
                Nenhum modelo ativo para enviar. Ative ou crie um modelo em{" "}
                <strong>Modelos da clínica</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="ff-notice mg-step">
                <h2>
                  <span className="mg-step-number" aria-hidden="true">1</span> O que você
                  quer enviar?
                </h2>
                <Field id="mg-tpl" label="Modelo de mensagem">
                  <select
                    id="mg-tpl"
                    className="af-select"
                    value={tpl.id}
                    onChange={(e) => setTplId(e.target.value)}
                  >
                    {sendable.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} · {FINALIDADE_LABEL[t.finalidade] ?? t.finalidade}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="ff-small mg-note">
                  <Icon name="calendar-off" size={14} /> Para cancelar um agendamento,
                  use o Painel: lá você informa o motivo, confirma e o WhatsApp já
                  abre com a mensagem de cancelamento.
                </p>
              </div>

              <div className="ff-notice mg-step">
                <h2>
                  <span className="mg-step-number" aria-hidden="true">2</span> Para quem?
                </h2>
                {byAppointment ? (
                  upcoming.length ? (
                    <Field
                      id="mg-appointment"
                      label="Agendamento"
                      hint={
                        isConfirmRequest
                          ? "Só aparecem agendamentos aguardando confirmação, com prazo ainda aberto."
                          : "Este modelo usa data, horário ou procedimento: escolha o agendamento."
                      }
                    >
                      <select
                        id="mg-appointment"
                        className="af-select"
                        aria-describedby="mg-appointment-hint"
                        value={appointment?.id ?? ""}
                        onChange={(e) => setAppointmentId(e.target.value)}
                      >
                        {upcoming.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.cliente} · {a.data} às {a.horario} · {a.servico}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <p className="ff-small">
                      {isConfirmRequest
                        ? "Nenhum agendamento aguardando confirmação dentro do prazo. Clientes novas pagam o sinal e já ficam confirmadas."
                        : "Não há agendamentos futuros para este tipo de mensagem."}
                    </p>
                  )
                ) : clientList.length ? (
                  <div className="ff-grid">
                    <Field id="mg-client" label="Cliente">
                      <select
                        id="mg-client"
                        className="af-select"
                        value={digits(client?.whatsapp ?? "")}
                        onChange={(e) => setClientKey(e.target.value)}
                      >
                        {clientList.map((c) => (
                          <option key={digits(c.whatsapp)} value={digits(c.whatsapp)}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {tpl.finalidade === "MANUTENCAO" && (
                      <Field id="mg-maintenance" label="Data da manutenção">
                        <input
                          id="mg-maintenance"
                          type="date"
                          value={maintenanceDate}
                          onChange={(e) => setMaintenanceDate(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                ) : (
                  <p className="ff-small">Nenhuma cliente com WhatsApp cadastrado ainda.</p>
                )}
              </div>

              <div className="ff-notice mg-step">
                <h2>
                  <span className="mg-step-number" aria-hidden="true">3</span> Revisar e
                  enviar
                </h2>
                <Field
                  id="mg-draft"
                  label="Mensagem"
                  hint="Ajustes aqui valem só para esta mensagem. O modelo da clínica não muda."
                >
                  <textarea
                    id="mg-draft"
                    rows={6}
                    aria-describedby="mg-draft-hint"
                    value={draft}
                    onChange={(e) => setEdit({ key: draftKey, text: e.target.value })}
                  />
                </Field>
                <div className="ff-actions mg-send-actions">
                  {edited ? (
                    <button
                      type="button"
                      className="ff-btn ff-secondary"
                      onClick={() => setEdit(null)}
                    >
                      Desfazer ajustes
                    </button>
                  ) : (
                    <span />
                  )}
                  <a
                    className={`ff-btn ff-primary ff-link-btn ${href ? "" : "is-disabled"}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!href || undefined}
                    title="Abre o WhatsApp em nova guia, com a mensagem pronta para revisar e enviar"
                    onClick={(e) => {
                      if (!href) {
                        e.preventDefault()
                        notify("Escolha uma cliente com WhatsApp cadastrado.", "error")
                      }
                    }}
                  >
                    Abrir no WhatsApp{" "}
                    <NewTabHint compact text="mensagem pronta · abre o WhatsApp em nova guia" />
                  </a>
                </div>
              </div>
            </>
          ))}

        {/* ================= ABA 2: MODELOS (CRUD) ================= */}
        {tab === "templates" && (
          <div className="ff-notice">
            <div className="mg-templates-head">
              <h2>Modelos cadastrados</h2>
              <div className="mg-templates-buttons">
                {missingDefaults.length > 0 && (
                  <Action variant="secondary" onClick={askAddDefaults}>
                    Adicionar modelos padrão ({missingDefaults.length})
                  </Action>
                )}
                <Action onClick={() => openForm(null)}>
                  <Icon name="plus" size={15} /> Novo modelo
                </Action>
              </div>
            </div>
            {templates.length === 0 && (
              <p className="ff-small">
                Nenhum modelo cadastrado. Crie um novo ou adicione os modelos padrão.
              </p>
            )}
            <ul className="af-list mg-template-list">
              {templates.map((item) => {
                return (
                  <li key={item.id}>
                    <div className="mg-template-info">
                      <div className="mg-template-title">
                        <strong>{item.nome}</strong>
                        <span className="mg-purpose">
                          {FINALIDADE_LABEL[item.finalidade] ?? item.finalidade}
                        </span>
                        <span className={`af-status ${item.ativo ? "confirmed" : "archived"}`}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="mg-template-text">{item.texto}</p>
                    </div>
                    <div className="mg-template-actions">
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() => openForm(item)}
                        aria-label={`Editar o modelo ${item.nome}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() => askToggle(item)}
                        aria-label={`${item.ativo ? "Desativar" : "Ativar"} o modelo ${item.nome}`}
                      >
                        {item.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-danger"
                        onClick={() => askDelete(item)}
                        aria-label={`Excluir o modelo ${item.nome}`}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Modal: criar / editar modelo */}
      {form && (
        <Modal
          wide
          kicker="MODELO DE MENSAGEM"
          title={form.id ? "Editar modelo" : "Novo modelo"}
          onClose={() => setForm(null)}
        >
          <div className="mg-form">
            <div className="ff-grid">
              <Field id="mg-form-nome" label="Nome do modelo *" error={errors["mg-form-nome"]}>
                <input
                  {...a11y("mg-form-nome")}
                  maxLength={100}
                  value={form.nome}
                  onChange={(e) => patchForm("nome", e.target.value)}
                  placeholder="Ex.: Aviso de feriado"
                />
              </Field>
              <Field id="mg-form-finalidade" label="Finalidade">
                <select
                  id="mg-form-finalidade"
                  className="af-select"
                  value={form.finalidade}
                  onChange={(e) => patchForm("finalidade", e.target.value)}
                >
                  {FINALIDADES.map((f) => (
                    <option key={f} value={f}>
                      {FINALIDADE_LABEL[f]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="mg-form-texto" label="Texto da mensagem *" error={errors["mg-form-texto"]}>
              <textarea
                {...a11y("mg-form-texto")}
                ref={textRef}
                rows={6}
                maxLength={MAX_TEXT}
                value={form.texto}
                onChange={(e) => patchForm("texto", e.target.value)}
                placeholder="Olá, {nome}! ..."
              />
            </Field>
            <small className="mg-count">
              {form.texto.length}/{MAX_TEXT}
            </small>
            <div className="mg-vars" role="group" aria-labelledby="mg-vars-label">
              <span id="mg-vars-label">Inserir dado automático:</span>
              {VARIABLES.map((v) => (
                <button
                  type="button"
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  title={`Insere {${v.key}} no texto`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="mg-preview" aria-live="polite">
              <strong>Prévia com dados de exemplo</strong>
              <p>{fillTemplate(form.texto, example) || "A prévia aparece aqui."}</p>
            </div>
          </div>
          <div className="modal-actions">
            {hasDefault && (
              <Action variant="secondary" onClick={askRestore}>
                Restaurar texto padrão
              </Action>
            )}
            <Action variant="secondary" onClick={() => setForm(null)}>
              Sair sem salvar
            </Action>
            <Action onClick={askSave}>{form.id ? "Salvar alterações" : "Criar modelo"}</Action>
          </div>
        </Modal>
      )}

      {/* Modal de confirmação (toda ação que muda dados passa por aqui) */}
      {confirm && (
        <Modal kicker="MENSAGENS" title={confirm.title} onClose={() => !busy && setConfirm(null)}>
          <div className="confirmation-content">
            <div className={`confirmation-icon ${confirm.danger ? "warning" : "success"}`}>
              <Icon name={confirm.icon} />
            </div>
            <p>{confirm.message}</p>
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setConfirm(null)}>
              {confirm.cancelLabel}
            </Action>
            <Action
              variant={confirm.danger ? "danger" : "primary"}
              className={busy ? "disabled" : ""}
              onClick={() => !busy && confirm.run()}
            >
              {busy ? "Salvando…" : confirm.confirmLabel}
            </Action>
          </div>
        </Modal>
      )}
    </section>
  )
}

/** Carrega modelos e destinatárias do backend (GET /gestora/mensagens/...). */
// Busca os dados e, quando chegarem, mostra o MessagesPageView (mesmo padrão das outras páginas).
function MessagesPage(props) {
  const query = useApiQuery(
    async () => {
      const [templates, recipients] = await Promise.all([
        api.messages.listTemplates(),
        api.messages.listRecipients(),
      ])
      return { templates, recipients }
    },
    [],
  )
  return (
    <AsyncState query={query}>
      {({ templates, recipients }) => (
        <MessagesPageView
          {...props}
          initialTemplates={templates}
          clients={recipients}
        />
      )}
    </AsyncState>
  )
}

export default MessagesPage
