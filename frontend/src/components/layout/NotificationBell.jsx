import { useEffect, useId, useRef, useState } from "react"
import Icon from "@/components/ui/Icon"
import "./NotificationBell.css"

/** "agora", "há 5 min", "há 2 h", "ontem às 14:30", "18/11 às 09:00". */
function timeAgo(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  const hhmm = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 24 * 60) return `há ${Math.round(minutes / 60)} h`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `ontem às ${hhmm}`
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hhmm}`
}

// Ícone e cor de cada tipo de notificação.
const TYPE_ICON = {
  NOVO_AGENDAMENTO: { icon: "calendar", tone: "new" },
  PRESENCA_CONFIRMADA: { icon: "check", tone: "ok" },
  CANCELAMENTO_CLIENTE: { icon: "x-circle", tone: "cancel" },
  CANCELAMENTO_AUTOMATICO: { icon: "calendar-off", tone: "cancel" },
}

/**
 * Sino de notificações do painel da gestora (topo de todas as telas).
 * - Número de não lidas no sino.
 * - Clique abre a lista das mais recentes; cada uma leva para o agendamento
 *   na Agenda e fica marcada como lida.
 * - "Marcar todas como lidas".
 *
 * ACESSIBILIDADE: botão com aria-expanded/aria-controls e nome com o total de
 * não lidas; Esc ou clique fora fecham e o foco volta ao sino.
 */
function NotificationBell({ data, onOpenNotification, onMarkAllRead }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const unread = data?.naoLidas ?? 0
  const items = data?.itens ?? []

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key !== "Escape") return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notif-bell"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? `Notificações: ${unread} não lida${unread > 1 ? "s" : ""}` : "Notificações"}
        title="Notificações"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="notif-panel" id={panelId} role="region" aria-label="Notificações">
          <div className="notif-head">
            <strong>Notificações</strong>
            {unread > 0 && (
              <button type="button" className="notif-mark-all" onClick={onMarkAllRead}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="notif-empty">
              Nenhuma notificação ainda. Novos agendamentos, confirmações e
              cancelamentos dos clientes aparecem aqui.
            </p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => {
                const meta = TYPE_ICON[n.tipo] ?? { icon: "bell", tone: "new" }
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`notif-item ${n.lida ? "" : "is-unread"}`}
                      onClick={() => {
                        setOpen(false)
                        onOpenNotification(n)
                      }}
                    >
                      <span className={`notif-icon ${meta.tone}`} aria-hidden="true">
                        <Icon name={meta.icon} size={16} />
                      </span>
                      <span className="notif-text">
                        <strong>
                          {n.titulo}
                          {!n.lida && <span className="sr-only"> (não lida)</span>}
                        </strong>
                        <span>{n.mensagem}</span>
                        {n.requerAcao && <em className="notif-action">Ação necessária: reembolso a verificar</em>}
                        <small>
                          {timeAgo(n.criadaEm)}
                          {n.agendamentoId && " · Ver na agenda →"}
                        </small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
