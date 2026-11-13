import { useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { anamnesisEntries, toHealthRecord } from "@/lib/anamnesis"
import { emptyAnamnesis } from "@/constants"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { brDateTime } from "@/lib/format"
import "./HealthPage.css"

/* ---------- FICHAS DE SAÚDE — RF39 ----------
   Anamnese somente leitura. A gestora tem várias NOTAS INTERNAS por cliente
   (tabela NOTA_CLIENTE): criar, ver, editar e excluir, sempre com confirmação. */
const NOTE_MAX = 1000

/** Resumo (alergias/observações) de uma versão: o gravado ou, se não houver, calculado das respostas. */
function versionSummary(v) {
  const computed = toHealthRecord({ ...emptyAnamnesis, ...(v.respostas ?? {}) })
  return {
    alergias: v.alergias || computed.alergias,
    observacoes: v.observacoes || computed.observacoes_medicas,
  }
}

/**
 * Histórico da ficha por VERSÕES COMPLETAS (GET /gestora/clientes/{id}/ficha/versoes).
 * Cada vez que a cliente salva a ficha, o backend guarda uma cópia inteira dela;
 * aqui aparece uma linha por versão, com data e hora, e "Ver ficha completa".
 */
function HealthVersions({ clientId, onView }) {
  const query = useApiQuery(() => api.clients.listHealthVersions(clientId), [clientId])
  const versions = query.data ?? []
  return (
    <div className="history" aria-labelledby="versoes-titulo">
      <span className="section-kicker" id="versoes-titulo">
        HISTÓRICO DA FICHA (VERSÕES COMPLETAS)
      </span>
      <p className="ff-small history-help">
        Cada vez que a cliente salva a ficha, uma versão completa é guardada.
        As versões anteriores nunca são alteradas.
      </p>
      {query.loading && !query.data && <p className="ff-small">Carregando versões…</p>}
      {query.error && !query.data && (
        <p className="ff-small">
          {query.error.message}{" "}
          <button type="button" className="ff-btn ff-secondary" onClick={() => query.reload()}>
            Tentar novamente
          </button>
        </p>
      )}
      {query.data && versions.length === 0 && (
        <p className="ff-small">A cliente ainda não preencheu a ficha de saúde.</p>
      )}
      {versions.map((v) => (
        <div key={v.id ?? `v${v.numero}`} className="history-version">
          <i aria-hidden="true">
            <Icon name="file-text" size={14} />
          </i>
          <span>
            <strong>
              Versão {v.numero}
              {v.atual ? " · ficha atual" : ""}
            </strong>
            <small>
              {v.data
                ? `Salva em ${brDateTime(v.data) ?? v.data}`
                : "Versão anterior ao histórico por versões (data não registrada)"}
            </small>
          </span>
          <button
            type="button"
            className="ff-btn ff-secondary"
            onClick={() => onView(v)}
            aria-label={`Ver ficha completa, versão ${v.numero}`}
          >
            Ver ficha completa
          </button>
        </div>
      ))}
    </div>
  )
}
/**
 * Permite consultar fichas de saúde e registrar notas internas da gestora.
 */
function HealthPageView({ notify, clientList }) {
  // Clientes anonimizadas pela LGPD não têm mais ficha para mostrar.
  const list = clientList.filter((c) => c.status !== "ANONIMIZADO_LGPD")
  // sel = id da cliente selecionada (começa pela primeira da lista).
  const [sel, setSel] = useState(list[0]?.id)
  const [query, setQuery] = useState("")
  // Notas internas por cliente: { idCliente: [{ id, texto, criadaEm, atualizadaEm }] }.
  const [notesByClient, setNotesByClient] = useState(
    Object.fromEntries(list.map((c) => [c.id, c.notas ?? []])),
  )
  const [newNote, setNewNote] = useState("")
  const [newNoteError, setNewNoteError] = useState("")
  // Nota em edição: { id, texto } (só uma por vez).
  const [editing, setEditing] = useState(null)
  const [editError, setEditError] = useState("")
  // Confirmação: { title, message, cancelLabel, confirmLabel, danger, run }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  // Versão da ficha aberta em "Ver ficha completa".
  const [viewingVersion, setViewingVersion] = useState(null)
  const c = list.find((x) => x.id === sel) || list[0]
  const notes = notesByClient[c.id] ?? []
  const setNotes = (updater) =>
    setNotesByClient((all) => ({ ...all, [c.id]: updater(all[c.id] ?? []) }))

  /** Executa a ação no backend com aviso de sucesso/erro e fecha a confirmação. */
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
  const askCreate = () => {
    const texto = newNote.trim()
    if (!texto) {
      setNewNoteError("Escreva a nota antes de adicionar. Exemplo: prefere horários pela manhã.")
      return
    }
    setConfirm({
      title: "Adicionar nota?",
      message: "A nota fica visível só para você, na ficha desta cliente.",
      cancelLabel: "Não, continuar escrevendo",
      confirmLabel: "Sim, adicionar nota",
      run: async () => {
        const ok = await run(async () => {
          const created = await api.clients.createNote(c.id, texto)
          setNotes((list) => [created, ...list])
        }, "Nota adicionada.")
        if (ok) setNewNote("")
      },
    })
  }
  const askUpdate = () => {
    const texto = editing.texto.trim()
    if (!texto) {
      setEditError("A nota não pode ficar vazia. Para apagá-la, use Excluir.")
      return
    }
    setConfirm({
      title: "Salvar alterações na nota?",
      message: "O texto anterior será substituído pelo novo.",
      cancelLabel: "Não, continuar editando",
      confirmLabel: "Sim, salvar alterações",
      run: async () => {
        const ok = await run(async () => {
          const updated = await api.clients.updateNote(c.id, editing.id, texto)
          setNotes((list) => list.map((n) => (n.id === updated.id ? updated : n)))
        }, "Nota atualizada.")
        if (ok) setEditing(null)
      },
    })
  }
  const askDelete = (note) =>
    setConfirm({
      title: "Excluir nota?",
      message: "A nota será excluída definitivamente. Esta ação não pode ser desfeita.",
      cancelLabel: "Não, manter nota",
      confirmLabel: "Sim, excluir nota",
      danger: true,
      run: () =>
        run(async () => {
          await api.clients.deleteNote(c.id, note.id)
          setNotes((list) => list.filter((n) => n.id !== note.id))
          if (editing?.id === note.id) setEditing(null)
        }, "Nota excluída."),
    })
  // Lista filtrada pelo texto digitado na busca.
  const visible = list.filter((x) =>
    x.name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <section className="health-layout">
      <div className="client-sidebar page-card">
        <span className="section-kicker">FICHAS DE SAÚDE</span>
        <h1 className="section-title">Clientes</h1>
        <label htmlFor="fic-buscar-cliente" className="search-box">
          <span className="sr-only">Buscar cliente</span>
          <Icon name="search" />
          <input id="fic-buscar-cliente"
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
            onClick={() => {
              setSel(x.id)
              setViewingVersion(null)
              setEditing(null)
              setNewNote("")
              setNewNoteError("")
            }}
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
            <p>
              {brDateTime(c.atualizadaEm)
                ? `Atualizada pela cliente em ${brDateTime(c.atualizadaEm)}`
                : "A cliente ainda não preencheu a ficha de saúde."}
            </p>
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
              vez que ela salva, uma versão completa da ficha fica no histórico
              e o acesso é registrado.
            </small>
          </span>
        </div>
        <div className="manager-observations">
          <span className="section-kicker" id="notas-titulo">
            NOTAS INTERNAS DA GESTORA (uso exclusivo)
          </span>
          {/* Nova nota */}
          <label htmlFor="nova-nota" className="sr-only">
            Nova nota interna
          </label>
          <textarea
            id="nova-nota"
            className="notes-area"
            rows={3}
            maxLength={NOTE_MAX}
            value={newNote}
            aria-invalid={newNoteError ? true : undefined}
            aria-describedby={newNoteError ? "nova-nota-erro" : "nova-nota-ajuda"}
            onChange={(e) => {
              setNewNote(e.target.value)
              setNewNoteError("")
            }}
            placeholder="Escreva uma nova nota. Ex.: prefere horários pela manhã."
          />
          {newNoteError && (
            <small id="nova-nota-erro" className="ff-error" role="alert">
              {newNoteError}
            </small>
          )}
          <div className="settings-save">
            <small id="nova-nota-ajuda">
              {newNote.length}/{NOTE_MAX} · a cliente não vê estas notas.
            </small>
            <Action onClick={askCreate}>
              <Icon name="plus" size={15} /> Adicionar nota
            </Action>
          </div>

          {/* Notas salvas (mais recente primeiro) */}
          {notes.length === 0 ? (
            <p className="ff-small notes-empty">Nenhuma nota ainda para esta cliente.</p>
          ) : (
            <ul className="notes-list" aria-labelledby="notas-titulo">
              {notes.map((note) => (
                <li key={note.id}>
                  {editing?.id === note.id ? (
                    <>
                      <label htmlFor={`nota-${note.id}`} className="sr-only">
                        Editar nota
                      </label>
                      <textarea
                        id={`nota-${note.id}`}
                        className="notes-area"
                        rows={3}
                        maxLength={NOTE_MAX}
                        autoFocus
                        value={editing.texto}
                        aria-invalid={editError ? true : undefined}
                        aria-describedby={editError ? `nota-${note.id}-erro` : undefined}
                        onChange={(e) => {
                          setEditing({ ...editing, texto: e.target.value })
                          setEditError("")
                        }}
                      />
                      {editError && (
                        <small id={`nota-${note.id}-erro`} className="ff-error" role="alert">
                          {editError}
                        </small>
                      )}
                      <div className="notes-actions">
                        <small>{editing.texto.length}/{NOTE_MAX}</small>
                        <Action variant="secondary" onClick={() => setEditing(null)}>
                          Sair sem salvar
                        </Action>
                        <Action onClick={askUpdate}>Salvar alterações</Action>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{note.texto}</p>
                      <div className="notes-actions">
                        <small>
                          Criada em {brDateTime(note.criadaEm)}
                          {note.atualizadaEm && ` · editada em ${brDateTime(note.atualizadaEm)}`}
                        </small>
                        <Action
                          variant="secondary"
                          onClick={() => {
                            setEditError("")
                            setEditing({ id: note.id, texto: note.texto })
                          }}
                        >
                          Editar
                        </Action>
                        <Action variant="danger" onClick={() => askDelete(note)}>
                          Excluir
                        </Action>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <HealthVersions clientId={c.id} onView={setViewingVersion} />
      </div>
      {viewingVersion && (
        <Modal
          wide
          kicker={`FICHA DE SAÚDE · VERSÃO ${viewingVersion.numero}${viewingVersion.atual ? " (ATUAL)" : ""}`}
          title={c.name}
          onClose={() => setViewingVersion(null)}
        >
          <p className="ff-small version-meta">
            {viewingVersion.data
              ? `Salva pela cliente em ${brDateTime(viewingVersion.data) ?? viewingVersion.data}`
              : "Versão anterior ao histórico por versões (data não registrada)"}
            {" · somente consulta"}
          </p>
          <div className="health-cards">
            <div>
              <span>
                <Icon name="heart" /> ALERGIAS
              </span>
              <strong>{versionSummary(viewingVersion).alergias}</strong>
            </div>
            <div>
              <span>
                <Icon name="sparkle" /> OBSERVAÇÕES MÉDICAS
              </span>
              <strong>{versionSummary(viewingVersion).observacoes}</strong>
            </div>
          </div>
          <dl className="version-answers">
            {anamnesisEntries(viewingVersion.respostas).map((e) => (
              <div key={e.key}>
                <dt>{e.label}</dt>
                <dd>{e.value}</dd>
              </div>
            ))}
          </dl>
          <div className="modal-actions">
            <Action onClick={() => setViewingVersion(null)}>Fechar ficha</Action>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal kicker="FICHA DE SAÚDE" title={confirm.title} onClose={() => !busy && setConfirm(null)}>
          <div className="confirmation-content">
            <div className={`confirmation-icon ${confirm.danger ? "warning" : "success"}`}>
              <Icon name={confirm.danger ? "x-circle" : "check"} />
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
