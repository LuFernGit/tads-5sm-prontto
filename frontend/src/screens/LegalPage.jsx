import Icon from "@/components/ui/Icon"
import StorefrontFooter from "@/components/layout/StorefrontFooter"
import { instagramLink } from "@/lib/instagram"
import { maskPhone } from "@/lib/masks"
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
        {/* Termos de uso */}
        {kind === "termos" &&
          (company.termsOfUse?.trim() ? (
            <>
              <h1 id="lg-title">Termos de uso — {company.name}</h1>
              <div className="lg-text">{company.termsOfUse}</div>
            </>
          ) : (
            <>
              <h1 id="lg-title">Termos de uso</h1>
              <h2>1. Sobre o serviço</h2>
              <p>
                O Prontto é a plataforma de agendamento usada pela{" "}
                {company.name}. Pelo link da clínica você vê os serviços,
                escolhe data e horário e confirma o agendamento.
              </p>
              <h2>2. Cadastro</h2>
              <p>
                Para agendar, informe nome completo, data de nascimento,
                WhatsApp, e-mail e senha. É preciso ter 15 anos ou mais. Você é
                responsável por manter a senha em segredo e por informar dados
                verdadeiros.
              </p>
              <h2>3. Ficha de saúde</h2>
              <p>
                A ficha de saúde ajuda a clínica a realizar o procedimento com
                segurança. Mantenha-a atualizada. Alterações ficam registradas
                em histórico.
              </p>
              <h2>4. Preços, horários e sinal</h2>
              <p>
                Preço, duração e horários disponíveis aparecem antes da
                confirmação. Para clientes novas, o sistema mostra uma simulação
                de sinal. Nesta versão, nenhum pagamento real é feito. Clientes
                recorrentes ficam isentas do sinal.
              </p>
              <h2>5. Cancelamento e alteração</h2>
              <p>
                Cancelamentos e reagendamentos devem ser pedidos com no mínimo
                24 horas de antecedência. Quando aplicável, vale o direito de
                arrependimento do Código de Defesa do Consumidor (art. 49).
              </p>
              <h2>6. Contato</h2>
              <p>
                Dúvidas e reclamações: veja a página{" "}
                <a href="#contato">Fale com a clínica</a>.
              </p>
            </>
          ))}

        {/* Política de privacidade */}
        {kind === "privacidade" &&
          (company.privacyPolicy?.trim() ? (
            <>
              <h1 id="lg-title">Política de privacidade — {company.name}</h1>
              <div className="lg-text">{company.privacyPolicy}</div>
            </>
          ) : (
            <>
              <h1 id="lg-title">Política de privacidade</h1>
              <h2>Quais dados usamos e para quê</h2>
              <p>
                Usamos nome, data de nascimento, WhatsApp e e-mail para
                cadastro, agendamento e comunicação sobre o serviço. A senha é
                guardada de forma criptografada. A ficha de saúde (alergias e
                observações médicas) serve só para a segurança do procedimento e
                é vista por você e pela gestora da clínica.
              </p>
              <h2>Quem pode ver seus dados</h2>
              <p>
                Você vê apenas os seus dados e agendamentos. A gestora vê os
                dados das clientes da própria clínica. Ninguém mais tem acesso.
              </p>
              <h2>Por quanto tempo guardamos</h2>
              <ul>
                <li>
                  Registros de acesso (data e hora): 6 meses, em ambiente
                  seguro.
                </li>
                <li>
                  Histórico de prestação de serviços: no mínimo 3 anos, para
                  defesa em eventuais ações de reparação.
                </li>
                <li>
                  Registros de atendimentos e valores cobrados: 5 anos, para
                  fins de defesa do consumidor e auditoria fiscal.
                </li>
              </ul>
              <h2>Seus direitos (LGPD, art. 18)</h2>
              <p>
                Você pode pedir acesso, correção e exclusão dos seus dados em
                Meu perfil. Na exclusão, seus dados pessoais são anonimizados.
                Os registros de atendimento e valores continuam guardados, sem
                identificar você, durante os prazos acima.
              </p>
              <h2>Fale com a gente</h2>
              <p>
                Pedidos e dúvidas sobre privacidade:{" "}
                <a href={`mailto:${company.email}`}>{company.email}</a>.
              </p>
            </>
          ))}

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
