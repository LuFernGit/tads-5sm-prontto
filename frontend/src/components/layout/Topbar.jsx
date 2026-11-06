import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import "./Topbar.css"

/**
 * Cabeçalho do painel administrativo com o título da área atual e acesso à vitrine.
 */
function Topbar({ title, setMode }) {
  return (
    <header className="topbar">
      <div>
        <div className="welcome">
          {/* No painel inicial mostra 'Bem-vinda'; nas outras páginas, o nome da página. */}
          {title === "Visão geral" ? "Bem-vinda" : title}
        </div>
      </div>
      <div className="top-actions">
        <Action variant="secondary" onClick={() => setMode("preview")}>
          <Icon name="sparkle" /> Ver vitrine
        </Action>
      </div>
    </header>
  )
}

export default Topbar
