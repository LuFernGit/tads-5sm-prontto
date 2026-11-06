import { useState } from "react"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { br } from "@/lib/format"
import "./DocumentsPage.css"

/**
 * Gerencia versões, anexos e publicação dos documentos legais da clínica.
 */
function DocumentsPageView({ notify, initialDocs }) {
  const [docs, setDocs] = useState(initialDocs)
  /** Troca na lista o documento que voltou atualizado do backend. */
  const replaceDoc = (updated) =>
    setDocs((c) => c.map((d) => (d.id === updated.id ? updated : d)))
  /** Executa uma ação no backend e mostra a mensagem de sucesso ou o erro. Evita repetir try/catch. */
  const run = async (action, success) => {
    try {
      await action()
      if (success) notify(success)
    } catch (error) {
      notify(error.message)
    }
  }
  // Ações de cada documento: criar nova versão (rascunho), publicar, anexar PDF e inativar.
  const newVersion = (d) =>
    run(async () => {
      const draft = await api.documents.createVersion(d.id)
      setDocs((c) => [...c, draft])
      notify(`Versão ${draft.versao} criada como rascunho.`)
    })
  const publish = (d) =>
    run(
      async () => setDocs(await api.documents.publish(d.id)),
      "Documento publicado. As clientes serão solicitadas a aceitar a nova versão; os aceites anteriores ficam guardados.",
    )
  const attachFile = (d, file) =>
    run(
      async () => replaceDoc(await api.documents.uploadFile(d.id, file)),
      "PDF anexado.",
    )
  const deactivate = (d) =>
    run(
      async () => replaceDoc(await api.documents.deactivate(d.id)),
      "Documento inativado.",
    )
  return (
    <section className="af-wrap">
      <div className="ff-card af-card" role="region" aria-labelledby="dc-h1">
        <h1 id="dc-h1">Documentos e termos</h1>
        <p className="ff-copy">
          Os documentos do Prontto são só de leitura. Os termos da clínica têm
          versões: ao publicar uma nova, a anterior fica inativa e as clientes
          aceitam de novo.
        </p>
        <ul className="af-list" aria-label="Documentos">
          {docs.map((d) => (
            <li key={d.id} className="af-req">
              <span>
                <strong>{d.titulo}</strong> · versão {d.versao}
                <small className="ff-small">
                  {d.plataforma
                    ? "Documento da plataforma"
                    : "Documento da clínica"}{" "}
                  · {d.arquivo ?? "sem PDF anexado"} ·{" "}
                  {d.publicadoEm
                    ? `publicado em ${br(d.publicadoEm.slice(0, 10))}`
                    : "não publicado"}{" "}
                  · {d.aceites} aceite(s)
                </small>
                <small
                  className={`af-status ${
                    d.status === "PUBLICADO" ? "done" : "pending"
                  }`}
                >
                  {d.status === "PUBLICADO"
                    ? "Publicado"
                    : d.status === "RASCUNHO"
                      ? "Rascunho"
                      : "Inativo"}
                </small>
              </span>
              {!d.plataforma && (
                <span className="af-actions-col">
                  {d.status === "RASCUNHO" && (
                    <>
                      <label
                        className="ff-btn ff-secondary af-file"
                        htmlFor={`pdf-${d.id}`}
                      >
                        Anexar PDF
                        <input
                          id={`pdf-${d.id}`}
                          className="sr-only"
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) attachFile(d, f)
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="ff-btn ff-primary"
                        onClick={() => publish(d)}
                      >
                        Publicar
                      </button>
                    </>
                  )}
                  {d.status === "PUBLICADO" && (
                    <>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() => newVersion(d)}
                      >
                        Nova versão
                      </button>
                      <button
                        type="button"
                        className="ff-btn ff-secondary"
                        onClick={() => deactivate(d)}
                      >
                        Inativar
                      </button>
                    </>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Carrega os documentos do backend (GET /gestora/documentos). */
// Busca os documentos e, quando chegarem, mostra o DocumentsPageView (mesmo padrão das outras páginas).
function DocumentsPage(props) {
  const query = useApiQuery(() => api.documents.list(), [])
  return (
    <AsyncState query={query}>
      {(docs) => <DocumentsPageView {...props} initialDocs={docs} />}
    </AsyncState>
  )
}

export default DocumentsPage
