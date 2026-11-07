import Icon from "@/components/ui/Icon"
import NewTabHint from "@/components/ui/NewTabHint"
import "./StorefrontFooter.css"

/**
 * Rodapé da vitrine com identidade, contato, localização e links institucionais.
 */
function StorefrontFooter({ company }) {
  return (
    <footer className="storefront-footer">
      <div className="footer-brand">
        <div className="ca-monogram">
          {company.logoImage ? (
            <img src={company.logoImage} alt="" />
          ) : (
            company.initials
          )}
        </div>
        <div>
          <strong>{company.name}</strong>
          <p>{company.description}</p>
        </div>
      </div>
      <div>
        <span>CONTATO</span>
        <a href="https://wa.me/5511999887766" target="_blank" rel="noreferrer">
          {company.phone} <NewTabHint text="abre o WhatsApp em nova guia" />
        </a>
        <a href={`mailto:${company.email}`}>{company.email}</a>
        <small>{company.instagram}</small>
      </div>
      <div>
        <span>LOCALIZAÇÃO</span>
        <p>{company.address}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
          target="_blank"
          rel="noreferrer"
        >
          Como chegar <Icon name="arrow" size={13} />
          <small>(abre em nova guia)</small>
        </a>
      </div>
      <div>
        <span>INFORMAÇÕES</span>
        {/* Links com # abrem as páginas legais (veja useHash e LegalPage). */}
        <a href="#termos">Termos de uso</a>
        <a href="#privacidade">Política de privacidade</a>
        <a href="#contato">Fale com a clínica</a>
        <small>Seg–Sáb · 09h às 19h</small>
      </div>
      <div className="footer-bottom">
        © 2026 {company.name} · Agendamentos por Prontto
      </div>
    </footer>
  )
}

export default StorefrontFooter
