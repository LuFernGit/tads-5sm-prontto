import "./Modal.css"

/**
 * Exibe conteúdo em uma caixa de diálogo com backdrop e fechamento controlado.
 */
function Modal({ title, children, onClose, wide = false }) {
  // Fundo escuro (modal-backdrop): clicar fora da caixa fecha o modal.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal-card ${wide ? "modal-card-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Impede que o clique dentro da caixa 'suba' até o fundo e feche o modal.
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="section-kicker">PRONTTO</span>
            <div className="section-title">{title}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
