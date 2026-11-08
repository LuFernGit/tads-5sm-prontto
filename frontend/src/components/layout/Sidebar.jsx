import Action from "@/components/ui/Action"
import Brand from "@/components/ui/Brand"
import Icon from "@/components/ui/Icon"
import { navigation } from "@/constants"
import { toSlug } from "@/lib/format"
import "./Sidebar.css"

/**
 * Navegação lateral da gestora com acesso às áreas administrativas e à vitrine.
 */
// page = página aberta agora; setPage troca de página; setMode troca o fluxo
// ('preview' abre a vitrine, 'login' faz logout).
function Sidebar({ page, setPage, setMode, notify, company }) {
  return (
    <aside className="sidebar" style={{ paddingBottom: 9 }}>
      {/* Logo do Prontto leva para a página inicial do painel */}
      <button
        type="button"
        className="brand-home"
        aria-label="Prontto — ir para o painel (página inicial)"
        onClick={() => setPage("dashboard")}
      >
        <Brand />
      </button>
      <div className="clinic-pill">
        {/* Logo da clínica; se não houver imagem, mostra as iniciais do nome. */}
        <div className="clinic-logo">
          {company.logoImage ? (
            <img src={company.logoImage} alt="" />
          ) : (
            company.initials
          )}
        </div>
        <span className="clinic-name">{company.name}</span>
      </div>
      <nav className="nav">
        <span className="nav-label">GESTÃO</span>
        {/* Um botão para cada item do menu (lista em src/constants). O ativo ganha a classe 'active'. */}
        {navigation.map((item) => (
          <button
            type="button"
            key={item.label}
            aria-current={page === item.key ? "page" : undefined}
            onClick={() => setPage(item.key)}
            className={`nav-item ${page === item.key ? "active" : ""}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="vitrine-card">
          <Icon name="sparkle" size={21} />
          <span>Vitrine publicada</span>
          <small>prontto.app/?clinica={company.slug || toSlug(company.name)}</small>
          <Action variant="ghost" onClick={() => setMode("preview")}>
            Visualizar vitrine <Icon name="arrow" size={14} />
          </Action>
        </div>
        <button
          type="button"
          onClick={() => setPage("settings")}
          className="profile-mini"
          style={{ height: 70 }}
        >
          <div className="avatar avatar-photo" />
          <div>
            <span>{company.ownerName}</span>
            <small>Gestora</small>
          </div>
          <Icon name="more" />
        </button>
        <button
          type="button"
          className="logout-button"
          onClick={() => {
            setMode("login")
            notify("Sessão da gestora encerrada.")
          }}
        >
          <Icon name="logout" size={16} />
          Sair da conta
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
