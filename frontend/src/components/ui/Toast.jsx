import { useEffect } from "react"
import Icon from "./Icon"
import "./Toast.css"

/**
 * Apresenta uma notificação temporária e solicita seu fechamento após o tempo definido.
 */
function Toast({ message, onClose }) {
  useEffect(() => {
    // Fecha sozinho depois de 2,8 segundos. O return cancela o timer se o aviso mudar.
    const timer = window.setTimeout(onClose, 2800)
    return () => window.clearTimeout(timer)
  }, [message, onClose])
  return (
    <div className="toast" role="status">
      <Icon name="check" size={16} />
      {message}
    </div>
  )
}

export default Toast
