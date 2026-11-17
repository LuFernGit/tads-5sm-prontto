import { useState } from "react"
import Icon from "./Icon"
import "./PasswordInput.css"

/**
 * Campo de senha com o botão "olhinho" para mostrar/esconder o que foi digitado.
 * Recebe as mesmas props de um <input> (id, value, onChange, aria-*...).
 *
 * ACESSIBILIDADE: o botão diz o que vai fazer ("Mostrar senha" / "Esconder
 * senha") e aria-pressed indica o estado; tem 40×40px de área de toque.
 * Usado só nos logins: nos cadastros o campo "Confirmar senha" já pega erros
 * de digitação.
 */
function PasswordInput(props) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? "Esconder senha" : "Mostrar senha"}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={18} />
      </button>
    </span>
  )
}

export default PasswordInput
