import { useState } from "react"
import { api } from "@/api"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import AsyncState from "@/components/ui/AsyncState"
import Field from "@/components/ui/Field"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useServerSync } from "@/hooks/useLiveRefresh"
import { br } from "@/lib/format"
import "./DocumentsPage.css"

/** Tipos de documento da clínica (DOCUMENTO_TERMO.tipo_documento). */
const DOC_TYPES = {
  TERMOS_USO: "Termos de uso",
  POLITICA_PRIVACIDADE: "Política de privacidade",
  TERMO_CLINICA: "Termo de consentimento da clínica",
  OUTRO: "Outro documento",
}
const STATUS_LABEL = { PUBLICADO: "Publicado", RASCUNHO: "Rascunho", INATIVO: "Inativo" }
const STATUS_CLASS = { PUBLICADO: "done", RASCUNHO: "pending", INATIVO: "archived" }
const MAX_PDF = 10 * 1024 * 1024
const EMPTY_FORM = { id: null, titulo: "", tipo: "TERMOS_USO", conteudo: "", file: null }

/** Abre o PDF (data URL) numa nova guia. Navegadores bloqueiam data URL direto: usa um Blob. */
function openPdf(dataUrl) {
  const [, base64 = ""] = dataUrl.split(",")
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
  window.open(url, "_blank", "noopener,noreferrer")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/**
 * Documentos e termos (CRUD completo, tudo no backend):
 *  - criar documento da clínica (rascunho), ver, editar (só rascunho) e excluir
 *    (não pode se estiver publicado ou tiver aceites — registro legal, LGPD).
 *    A exclusão é LÓGICA: o documento vai para "Documentos excluídos", continua
 *    salvo com texto e PDF e pode ser restaurado;
 *  - anexar/remover PDF, publicar (a versão anterior fica inativa), nova versão
 *    e inativar. Toda ação passa por confirmação.
 * Documentos do Prontto são só de leitura (dá para ver).
 */
function DocumentsPageView({ notify, initialDocs, initialDeleted }) {
  const [docs, setDocs] = useState(initialDocs)
  // Documentos excluídos (exclusão lógica): continuam salvos e podem ser restaurados.
  const [deleted, setDeleted] = useState(initialDeleted)
  // Ao vivo: mudanças feitas em outra aba/aparelho chegam sem recarregar.
  useServerSync(initialDocs, docs, setDocs)
  useServerSync(initialDeleted, deleted, setDeleted)
  const [showDeleted, setShowDeleted] = useState(false)
  // Confirmação antes de cada ação: { title, message, cancelLabel, confirmLabel, danger, run }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  // Documento aberto em "Ver" (detalhe vindo do backend).
  const [viewing, setViewing] = useState(null)
  // Formulário de criar/editar: null = fechado.
  const [form, setForm] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const ask = (options) => setConfirm(options)
  /** Troca na lista o documento que voltou atualizado do backend. */
  const replaceDoc = (updated) =>
    setDocs((c) => c.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
  /** Executa uma ação no backend e mostra a mensagem de sucesso ou o erro. */
  const run = async (action, success) => {
    setBusy(true)
    try {
      await action()
      if (success) notify(success, "success")
      return true
    } catch (error) {
      notify(error.message, "error")
      return false
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }
  const reloadList = async () => setDocs(await api.documents.list())

  // Ações de cada documento
  const newVersion = (d) =>
    run(async () => {
      const draft = await api.documents.createVersion(d.id)
      setDocs((c) => [...c, draft])
    }, "Nova versão criada como rascunho. Anexe o PDF e publique quando estiver pronta.")
  const publish = (d) =>
    run(
      async () => setDocs(await api.documents.publish(d.id)),
      "Documento publicado. A versão anterior ficou inativa; os aceites dela ficam guardados.",
    )
  const attachFile = (d, file) =>
    run(async () => replaceDoc(await api.documents.uploadFile(d.id, file)), "PDF anexado.")
  const removeFile = (d) =>
    run(async () => replaceDoc(await api.documents.removeFile(d.id)), "PDF removido do rascunho.")
  const deactivate = (d) =>
    run(async () => replaceDoc(await api.documents.deactivate(d.id)), "Documento inativado.")
  const remove = (d) =>
    run(async () => {
      await api.documents.remove(d.id)
      setDocs((c) => c.filter((x) => x.id !== d.id))
      setDeleted((c) => [{ ...d, excluidoEm: new Date().toISOString() }, ...c])
    }, "Documento excluído. Ele continua salvo em “Documentos excluídos” e pode ser restaurado.")
  const restore = (d) =>
    run(async () => {
      const restored = await api.documents.restore(d.id)
      setDeleted((c) => c.filter((x) => x.id !== d.id))
      setDocs((c) => [...c, restored])
    }, "Documento restaurado.")
  const view = async (d) => {
    try {
      setViewing(await api.documents.get(d.id))
    } catch (error) {
      notify(error.message, "error")
    }
  }
  const openEdit = async (d) => {
    try {
      const full = await api.documents.get(d.id)
      setFormErrors({})
      setForm({ id: full.id, titulo: full.titulo, tipo: full.tipo, conteudo: full.conteudo ?? "", file: null })
    } catch (error) {
      notify(error.message, "error")
    }
  }

  /** PDF escolhido: confere tipo e tamanho antes de qualquer envio. */
  const pdfError = (file) =>
    !file
      ? ""
      : file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
        ? "O arquivo precisa ser um PDF."
        : file.size > MAX_PDF
          ? "O PDF tem mais de 10 MB. Reduza o tamanho do arquivo."
          : ""

  const askSaveForm = () => {
    const errors = {}
    if (!form.titulo.trim()) errors.titulo = "Informe o título. Exemplo: Termos de uso da clínica."
    if (!form.id && !form.conteudo.trim() && !form.file)
      errors.conteudo = "Escreva o texto do documento ou anexe um PDF."
    if (pdfError(form.file)) errors.file = pdfError(form.file)
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0], "error")
      return
    }
    const creating = !form.id
    ask({
      title: creating ? "Criar documento?" : "Salvar alterações?",
      message: creating
        ? `"${form.titulo.trim()}" será criado como rascunho. Ele só passa a valer depois de publicado.`
        : `O rascunho "${form.titulo.trim()}" será atualizado.`,
      cancelLabel: "Não, continuar editando",
      confirmLabel: creating ? "Sim, criar rascunho" : "Sim, salvar alterações",
      run: async () => {
        const ok = await run(async () => {
          const payload = { titulo: form.titulo.trim(), tipo: form.tipo, conteudo: form.conteudo }
          const saved = creating
            ? await api.documents.create(payload)
            : await api.documents.update(form.id, payload)
          if (form.file) await api.documents.uploadFile(saved.id, form.file)
          await reloadList()
        }, creating ? "Documento criado como rascunho." : "Rascunho atualizado.")
        if (ok) setForm(null)
      },
    })
  }

  return (
    <section className="af-wrap">
      <div className="ff-card af-card" role="region" aria-labelledby="dc-h1">
        <span className="section-kicker">DOCUMENTAÇÃO</span>
        <div className="dc-head">
          <h1 id="dc-h1" className="section-title">Documentos e termos</h1>
          <Action
            onClick={() => {
              setFormErrors({})
              setForm({ ...EMPTY_FORM })
            }}
          >
            <Icon name="plus" size={15} /> Novo documento
          </Action>
        </div>
        <p className="ff-copy">
          Os documentos do Prontto são só de leitura. Os termos da clínica têm
          versões: ao publicar uma nova, a anterior fica inativa e as clientes
          aceitam de novo.
        </p>
        <ul className="af-list" aria-label="Documentos">
          {docs.length === 0 && <li className="ff-small">Nenhum documento cadastrado.</li>}
          {docs.map((d) => {
            const deletable = !d.plataforma && d.status !== "PUBLICADO" && !d.aceites
            return (
              <li key={d.id} className="af-req">
                <span>
                  <strong>{d.titulo}</strong> · versão {d.versao}
                  <small className="ff-small">
                    {d.plataforma ? "Documento da plataforma" : DOC_TYPES[d.tipo] ?? "Documento da clínica"}{" "}
                    · {d.arquivo ?? "sem PDF anexado"} ·{" "}
                    {d.publicadoEm
                      ? `publicado em ${br(d.publicadoEm.slice(0, 10))}`
                      : "não publicado"}{" "}
                    · {d.aceites} aceite(s)
                  </small>
                  <small className={`af-status ${STATUS_CLASS[d.status] ?? "pending"}`}>
                    {STATUS_LABEL[d.status] ?? d.status}
                  </small>
                </span>
                <span className="af-actions-col">
                  <button
                    type="button"
                    className="ff-btn ff-secondary"
                    onClick={() => view(d)}
                    aria-label={`Ver ${d.titulo}, versão ${d.versao}`}
                  >
                    Ver
                  </button>
                  {!d.plataforma && d.status === "RASCUNHO" && (
                    <>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() => openEdit(d)}
                        aria-label={`Editar ${d.titulo}, versão ${d.versao}`}
                      >
                        Editar
                      </button>
                      <label className="ff-btn ff-secondary af-file" htmlFor={`pdf-${d.id}`}>
                        {d.arquivo ? "Trocar PDF" : "Anexar PDF"}
                        <input
                          id={`pdf-${d.id}`}
                          className="sr-only"
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            e.target.value = "" // permite escolher o mesmo arquivo de novo
                            if (!f) return
                            if (pdfError(f)) {
                              notify(pdfError(f), "error")
                              return
                            }
                            ask({
                              title: "Anexar este PDF?",
                              message: `"${f.name}" será anexado à versão ${d.versao} de "${d.titulo}".`,
                              cancelLabel: "Não, escolher outro",
                              confirmLabel: "Sim, anexar PDF",
                              run: () => attachFile(d, f),
                            })
                          }}
                        />
                      </label>
                      {d.arquivo && (
                        <button
                          type="button"
                          className="ff-btn ff-secondary"
                          onClick={() =>
                            ask({
                              title: "Remover o PDF?",
                              message: `O PDF "${d.arquivo}" será retirado deste rascunho.`,
                              cancelLabel: "Não, manter PDF",
                              confirmLabel: "Sim, remover PDF",
                              danger: true,
                              run: () => removeFile(d),
                            })
                          }
                        >
                          Remover PDF
                        </button>
                      )}
                      <button
                        type="button"
                        className="ff-btn ff-primary"
                        onClick={() =>
                          ask({
                            title: "Publicar esta versão?",
                            message: `A versão ${d.versao} de "${d.titulo}" passa a valer na vitrine. A versão publicada anterior fica inativa e as clientes aceitam a nova.`,
                            cancelLabel: "Não, manter rascunho",
                            confirmLabel: "Sim, publicar",
                            run: () => publish(d),
                          })
                        }
                      >
                        Publicar
                      </button>
                    </>
                  )}
                  {!d.plataforma && d.status === "PUBLICADO" && (
                    <>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() =>
                          ask({
                            title: "Criar nova versão?",
                            message: `Será criado um rascunho da versão seguinte de "${d.titulo}". A versão atual continua publicada até você publicar a nova.`,
                            cancelLabel: "Não, voltar",
                            confirmLabel: "Sim, criar rascunho",
                            run: () => newVersion(d),
                          })
                        }
                      >
                        Nova versão
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() =>
                          ask({
                            title: "Inativar documento?",
                            message: `"${d.titulo}" (versão ${d.versao}) deixa de aparecer na vitrine. Os aceites já registrados ficam guardados.`,
                            cancelLabel: "Não, manter publicado",
                            confirmLabel: "Sim, inativar",
                            danger: true,
                            run: () => deactivate(d),
                          })
                        }
                      >
                        Inativar
                      </button>
                    </>
                  )}
                  {!d.plataforma && d.status !== "PUBLICADO" && (
                    <button
                      type="button"
                      className="ff-btn ff-danger"
                      disabled={!deletable}
                      title={
                        deletable
                          ? "Excluir documento"
                          : "Tem aceites registrados: precisa ser guardado (LGPD). Pode ficar inativo."
                      }
                      onClick={() =>
                        ask({
                          title: "Excluir documento?",
                          message: `"${d.titulo}" (versão ${d.versao}) sai da lista e vai para “Documentos excluídos”. O texto e o PDF ficam salvos e você pode restaurá-lo quando quiser.`,
                          cancelLabel: "Não, manter documento",
                          confirmLabel: "Sim, excluir",
                          danger: true,
                          run: () => remove(d),
                        })
                      }
                    >
                      Excluir
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>

        {/* Documentos excluídos: continuam salvos (texto e PDF) e podem voltar. */}
        <div className="dc-deleted">
          <button
            type="button"
            className="ff-btn ff-secondary"
            aria-expanded={showDeleted}
            aria-controls="dc-deleted-list"
            onClick={() => setShowDeleted((v) => !v)}
          >
            <Icon name={showDeleted ? "close" : "eye"} size={15} />{" "}
            {showDeleted ? "Ocultar documentos excluídos" : `Ver documentos excluídos (${deleted.length})`}
          </button>
          {showDeleted && (
            <ul id="dc-deleted-list" className="af-list" aria-label="Documentos excluídos">
              {deleted.length === 0 && (
                <li className="ff-small">Nenhum documento excluído.</li>
              )}
              {deleted.map((d) => (
                <li key={d.id} className="af-req">
                  <span>
                    <strong>{d.titulo}</strong> · versão {d.versao}
                    <small className="ff-small">
                      {DOC_TYPES[d.tipo] ?? "Documento da clínica"} · {d.arquivo ?? "sem PDF anexado"} ·
                      excluído em {d.excluidoEm ? br(d.excluidoEm.slice(0, 10)) : "—"}
                    </small>
                    <small className="af-status archived">Excluído</small>
                  </span>
                  <span className="af-actions-col">
                    <button
                      type="button"
                      className="ff-btn ff-secondary"
                      onClick={() => view(d)}
                      aria-label={`Ver ${d.titulo}, versão ${d.versao} (excluído)`}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      className="ff-btn ff-primary"
                      onClick={() =>
                        ask({
                          title: "Restaurar documento?",
                          message: `"${d.titulo}" (versão ${d.versao}) volta para a lista de documentos como ${(STATUS_LABEL[d.status] ?? d.status).toLowerCase()}, com o texto e o PDF que tinha.`,
                          cancelLabel: "Não, manter excluído",
                          confirmLabel: "Sim, restaurar",
                          run: () => restore(d),
                        })
                      }
                      aria-label={`Restaurar ${d.titulo}, versão ${d.versao}`}
                    >
                      Restaurar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ver documento */}
      {viewing && (
        <Modal
          wide
          kicker={viewing.plataforma ? "DOCUMENTO DO PRONTTO" : DOC_TYPES[viewing.tipo]?.toUpperCase() ?? "DOCUMENTO"}
          title={`${viewing.titulo} · versão ${viewing.versao}`}
          onClose={() => setViewing(null)}
        >
          <p className="ff-small dc-meta">
            {viewing.excluidoEm ? "Excluído (pode ser restaurado) · " : ""}
            {STATUS_LABEL[viewing.status] ?? viewing.status}
            {viewing.publicadoEm ? ` · publicado em ${br(viewing.publicadoEm.slice(0, 10))}` : ""} ·{" "}
            {viewing.aceites} aceite(s)
          </p>
          {viewing.conteudo ? (
            <div className="dc-text">{viewing.conteudo}</div>
          ) : (
            <p className="ff-small">Este documento não tem texto: o conteúdo está no PDF.</p>
          )}
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setViewing(null)}>
              Fechar
            </Action>
            {viewing.arquivoUrl && (
              <Action onClick={() => openPdf(viewing.arquivoUrl)}>
                <Icon name="file-text" size={16} /> Abrir PDF ({viewing.arquivo}) ↗
              </Action>
            )}
          </div>
        </Modal>
      )}

      {/* Criar / editar documento */}
      {form && (
        <Modal
          wide
          kicker="DOCUMENTOS"
          title={form.id ? "Editar rascunho" : "Novo documento"}
          onClose={() => !busy && setForm(null)}
        >
          <div className="dc-form">
            <Field id="dc-titulo" label="Título *" error={formErrors.titulo}>
              <input
                id="dc-titulo"
                maxLength={100}
                value={form.titulo}
                aria-invalid={formErrors.titulo ? true : undefined}
                aria-describedby={formErrors.titulo ? "dc-titulo-error" : undefined}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: Termos de uso da clínica"
              />
            </Field>
            <Field id="dc-tipo" label="Tipo">
              <select
                id="dc-tipo"
                value={form.tipo}
                disabled={Boolean(form.id)}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {Object.entries(DOC_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="dc-conteudo"
              label="Texto do documento"
              hint="Opcional se você anexar o PDF."
              error={formErrors.conteudo}
            >
              <textarea
                id="dc-conteudo"
                rows={8}
                value={form.conteudo}
                aria-invalid={formErrors.conteudo ? true : undefined}
                aria-describedby={
                  formErrors.conteudo ? "dc-conteudo-hint dc-conteudo-error" : "dc-conteudo-hint"
                }
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              />
            </Field>
            <Field
              id="dc-pdf"
              label={form.id ? "Trocar o PDF (opcional)" : "PDF (opcional)"}
              hint="Somente PDF, até 10 MB."
              error={formErrors.file}
            >
              <input
                id="dc-pdf"
                type="file"
                accept="application/pdf"
                aria-describedby={formErrors.file ? "dc-pdf-hint dc-pdf-error" : "dc-pdf-hint"}
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setForm(null)}>
              Sair sem salvar
            </Action>
            <Action onClick={askSaveForm}>{form.id ? "Salvar alterações" : "Criar rascunho"}</Action>
          </div>
        </Modal>
      )}

      {/* Confirmação de toda ação que muda dados */}
      {confirm && (
        <Modal kicker="DOCUMENTOS" title={confirm.title} onClose={() => !busy && setConfirm(null)}>
          <div className="confirmation-content">
            <div className={`confirmation-icon ${confirm.danger ? "warning" : "success"}`}>
              <Icon name={confirm.danger ? "lock" : "check"} />
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

/** Carrega os documentos do backend (GET /gestora/documentos e /gestora/documentos/excluidos). */
// Busca os documentos e, quando chegarem, mostra o DocumentsPageView (mesmo padrão das outras páginas).
function DocumentsPage(props) {
  const query = useApiQuery(
    () => Promise.all([api.documents.list(), api.documents.listDeleted()]),
    [],
  )
  return (
    <AsyncState query={query}>
      {([docs, deleted]) => (
        <DocumentsPageView {...props} initialDocs={docs} initialDeleted={deleted ?? []} />
      )}
    </AsyncState>
  )
}

export default DocumentsPage
