import Action from "./Action"
import Icon from "./Icon"
import Modal from "./Modal"

/**
 * Aviso de fim de sessão por inatividade (WCAG 2.2.1 — Tempo ajustável, nível A):
 * aparece no último minuto antes de a sessão encerrar, mostra a contagem
 * regressiva e deixa a pessoa continuar com um único clique.
 *
 *  - secondsLeft  segundos até encerrar (o aviso só aparece com valor)
 *  - onStay       "Continuar conectada" (fechar o aviso também conta)
 *  - onLeave      "Sair agora"
 *
 * Acessibilidade: o Modal leva o foco para o aviso e prende o Tab nele; o
 * texto principal é lido ao abrir. A contagem que muda a cada segundo fica fora
 * da região anunciada, para o leitor de tela não repetir o número sem parar.
 */
function SessionTimeoutWarning({ secondsLeft, onStay, onLeave }) {
  if (secondsLeft === null || secondsLeft === undefined) return null
  const plural = secondsLeft === 1 ? "segundo" : "segundos"
  return (
    <Modal kicker="SESSÃO" title="Você ainda está aí?" onClose={onStay}>
      <div className="confirmation-content">
        <div className="confirmation-icon warning">
          <Icon name="clock" />
        </div>
        <p>
          Por segurança, sua sessão será encerrada por inatividade em{" "}
          <strong role="timer" aria-live="off">
            {secondsLeft} {plural}
          </strong>
          .
        </p>
        <p>Para continuar de onde parou, clique em “Continuar conectada”.</p>
      </div>
      <div className="modal-actions">
        <Action variant="secondary" onClick={onLeave}>
          Sair agora
        </Action>
        <Action onClick={onStay}>Continuar conectada</Action>
      </div>
    </Modal>
  )
}

export default SessionTimeoutWarning
