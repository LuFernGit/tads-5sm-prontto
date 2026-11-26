import Icon from "@/components/ui/Icon"
import StorefrontFooter from "@/components/layout/StorefrontFooter"
import { instagramLink } from "@/lib/instagram"
import { findDocument } from "@/lib/documents"
import DocumentView from "@/components/ui/DocumentView"
import { maskPhone } from "@/lib/masks"
import { PRONTTO_TERMS, PRONTTO_PRIVACY, clinicDefaultTerms } from "./pronttoLegalTexts"
import "./LegalPage.css"

// Rótulo pequeno acima do título, no padrão das outras telas (section-kicker).
const KICKER = {
  termos: "DOCUMENTO DA CLÍNICA",
  privacidade: "PRIVACIDADE E DADOS",
  contato: "ATENDIMENTO",
}

/* Ícones que não existem em components/ui/Icon (traço igual ao dos outros). */
const svgProps = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
}
const MailIcon = () => (
  <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
)
const InstagramIcon = () => (
  <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
)
const PinIcon = () => (
  <svg {...svgProps}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
)

/** Linha de um canal de contato. Com href, a linha inteira é o link. */
function ContactCard({ icon, label, value, href, hint, external = false }) {
  const arrow = external && (
    <>
      {" "}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (abre em nova guia)</span>
    </>
  )
  const content = (
    <>
      <span className="lg-contact-icon">{icon}</span>
      <span className="lg-contact-text">
        <small>{label}</small>
        <strong>
          {value}
          {!hint && arrow}
        </strong>
        {hint && (
          <span className="lg-contact-hint">
            {hint}
            {arrow}
          </span>
        )}
      </span>
    </>
  )
  return (
    <li>
      {href ? (
        <a
          className="lg-contact"
          href={href}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer", title: "Abre em nova guia" }
            : {})}
        >
          {content}
        </a>
      ) : (
        <div className="lg-contact">{content}</div>
      )}
    </li>
  )
}

/**
 * Texto dos termos de uso ou da política de privacidade. Usado na página
 * (#termos, #privacidade) e no modal do cadastro do cliente, que não pode
 * sair da tela sem perder o que já foi preenchido. No modal, o título fica no
 * cabeçalho do próprio modal (inModal esconde o h1).
 */
export function LegalText({ kind, company, inModal = false, platform = false }) {
  const title = (text) => (inModal ? null : <h1 id="lg-title">{text}</h1>)
  // Termos de atendimento padrão (clínica sem documento próprio publicado).
  if (kind === "atendimento")
    return <PronttoDocument doc={clinicDefaultTerms({ ...company, phone: company.phone && maskPhone(company.phone) })} title={title} />
  // Documento publicado DA CLÍNICA (texto e/ou PDF), vindo da vitrine. Com
  // platform = true (aceite "Termos do Prontto" no cadastro) só vale o texto
  // do Prontto. Sem documento da clínica, também vale o do Prontto.
  const clinicDoc = platform
    ? null
    : findDocument(company, kind === "termos" ? "TERMOS_USO" : "POLITICA_PRIVACIDADE", false)
  if (clinicDoc && (kind === "termos" || kind === "privacidade"))
    return (
      <>
        {title(clinicDoc.titulo)}
        <DocumentView doc={clinicDoc} slug={company.slug} />
      </>
    )
  // Pré-visualização da gestora (sem a lista de documentos): texto salvo.
  const clinicText = platform
    ? ""
    : (kind === "termos" ? company.termsOfUse : company.privacyPolicy)?.trim() || ""
  const pronttoDoc = kind === "termos" ? PRONTTO_TERMS : PRONTTO_PRIVACY
  const clinicTitle = kind === "termos" ? "Termos de uso" : "Política de privacidade"
  if (kind !== "termos" && kind !== "privacidade") return null
  if (clinicText)
    return (
      <>
        {title(<>{clinicTitle} — {company.name}</>)}
        <div className="lg-text">{clinicText}</div>
      </>
    )
  return <PronttoDocument doc={pronttoDoc} title={title} />
}

/** Parágrafo com rótulo opcional em negrito: "texto" ou ["Rótulo:", "texto"]. */
function Labeled({ value }) {
  if (typeof value === "string") return value
  const [label, text] = value
  return (
    <>
      <strong>{label}</strong>
      {text && <> {text}</>}
    </>
  )
}

/** Documento oficial do Prontto (termos ou privacidade), de pronttoLegalTexts.js. */
function PronttoDocument({ doc, title }) {
  return (
    <>
      {title(doc.title)}
      <p className="lg-meta">
        Versão {doc.version} · Última atualização: {doc.updated}
      </p>
      {doc.intro.map((text, i) => (
        <p key={`intro-${i}`}>{text}</p>
      ))}
      {doc.sections.map((section) => (
        <section key={section.h}>
          <h2>{section.h}</h2>
          {section.blocks.map((block, i) =>
            block.list ? (
              <ul key={i}>
                {block.list.map((item, j) => (
                  <li key={j}>
                    <Labeled value={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p key={i}>
                <Labeled value={block.p} />
              </p>
            ),
          )}
        </section>
      ))}
    </>
  )
}

/**
 * Exibe termos de uso, política de privacidade ou canais de contato da empresa.
 * Visual da área da cliente: logo e nome da clínica no topo e rodapé da vitrine.
 */
// kind = 'termos' | 'privacidade' | 'contato' (vem do # da URL, veja App.jsx).
function LegalPage({ kind, company, onBack }) {
  const wa = `https://wa.me/55${company.phone.replace(/\D/g, "")}`
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`
  const instagram = instagramLink(company.instagram)
  return (
    <main className="ff-page lg-page">
      <header className="ff-header">
        {/* Marca da clínica do link (logo + nome), como no cadastro da cliente */}
        <button
          type="button"
          className="lg-brand"
          aria-label={`${company.name} — voltar para a clínica`}
          onClick={onBack}
        >
          <span className="lg-logo">
            {company.logoImage ? <img src={company.logoImage} alt="" /> : company.initials}
          </span>
          <strong>{company.name}</strong>
        </button>
        <button type="button" onClick={onBack}>
          ← Voltar para a clínica
        </button>
      </header>
      <article className="ff-card legal lg-card" aria-labelledby="lg-title">
        <span className="section-kicker">{KICKER[kind]}</span>
        <LegalText kind={kind} company={company} />

        {/* Canais de contato */}
        {kind === "contato" && (
          <>
            <h1 id="lg-title">Fale com a clínica</h1>
            <p className="lg-intro">
              Dúvidas, reclamações ou pedidos sobre seus agendamentos? Fale
              direto com a {company.name} por um dos canais abaixo.
            </p>
            <ul className="lg-contacts" aria-label="Canais de contato">
              <ContactCard
                icon={<Icon name="whatsapp" size={20} />}
                label="WhatsApp"
                value={maskPhone(company.phone)}
                href={wa}
                external
              />
              <ContactCard
                icon={<MailIcon />}
                label="E-mail"
                value={company.email}
                href={`mailto:${company.email}`}
              />
              {instagram && (
                <ContactCard
                  icon={<InstagramIcon />}
                  label="Instagram"
                  value={instagram.label}
                  href={instagram.url}
                  external
                />
              )}
              {company.address && (
                <ContactCard
                  icon={<PinIcon />}
                  label="Endereço"
                  value={company.address}
                  hint="Como chegar"
                  href={maps}
                  external
                />
              )}
              {company.hoursText && (
                <ContactCard
                  icon={<Icon name="clock" size={20} />}
                  label="Horário"
                  value={company.hoursText}
                />
              )}
            </ul>
            <div className="lg-cta">
              <a
                className="ff-btn ff-primary lg-cta-btn"
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                title="Abre em nova guia"
              >
                <Icon name="whatsapp" size={18} /> Chamar no WhatsApp
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (abre em nova guia)</span>
              </a>
            </div>
          </>
        )}
      </article>
      <StorefrontFooter company={company} />
    </main>
  )
}

export default LegalPage
