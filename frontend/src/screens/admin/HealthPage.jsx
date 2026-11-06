import { useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { br } from "@/lib/format"
import "./HealthPage.css"

/* ---------- FICHAS DE SAÚDE — RF39 ----------
   Anamnese somente leitura; gestora edita só `notas_gestora` (VARCHAR 500). */
/**
 * Permite consultar fichas de saúde e registrar notas internas da gestora.
 */
function HealthPageView({ notify, clientList }) {
  // Clientes anonimizadas pela LGPD não têm mais ficha para mostrar.
  const list = clientList.filter((c) => c.status !== "ANONIMIZADO_LGPD")
  // sel = id da cliente selecionada (começa pela primeira da lista).
  const [sel, setSel] = useState(list[0]?.id)
  const [query, setQuery] = useState("")
  // Notas internas da gestora, guardadas por id da cliente: { id: 'texto' }.
  const [notes, setNotes] = useState(
    Object.fromEntries(list.map((c) => [c.id, c.notasGestora])),
  )
  const c = list.find((x) => x.id === sel) || list[0]
  // Lista filtrada pelo texto digitado na busca.
  const visible = list.filter((x) =>
    x.name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <section className="health-layout">
      <div className="client-sidebar page-card">
        <span className="section-kicker">FICHAS DE SAÚDE</span>
        <h1 className="section-title">Clientes</h1>
        <label className="search-box">
          <span className="sr-only">Buscar cliente</span>
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente..."
          />
        </label>
        {visible.map((x) => (
          <button
            type="button"
            key={x.id}
            className={`health-client ${x.id === c.id ? "selected" : ""}`}
            aria-pressed={x.id === c.id}
            onClick={() => setSel(x.id)}
          >
            <i className="client-initials">{x.initials}</i>
            <div>
              <strong>{x.name}</strong>
              <small>{x.service}</small>
            </div>
            <Icon name="chevron" />
          </button>
        ))}
      </div>
      <div className="health-record page-card">
        <div className="record-hero">
          <div className="large-avatar">{c.initials[0]}</div>
          <div>
            <span className="section-kicker">FICHA INDIVIDUAL</span>
            <h2 className="section-title">{c.name}</h2>
            <p>Atualizada pela cliente em {br(c.atualizadaEm)}</p>
          </div>
        </div>
        <div className="health-cards">
          <div>
            <span>
              <Icon name="heart" /> ALERGIAS
            </span>
            <strong>{c.alergias}</strong>
          </div>
          <div>
            <span>
              <Icon name="sparkle" /> OBSERVAÇÕES MÉDICAS
            </span>
            <strong>{c.observacoes}</strong>
          </div>
        </div>
        <div className="health-readonly">
          <Icon name="lock" size={14} />
          <span>
            <strong>Respostas da cliente: somente consulta</strong>
            <small>
              Dados de saúde são sensíveis (LGPD). Só a cliente altera; cada
              alteração fica no histórico e o acesso é registrado.
            </small>
          </span>
        </div>
        <div className="manager-observations">
          <label htmlFor="notas-gestora">
            <span className="section-kicker">
              NOTAS INTERNAS DA GESTORA (uso exclusivo)
            </span>
          </label>
          <textarea
            id="notas-gestora"
            className="notes-area"
            rows={4}
            maxLength={500}
            value={notes[c.id] ?? ""}
            onChange={(e) =>
              setNotes((n) => ({ ...n, [c.id]: e.target.value }))
            }
          />
          <div className="settings-save">
            <small>
              {(notes[c.id] ?? "").length}/500 · a cliente não vê estas notas.
            </small>
            <Action
              onClick={async () => {
                try {
                  await api.clients.saveNotes(c.id, notes[c.id] ?? "")
                  notify("Notas internas salvas.")
                } catch (error) {
                  notify(error.message)
                }
              }}
            >
              Salvar notas
            </Action>
          </div>
        </div>
        <div className="history">
          <span className="section-kicker">
            HISTÓRICO DE ALTERAÇÕES DA FICHA
          </span>
          {c.historico.length === 0 && (
            <p className="ff-small">Nenhuma alteração registrada.</p>
          )}
          {c.historico.map((h) => (
            <div key={h.data}>
              <i>
                <Icon name="edit" size={14} />
              </i>
              <span>
                <strong>
                  {h.campo}: “{h.anterior}” → “{h.novo}”
                </strong>
                <small>
                  {br(h.data.slice(0, 10))} {h.data.slice(11)}
                </small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Carrega as fichas do backend (GET /gestora/clientes). */
// PADRÃO usado nas páginas do painel: este componente só busca os dados e o
// AsyncState mostra 'Carregando…' ou erro; quando chegam, abre o HealthPageView.
function HealthPage(props) {
  const query = useApiQuery(() => api.clients.list(), [])
  return (
    <AsyncState query={query}>
      {(clientList) =>
        clientList.some((c) => c.status !== "ANONIMIZADO_LGPD") ? (
          <HealthPageView {...props} clientList={clientList} />
        ) : (
          <section className="page-card">
            <h1 className="section-title">Fichas de saúde</h1>
            <p>Nenhuma cliente cadastrada ainda.</p>
          </section>
        )
      }
    </AsyncState>
  )
}

export default HealthPage
