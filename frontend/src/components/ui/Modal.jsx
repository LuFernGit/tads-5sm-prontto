import { useEffect, useRef } from "react"
import Icon from "./Icon"
import "./Modal.css"

// Elementos que podem receber foco pelo teclado (usado para "prender" o Tab no modal).
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
// Pilha de modais abertos: só o de cima responde ao Tab e ao Esc
// (ex.: confirmação aberta por cima dos detalhes do atendimento).
const openModals = []

/**
 * Exibe conteúdo em uma caixa de diálogo com backdrop e fechamento controlado.
 *
 * ACESSIBILIDADE — ordem de foco previsível (WCAG 2.4.3):
 *  - ao abrir, o foco vai para dentro do modal (o leitor de tela anuncia o título);
 *  - enquanto está aberto, o Tab circula só pelos elementos do modal,
 *    sem "escapar" para a página que está atrás;
 *  - a tecla Esc fecha o modal;
 *  - ao fechar, o foco volta para o botão que abriu o modal.
 */
function Modal({ title, children, onClose, wide = false }) {
  const cardRef = useRef(null)
  // Guarda sempre a função de fechar mais recente, sem reiniciar o efeito abaixo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // Quem abriu o modal: guardado na 1ª renderização, antes de o foco entrar no modal.
  // (No modo de desenvolvimento o React roda o efeito duas vezes; ler aqui evita
  // guardar o próprio modal como "abridor".)
  const openerRef = useRef(undefined)
  if (openerRef.current === undefined) openerRef.current = document.activeElement

  useEffect(() => {
    const opener = openerRef.current
    const token = {}
    openModals.push(token)
    cardRef.current?.focus()
    const onKeyDown = (event) => {
      if (openModals[openModals.length - 1] !== token) return // não é o modal do topo
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== "Tab" || !cardRef.current) return
      const items = [...cardRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null, // ignora elementos escondidos
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = cardRef.current.contains(document.activeElement)
      // Shift+Tab no primeiro → vai para o último; Tab no último → volta ao primeiro.
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      openModals.splice(openModals.indexOf(token), 1)
      // Devolve o foco para quem abriu (se ainda estiver na página).
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [])

  // Fundo escuro (modal-backdrop): clicar fora da caixa fecha o modal.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={cardRef}
        className={`modal-card ${wide ? "modal-card-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // tabIndex -1: o modal recebe o foco ao abrir, mas não entra na ordem do Tab.
        tabIndex={-1}
        // Impede que o clique dentro da caixa 'suba' até o fundo e feche o modal.
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="section-kicker">PRONTTO</span>
            <div className="section-title">{title}</div>
          </div>
          {/* Botão de fechar: ícone de X desenhado em SVG (components/ui/Icon.jsx). */}
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
