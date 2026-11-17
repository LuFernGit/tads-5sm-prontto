import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import NotificationBell from "./NotificationBell"
import "./Topbar.css"

/**
 * Cabeçalho do painel administrativo com o título da área atual e acesso à vitrine.
 */
// notifications/onOpenNotification/onMarkAllRead: sino de notificações (NotificationBell).
function Topbar({ title, setMode, menuOpen = false, onOpenMenu, notifications, onOpenNotification, onMarkAllRead }) {
  return (
    <header className="topbar">
      {/* Abre o menu lateral (gaveta) em telas estreitas; escondido nas largas. */}
      <button
        type="button"
        id="menu-lateral-abrir"
        className="menu-toggle"
        aria-controls="menu-lateral"
        aria-expanded={menuOpen}
        onClick={onOpenMenu}
      >
        <span className="menu-toggle-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        Menu
      </button>
      <div className="topbar-title">
        <div className="welcome">
          {/* No painel inicial mostra 'Bem-vinda'; nas outras páginas, o nome da página. */}
          {title === "Visão geral" ? "Bem-vindo" : title}
        </div>
      </div>
      <div className="top-actions">
        {notifications && (
          <NotificationBell
            data={notifications}
            onOpenNotification={onOpenNotification}
            onMarkAllRead={onMarkAllRead}
          />
        )}
        <Action variant="secondary" onClick={() => setMode("preview")}>
          <Icon name="sparkle" /> Ver vitrine
        </Action>
      </div>
    </header>
  )
}

export default Topbar
