import Action from "@/components/ui/Action";
import Brand from "@/components/ui/Brand";
import Icon from "@/components/ui/Icon";
import { navigation } from "@/constants";
import { toSlug } from "@/lib/format";
import "./Sidebar.css";

/**
 * Navegação lateral da gestora com acesso às áreas administrativas e à vitrine.
 */
// page = página aberta agora; setPage troca de página; setMode troca o fluxo
// ('preview' abre a vitrine, 'login' faz logout).
function Sidebar({ page, setPage, setMode, notify, company }) {
  // Link da vitrine que a gestora envia às clientes. O 'slug' é gerado pelo
  // backend no fim do cadastro da empresa (CLINICA.slug); o endereço base é o
  // do próprio sistema (localhost em desenvolvimento, o domínio real em produção).
  const slug = company.slug || toSlug(company.name);
  const vitrineUrl = `${window.location.origin}${window.location.pathname}?clinica=${slug}`;
  // Versão curta para exibir no cartão (sem "https://").
  const vitrineLabel = vitrineUrl.replace(/^https?:\/\//, "");
  /** Copia o link da vitrine para a área de transferência. */
  const copyVitrineLink = async () => {
    try {
      await navigator.clipboard.writeText(vitrineUrl);
      notify(
        "Link da vitrine copiado. Agora é só colar e enviar para suas clientes.",
      );
    } catch {
      notify(
        `Não foi possível copiar automaticamente. Copie este link: ${vitrineUrl}`,
      );
    }
  };
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
          <small className="vitrine-link" title={vitrineUrl}>
            {vitrineLabel}
          </small>
          {/* "Ver vitrine" fica no topo da página (Topbar); aqui só copiar o link. */}
          <div className="vitrine-actions">
            <Action variant="ghost" onClick={copyVitrineLink}>
              Copiar link
            </Action>
          </div>
        </div>
        <div className="profile-menu-wrap">
          <div className="profile-mini" style={{ height: 70 }}>
            <div className="avatar avatar-photo" />
            <div>
              <span>{company.ownerName}</span>
              <small>Gestora</small>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="logout-button"
          onClick={() => {
            setMode("login");
            notify("Sessão da gestora encerrada.");
          }}
        >
          <Icon name="logout" size={16} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
