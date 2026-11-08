import { useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import { PLACEHOLDER, maskPhone } from "@/lib/masks"
import { emailError } from "@/lib/validators"
import "./CustomizationPage.css"

/**
 * Edita a identidade da empresa (CLINICA: nome, slogan, título, textos, logo,
 * capa, favicon e contatos) e mostra a prévia da vitrine antes de salvar.
 * As cores não são personalizáveis: a vitrine usa sempre a paleta padrão.
 */
function CustomizationPage({ company, setCompany, notify }) {
  // 'draft' = rascunho. A gestora edita aqui e vê a prévia; só salva ao clicar em 'Salvar personalização'.
  const [draft, setDraft] = useState(company)
  /** Atualiza um campo do rascunho. */
  const update = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }))
  /** Lê a imagem escolhida (até 5 MB) e guarda em base64 no campo indicado (logo, capa ou favicon). */
  const uploadImage = (field, file) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      notify("Use uma imagem JPG, PNG ou WEBP de até 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => update(field, String(reader.result))
    reader.readAsDataURL(file)
  }
  /** Confere os campos obrigatórios e salva (setCompany → PUT /gestora/empresa). */
  const save = () => {
    // Uma mensagem por campo, dizendo como corrigir (WCAG 3.3.3).
    const missing = !draft.name.trim()
      ? "Informe o nome da empresa, como ele deve aparecer na vitrine."
      : !draft.initials.trim()
        ? "Informe as iniciais da empresa (até 3 letras). Exemplo: CA."
        : !draft.heroTitle.trim()
          ? "Informe o título principal da vitrine. Exemplo: Realçando sua beleza com naturalidade."
          : emailError(draft.email ?? "")
    if (missing) {
      notify(missing)
      return
    }
    // O backend confere se o e-mail de contato é diferente do e-mail de acesso.
    setCompany(draft)
    notify("Personalização salva e aplicada à vitrine.")
  }
  return (
    <section className="customization-layout">
      <div className="page-card customization-form">
        <span className="section-kicker">IDENTIDADE DA EMPRESA</span>
        <div className="section-title">Personalização da marca</div>
        <p>
          As alterações são aplicadas ao painel da gestora e à vitrine que suas
          clientes visualizam.
        </p>
        <div className="form-grid">
          <label htmlFor="per-nome-da-empresa">
            <span>NOME DA EMPRESA</span>
            <input id="per-nome-da-empresa"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label htmlFor="per-iniciais-monograma">
            <span>INICIAIS / MONOGRAMA</span>
            <input id="per-iniciais-monograma"
              maxLength={3}
              value={draft.initials}
              onChange={(event) =>
                update("initials", event.target.value.toUpperCase())
              }
            />
          </label>
          <label htmlFor="per-assinatura-da-marca" className="wide">
            <span>ASSINATURA DA MARCA</span>
            <input id="per-assinatura-da-marca"
              value={draft.tagline}
              onChange={(event) => update("tagline", event.target.value)}
              placeholder="Ex.: Estética Premium em São Paulo"
            />
          </label>
          <label htmlFor="per-titulo-principal-da-vitrine" className="wide">
            <span>TÍTULO PRINCIPAL DA VITRINE</span>
            <input id="per-titulo-principal-da-vitrine"
              value={draft.heroTitle}
              onChange={(event) => update("heroTitle", event.target.value)}
            />
          </label>
          <label htmlFor="per-texto-de-apresentacao" className="wide">
            <span>TEXTO DE APRESENTAÇÃO</span>
            <textarea id="per-texto-de-apresentacao"
              rows={3}
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>
          <label htmlFor="per-whatsapp-publico">
            <span>WHATSAPP PÚBLICO</span>
            <input id="per-whatsapp-publico"
              inputMode="tel"
              value={draft.phone}
              onChange={(event) => update("phone", maskPhone(event.target.value))}
              placeholder={PLACEHOLDER.phone}
            />
          </label>
          <label htmlFor="per-e-mail-de-contato">
            <span>E-MAIL DE CONTATO</span>
            <input id="per-e-mail-de-contato"
              type="email"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
            />
            <small className="field-hint">
              Aparece na vitrine. Precisa ser diferente do seu e-mail de acesso.
            </small>
          </label>
          <label htmlFor="per-instagram">
            <span>INSTAGRAM</span>
            <input id="per-instagram"
              value={draft.instagram}
              onChange={(event) => update("instagram", event.target.value)}
            />
          </label>
          <label htmlFor="per-endereco-exibido" className="wide">
            <span>ENDEREÇO EXIBIDO</span>
            <input id="per-endereco-exibido"
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </label>
        </div>
        {/* Envio de imagens: logo, favicon (ícone da aba) e capa da vitrine. */}
        <div className="brand-uploads">
          <label htmlFor="per-logo-da-empresa">
            <span>LOGO DA EMPRESA</span>
            <input id="per-logo-da-empresa"
              type="file"
              accept="image/*"
              onChange={(event) =>
                uploadImage("logoImage", event.target.files?.[0])
              }
            />
            <div>
              {draft.logoImage ? (
                <img src={draft.logoImage} alt="Logo da empresa" />
              ) : (
                <>
                  <Icon name="plus" />
                  <small>Adicionar logo</small>
                </>
              )}
            </div>
          </label>
          <label htmlFor="per-imagem-principal-da-vitrine">
            <span>IMAGEM PRINCIPAL DA VITRINE</span>
            <input id="per-imagem-principal-da-vitrine"
              type="file"
              accept="image/*"
              onChange={(event) =>
                uploadImage("heroImage", event.target.files?.[0])
              }
            />
            <div className="hero-upload">
              {draft.heroImage ? (
                <img src={draft.heroImage} alt="Imagem principal" />
              ) : (
                <>
                  <Icon name="plus" />
                  <small>Adicionar imagem</small>
                </>
              )}
            </div>
          </label>
          <label htmlFor="per-icone-da-aba-favicon">
            <span>ÍCONE DA ABA (FAVICON)</span>
            <input id="per-icone-da-aba-favicon"
              type="file"
              accept="image/png,image/svg+xml,image/x-icon"
              onChange={(event) =>
                uploadImage("favicon", event.target.files?.[0])
              }
            />
            <div>
              {draft.favicon ? (
                <img src={draft.favicon} alt="Ícone da aba" />
              ) : (
                <>
                  <Icon name="plus" />
                  <small>Opcional — usa o logo</small>
                </>
              )}
            </div>
          </label>
        </div>
        <div className="settings-save">
          <small>
            Você poderá alterar estas informações sempre que precisar.
          </small>
          <Action onClick={save}>Salvar personalização</Action>
        </div>
      </div>
      <aside
        className="brand-preview page-card"
        style={{
          // paleta padrão do Prontto (as cores não são personalizáveis)
          "--preview-accent": "var(--rose, #6e3a44)", // branco sobre #6e3a44 = 8,93:1 (AAA)
          "--preview-secondary": "var(--gold)",
          "--preview-base": "var(--navy)",
        }}
      >
        <span className="section-kicker">PRÉ-VISUALIZAÇÃO</span>
        {/* PRÉVIA: mostra como a vitrine vai ficar, usando o rascunho em tempo real. */}
        <div className="preview-window">
          <div className="preview-brand">
            {draft.logoImage ? (
              <img src={draft.logoImage} alt="" />
            ) : (
              <i>{draft.initials}</i>
            )}
            <span>
              <strong>{draft.name}</strong>
              <small>{draft.tagline}</small>
            </span>
          </div>
          <div className="preview-hero">
            <img src={draft.heroImage} alt="" />
            <div />
            <span>
              <strong>{draft.heroTitle}</strong>
              <small>{draft.description}</small>
              <b>Conheça nossos serviços</b>
            </span>
          </div>
        </div>
      </aside>
    </section>
  )
}

export default CustomizationPage
