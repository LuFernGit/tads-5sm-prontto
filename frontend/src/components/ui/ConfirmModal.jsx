import Modal from "./Modal"

/**
 * Especializa o modal base para confirmações sem adicionar elementos ao DOM.
 * Hoje só repassa as props ({...props}) para o Modal; existe para deixar claro,
 * no código das telas, que aquele modal é uma confirmação.
 */
function ConfirmModal(props) {
  return <Modal {...props} />
}

export default ConfirmModal
