import { useEffect, useRef, useState } from "react"
import NewTabHint from "@/components/ui/NewTabHint"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import Field from "@/components/ui/Field"
import { daysSince, digits } from "@/lib/format"
import { openWhatsApp } from "@/lib/whatsapp"

/**
 * Gerencia modelos e prepara mensagens de WhatsApp para clientes e agendamentos.
 */
const FALLBACK_TEMPLATE = {
  id: "",
  nome: "",
  finalidade: "",
  ativo: true,
  texto: "",
}

function MessagesPageView({
  notify,
  clients,
  company,
  initialTemplates,
  appointments = [],
  onCancelAppointment,
}) {
  // templates = modelos de mensagem (ex.: lembrete, cancelamento, retorno).
  const [templates, setTemplates] = useState(initialTemplates)
  // MODELO_MENSAGEM.id é numérico no banco: o modelo é localizado pela finalidade.
  const cancellationId = initialTemplates.find(
    (t) => t.finalidade === "CANCELAMENTO",
  )?.id
  // Estados da tela: modelo escolhido, cliente/agendamento escolhido, motivo do
  // cancelamento, criação de modelo novo e data personalizada.
  const [tplId, setTplId] = useState(cancellationId ?? initialTemplates[0]?.id)
  const [clientIdx, setClientIdx] = useState(0)
  const [appointmentId, setAppointmentId] = useState(appointments[0]?.id)
  const [reason, setReason] = useState("")
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [customDate, setCustomDate] = useState("")
  // Valores 'derivados': calculados a cada renderização a partir dos estados acima.
  const tpl =
    templates.find((t) => t.id === tplId) || templates[0] || FALLBACK_TEMPLATE
  const client = clients[Math.min(clientIdx, Math.max(0, clients.length - 1))]
  const appointment =
    appointments.find((item) => item.id === appointmentId) || appointments[0]
  const isCancellation = tpl.finalidade === "CANCELAMENTO"
  // No modelo de cancelamento, os dados vêm do agendamento; nos outros, da cliente escolhida.
  const currentClient =
    isCancellation && appointment
      ? {
          nome: appointment.cliente,
          whatsapp: appointment.whatsapp,
          servico: appointment.servico,
          data: appointment.data,
          horario: appointment.horario,
        }
      : client
  // Valores que substituem as variáveis do modelo: {nome}, {data}, {horario}...
  const values = {
    nome: currentClient?.nome?.split(" ")[0] || "cliente",
    nome_cliente: currentClient?.nome || "cliente",
    procedimento: currentClient?.servico || "seu atendimento",
    servico: currentClient?.servico || "seu atendimento",
    data: customDate || currentClient?.data || "a combinar",
    horario: currentClient?.horario || "a combinar",
    motivo: reason || "indisponibilidade da clínica",
    clinica: company.name,
    dias: client ? String(daysSince(client.ultimo)) : "0",
  }
  // Monta o texto final trocando cada {variavel} pelo valor correspondente.
  const message = Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    tpl?.texto || "",
  )
  // Link do WhatsApp já com o número e a mensagem preenchida.
  const href = currentClient?.whatsapp
    ? `https://wa.me/${digits(currentClient.whatsapp)}?text=${encodeURIComponent(message)}`
    : "#"
  // Grava os modelos no backend (PUT /gestora/mensagens/modelos) pouco depois
  // de cada alteração, para não enviar uma requisição a cada tecla.
  // Não salva na primeira renderização (os modelos acabaram de chegar do backend).
  // Depois, espera 800 ms sem alterações para salvar (técnica chamada 'debounce').
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = window.setTimeout(() => {
      api.messages
        .saveTemplates(templates)
        .catch((error) =>
          notify(`Não foi possível salvar os modelos: ${error.message}`),
        )
    }, 800)
    return () => window.clearTimeout(timer)
  }, [templates, notify])
  /** Cria um modelo personalizado novo e já o seleciona para edição. */
  const addTemplate = () => {
    if (!newName.trim()) {
      notify("Informe um nome para o modelo.")
      return
    }
    const id = `modelo-${Date.now()}`
    const next = {
      id,
      nome: newName.trim(),
      finalidade: "PERSONALIZADA",
      texto: "Olá, {nome}! ",
      ativo: true,
    }
    setTemplates((current) => [...current, next])
    setTplId(id)
    setNewName("")
    setShowCreate(false)
    notify("Modelo criado. Personalize o texto e salve suas alterações.")
  }
  /** Cancela o agendamento escolhido (com motivo) e abre o WhatsApp com a mensagem de cancelamento. */
  const cancelManagerAppointment = async () => {
    if (!appointment || appointment.status === "CANCELADO") {
      notify("Este agendamento já está cancelado.")
      return
    }
    if (!reason.trim()) {
      notify("Informe o motivo do cancelamento antes de continuar.")
      return
    }
    const updated = await onCancelAppointment?.(appointment.id, reason.trim())
    if (!updated) return
    if (cancellationId !== undefined) setTplId(cancellationId)
    const cancellationValues = {
      nome: appointment.cliente.split(" ")[0],
      nome_cliente: appointment.cliente,
      procedimento: appointment.servico,
      servico: appointment.servico,
      data: appointment.data,
      horario: appointment.horario,
      motivo: reason.trim(),
      clinica: company.name,
      dias: "0",
    }
    const cancellationTemplate =
      templates.find(
        (item) => item.finalidade === "CANCELAMENTO" && item.ativo,
      ) ||
      templates.find((item) => item.finalidade === "CANCELAMENTO") ||
      FALLBACK_TEMPLATE
    const cancellationMessage = Object.entries(cancellationValues).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, value),
      cancellationTemplate.texto,
    )
    openWhatsApp(cancellationMessage, appointment.whatsapp)
    notify(
      "Agendamento cancelado. O WhatsApp foi aberto com a mensagem pronta para revisão e envio.",
    )
  }
  return (
    <section className="af-wrap">
      <div className="ff-card af-card" role="region" aria-labelledby="mg-h1">
        <h1 id="mg-h1">Central de Mensagens WhatsApp</h1>
        <p className="ff-copy">
          Personalize os modelos da clínica. O Prontto preenche os dados
          disponíveis e abre o WhatsApp com a mensagem pronta. O envio é sempre
          confirmado manualmente pela gestora.
        </p>

        <div className="ff-notice">
          <h2>Preparar mensagem</h2>
          <div className="ff-grid">
            <Field id="mg-tpl" label="Finalidade / modelo">
              <select
                id="mg-tpl"
                className="af-select"
                value={tplId}
                onChange={(e) => setTplId(e.target.value)}
              >
                {templates
                  .filter((t) => t.ativo)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </select>
            </Field>
            {isCancellation ? (
              <Field id="mg-appointment" label="Agendamento da cliente">
                <select
                  id="mg-appointment"
                  className="af-select"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                >
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.cliente} · {a.data} às {a.horario} · {a.status}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field id="mg-cli" label="Cliente">
                <select
                  id="mg-cli"
                  className="af-select"
                  value={clientIdx}
                  onChange={(e) => setClientIdx(Number(e.target.value))}
                >
                  {clients.map((c, i) => (
                    <option key={c.nome} value={i}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {isCancellation && (
            <div className="ff-grid">
              <Field id="mg-reason" label="Motivo do cancelamento *">
                <input
                  id="mg-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: indisponibilidade profissional"
                />
              </Field>
            </div>
          )}
          {tpl.finalidade === "MANUTENCAO" && (
            <div className="ff-grid">
              <Field id="mg-date" label="Data / período da manutenção">
                <input
                  id="mg-date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  placeholder="Ex.: 10/11/2026"
                />
              </Field>
            </div>
          )}
        </div>

        <div className="ff-grid ff-one">
          <Field id="mg-txt" label="Texto do modelo">
            <textarea
              id="mg-txt"
              rows={6}
              value={tpl?.texto || ""}
              onChange={(e) =>
                setTemplates((current) =>
                  current.map((item) =>
                    item.id === tpl.id
                      ? { ...item, texto: e.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
        </div>
        <div className="ff-notice" aria-live="polite">
          <h2>Prévia da mensagem</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
        </div>
        <p className="ff-small">
          Campos disponíveis: {"{nome}"}, {"{nome_cliente}"}, {"{procedimento}"}
          , {"{data}"}, {"{horario}"}, {"{motivo}"}, {"{clinica}"} e {"{dias}"}.
        </p>
        <div className="ff-actions ff-wrap">
          {isCancellation && (
            <span className="ff-small">
              Para registrar o cancelamento, abra o agendamento diretamente no
              calendário do Painel.
            </span>
          )}
          <a
            className="ff-btn ff-primary ff-link-btn"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!currentClient?.whatsapp) {
                e.preventDefault()
                notify("Cadastre o WhatsApp da cliente antes de continuar.")
              }
            }}
          >
            Abrir no WhatsApp <NewTabHint text="mensagem pronta · abre em nova guia" />
          </a>
          <button
            type="button"
            className="ff-btn ff-secondary"
            onClick={() => setShowCreate((v) => !v)}
          >
            Criar modelo
          </button>
        </div>
        {showCreate && (
          <div className="ff-grid">
            <Field id="mg-new" label="Nome do novo modelo">
              <input
                id="mg-new"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Aviso de feriado"
              />
            </Field>
            <div className="ff-actions">
              <button
                type="button"
                className="ff-btn ff-primary"
                onClick={addTemplate}
              >
                Salvar modelo
              </button>
            </div>
          </div>
        )}
        <div className="ff-notice">
          <h2>Modelos cadastrados</h2>
          <ul className="af-list">
            {templates.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.nome}</strong>
                  <small> · {item.finalidade}</small>
                </span>
                <button
                  type="button"
                  className="ff-btn ff-secondary"
                  onClick={() =>
                    setTemplates((current) =>
                      current.map((t) =>
                        t.id === item.id ? { ...t, ativo: !t.ativo } : t,
                      ),
                    )
                  }
                >
                  {item.ativo ? "Desativar" : "Ativar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
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
