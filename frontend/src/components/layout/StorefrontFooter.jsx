import NewTabHint from "@/components/ui/NewTabHint"
import { instagramLink } from "@/lib/instagram"
import { onlyDigits } from "@/lib/masks"
import "./StorefrontFooter.css"

/**
 * Rodapé da vitrine com identidade, contato, localização e links institucionais.
 */
function StorefrontFooter({ company }) {
  const instagram = instagramLink(company.instagram)
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
        {/* WhatsApp da própria clínica (55 = Brasil + DDD + número) */}
        <a
          href={`https://wa.me/55${onlyDigits(company.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {company.phone} <NewTabHint />
        </a>
        <a href={`mailto:${company.email}`}>{company.email}</a>
        {instagram && (
          <a href={instagram.url} target="_blank" rel="noopener noreferrer">
            {instagram.label} <NewTabHint />
          </a>
        )}
      </div>
      <div>
        <span>LOCALIZAÇÃO</span>
        <p>{company.address}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Como chegar <NewTabHint />
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
        © {new Date().getFullYear()} {company.name} · Agendamentos por Prontto
      </div>
    </footer>
  )
}

export default StorefrontFooter
