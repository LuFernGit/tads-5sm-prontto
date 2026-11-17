import { documentPdfUrl } from "@/lib/documents"
import "./DocumentView.css"

/**
 * Mostra um documento publicado: o texto (se houver) e/ou o PDF.
 *
 * PDF no computador: aparece dentro da página (visualizador do navegador,
 * com rolagem das páginas e zoom). No celular o Chrome do Android e o Safari
 * não mostram PDF dentro da página, então aparece um botão grande para abrir.
 * Sempre há "Abrir em nova guia" e "Baixar PDF".
 */
function DocumentView({ doc, slug }) {
  if (!doc) return null
  const text = doc.conteudo?.trim()
  const pdf = doc.temPdf && slug ? documentPdfUrl(slug, doc.id) : null
  const fileLabel = doc.nomeArquivo || "documento.pdf"
  return (
    <div className="doc-view">
      {/* O título já aparece no topo (página ou modal): aqui só versão e formato. */}
      <p className="doc-view-meta">
        Versão {doc.versao}
        {pdf ? ` · PDF (${fileLabel})` : ""}
      </p>
      {text && <div className="doc-view-text">{text}</div>}
      {pdf && (
        <>
          {/* Computador: o PDF dentro da página */}
          <iframe className="doc-view-frame" src={pdf} title={`PDF: ${doc.titulo}`} loading="lazy" />
          {/* Celular: botão grande (o PDF abre no leitor do aparelho) */}
          <a className="doc-view-open-mobile" href={pdf} target="_blank" rel="noopener noreferrer">
            Abrir o PDF do documento
            <small>{fileLabel}</small>
            <span className="sr-only"> (abre em nova guia)</span>
          </a>
          <div className="doc-view-actions">
            <a href={pdf} target="_blank" rel="noopener noreferrer">
              Abrir em nova guia <span aria-hidden="true">↗</span>
              <span className="sr-only"> (abre em nova guia)</span>
            </a>
            <a href={documentPdfUrl(slug, doc.id, true)} download={fileLabel}>
              Baixar PDF
            </a>
          </div>
        </>
      )}
      {!text && !pdf && <p className="doc-view-text">Documento sem conteúdo publicado.</p>}
    </div>
  )
}

export default DocumentView
