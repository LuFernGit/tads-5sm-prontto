import { useEffect } from "react"
import Icon from "./Icon"
import "./Toast.css"

/**
 * Apresenta uma notificação temporária e solicita seu fechamento após o tempo definido.
 *
 * tone:
 *   "success" → azul-marinho com ✓ (ação concluída)
 *   "error"   → vermelho com ⚠ (validação, alerta ou erro do backend).
 *               Usa role="alert" para o leitor de tela anunciar na hora, e fica
 *               mais tempo na tela, para dar tempo de ler o que corrigir.
 */
function Toast({ message, tone = "success", onClose }) {
  const isError = tone === "error"
  useEffect(() => {
    // Fecha sozinho (2,8 s; erro: 5 s). O return cancela o timer se o aviso mudar.
    const timer = window.setTimeout(onClose, isError ? 5000 : 2800)
    return () => window.clearTimeout(timer)
  }, [message, onClose, isError])
  return (
    <div
      className={`toast ${isError ? "toast-error" : ""}`}
      role={isError ? "alert" : "status"}
    >
      <Icon name={isError ? "x-circle" : "check"} size={16} />
      {message}
    </div>
  )
}

export default Toast
