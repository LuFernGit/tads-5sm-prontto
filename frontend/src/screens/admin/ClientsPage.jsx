import { useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { apptLabel } from "@/constants"
import { useApiQuery } from "@/hooks/useApiQuery"
import { maintenance, waRetorno } from "@/lib/clients"
import { br, daysSince, digits } from "@/lib/format"
import { daysAgoLabel, lastApplication } from "@/lib/clients"
import "./ClientsPage.css"

/** Situação cadastral (USUARIO.status) em texto para a tela. */
const ACCOUNT_STATUS = {
  ATIVO: "Ativa",
  INATIVO: "Inativa",
  ACESSO_RESTRITO: "Acesso restrito",
  EXCLUSAO_SOLICITADA: "Exclusão solicitada",
  ANONIMIZADO_LGPD: "Anonimizada (LGPD)",
}
/** Cor do selo de cada situação do agendamento (mesma lógica do sistema). */
const STATUS_CLASS = {
  CONCLUIDO: "completed",   // azul-marinho (já aconteceu)
  CONFIRMADO: "confirmed",  // verde (vai acontecer)
  PENDENTE: "pending",      // âmbar
  CANCELADO: "cancelled",   // vermelho
  ARQUIVADO: "archived",    // cinza
}

/**
 * Lista clientes, histórico de atendimentos e alertas de manutenção.
 */
function ClientsPageView({ notify, clientList }) {
  const [query, setQuery] = useState("")
  // query = texto da busca; filter = 'todas' | 'manutencao' | 'anonimizadas'; open = cliente aberta no modal.
  const [filter, setFilter] = useState("todas")
  const [open, setOpen] = useState(null)
  // Filtra por nome, e-mail ou WhatsApp e pelo filtro escolhido nos botões.
  const rows = clientList.filter((c) => {
    const q = query.trim().toLowerCase()
    const hit =
      !q ||
      `${c.name} ${c.email}`.toLowerCase().includes(q) ||
      Boolean(digits(q) && digits(c.whatsapp).includes(digits(q)))
    const m = maintenance(c)
    return (
      hit &&
      (filter === "todas" ||
        (filter === "manutencao" && (m.tone === "amber" || m.tone === "red")) ||
        (filter === "anonimizadas" && c.status === "ANONIMIZADO_LGPD"))
    )
  })
  return (
    <section className="page-card">
      <div className="page-card-head">
        <div>
          <span className="section-kicker">RELACIONAMENTO</span>
          <h1 className="section-title">Clientes cadastradas</h1>
          <p>
            Busque por nome, e-mail ou WhatsApp e acompanhe o tempo desde o
            último procedimento.
          </p>
        </div>
      </div>
      <div className="table-toolbar">
        <label htmlFor="cli-buscar-cliente-por-nome" className="search-box">
          <span className="sr-only">
            Buscar cliente por nome, e-mail ou WhatsApp
          </span>
          <Icon name="search" />
          <input id="cli-buscar-cliente-por-nome"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, e-mail ou WhatsApp..."
          />
        </label>
        <label htmlFor="cli-filtrar-clientes" className="af-filter">
          <span className="sr-only">Filtrar clientes</span>
          <select id="cli-filtrar-clientes"
            className="af-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="todas">Todas</option>
            <option value="manutencao">Precisam de manutenção</option>
            <option value="anonimizadas">Anonimizadas (LGPD)</option>
          </select>
        </label>
      </div>
      <div
        className="data-table clients-table"
        role="table"
        aria-label="Clientes"
      >
        <div className="table-row table-header" role="row">
          {/* role='columnheader' / role='cell': o leitor de tela lê como tabela de verdade. */}
          <span role="columnheader">CLIENTE</span>
          <span role="columnheader">ÚLTIMO PROCEDIMENTO</span>
          <span role="columnheader">ÚLTIMO ATENDIMENTO</span>
          <span role="columnheader">MANUTENÇÃO</span>
          <span role="columnheader">AÇÕES</span>
        </div>
        {rows.map((c) => {
          const m = maintenance(c)
          const gone = c.status === "ANONIMIZADO_LGPD"
          return (
            <div
              className={`table-row ${gone ? "removed-client" : ""}`}
              role="row"
              key={c.id}
            >
              <span className="main-cell" role="cell">
                <i className="client-initials">{c.initials}</i>
                <span className="client-name">
                  <strong>{c.name}</strong>
                  <small>
                    {gone
                      ? "Identidade anonimizada"
                      : c.recorrente
                        ? "Cliente recorrente"
                        : "Cliente nova"}
                  </small>
                </span>
              </span>
              <span role="cell">
                <strong className="application-model">{c.model}</strong>
                <small className="application-category">{c.service}</small>
              </span>
              <span className="application-date" role="cell">
                <strong>
                  {gone || !lastApplication(c) ? "—" : br(lastApplication(c).date)}
                </strong>
                <small>{m.days === null ? "" : daysAgoLabel(m.days)}</small>
              </span>
              <span role="cell">
                <span className={`alert-pill ${m.tone}`}>{m.label}</span>
              </span>
              <span className="client-row-actions" role="cell">
                {!gone && (
                  <a
                    className="icon-button whatsapp-icon"
                    href={waRetorno(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Chamar ${c.name} no WhatsApp (abre em nova guia)`}
                    title="Chamar no WhatsApp (abre em nova guia)"
                  >
                    <Icon name="whatsapp" size={16} />
                  </a>
                )}
                <button
                  type="button"
                  className="icon-button details-icon"
                  onClick={() => setOpen(c)}
                  aria-label={`Ver perfil de ${c.name}`}
                >
                  <Icon name="more" size={18} />
                </button>
              </span>
            </div>
          )
        })}
      </div>
      {!rows.length && (
        <div className="empty-state" role="status">
          Nenhuma cliente encontrada. Confira o termo buscado.
        </div>
      )}
      {/* Modal com os detalhes da cliente clicada: histórico e ações. */}
      {open && (
        <Modal
          wide
          kicker="CLIENTE"
          title={open.name}
          onClose={() => setOpen(null)}
        >
          {open.status === "ANONIMIZADO_LGPD" ? (
            <p className="modal-copy">
              Os dados pessoais foram anonimizados a pedido da titular (LGPD,
              art. 18). Os registros de atendimento e valores seguem guardados
              sem identificação pelo prazo legal.
            </p>
          ) : (
            <>
              <div className="modal-details client-details">
                <span>
                  <small>E-MAIL</small>
                  <strong>{open.email}</strong>
                </span>
                <span>
                  <small>WHATSAPP</small>
                  <strong>{open.whatsapp}</strong>
                </span>
                <span>
                  <small>PERFIL</small>
                  <strong>
                    {open.recorrente ? "Recorrente (isenta de sinal)" : "Nova"}
                  </strong>
                </span>
                <span>
                  <small>SITUAÇÃO CADASTRAL</small>
                  <strong>{ACCOUNT_STATUS[open.status] ?? open.status}</strong>
                </span>
              </div>
              <div className="client-history">
                <h3 id="cli-historico">Histórico de agendamentos</h3>
                <ul className="af-list" aria-labelledby="cli-historico">
                  {open.appts.map((a) => (
                    <li key={a.data + a.hora}>
                      <span>
                        {br(a.data)} · {a.hora} · {a.servico}
                      </span>
                      <span className={`af-status ${STATUS_CLASS[a.status] ?? "pending"}`}>
                        {apptLabel[a.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="modal-copy">
                {lastApplication(open)
                  ? `Última aplicação ${daysAgoLabel(daysSince(lastApplication(open).date))} (${br(lastApplication(open).date)}).`
                  : "Ainda não há aplicações realizadas."}{" "}
                A ficha de saúde está na aba Fichas de Saúde.
              </p>
            </>
          )}
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setOpen(null)}>
              Fechar
            </Action>
          </div>
        </Modal>
      )}
    </section>
  )
}

/** Carrega as clientes do backend (GET /gestora/clientes). */
// Busca as clientes e, quando chegarem, mostra o ClientsPageView.
function ClientsPage(props) {
  const query = useApiQuery(() => api.clients.list(), [])
  return (
    <AsyncState query={query}>
      {(clientList) => <ClientsPageView {...props} clientList={clientList} />}
    </AsyncState>
  )
}

export default ClientsPage
