import { useState } from "react"
import Action from "@/components/ui/Action"
import Brand from "@/components/ui/Brand"
import Icon from "@/components/ui/Icon"
import { neutralLoginImage } from "@/constants"
import { formatDuration, formatPrice, normalizeCategoryName } from "@/lib/format"
import {
  PLACEHOLDER,
  maskCep,
  maskCpfCnpj,
  maskMoney,
  maskPhone,
  onlyDigits,
  parseMoney,
} from "@/lib/masks"
import {
  MIN_AGE_MANAGER,
  birthError,
  cepError,
  cpfCnpjError,
  emailError,
  phoneError,
  sameEmailsError,
} from "@/lib/validators"
import "./CompanyRegistrationPage.css"

/**
 * Conduz a gestora pelo cadastro em etapas da empresa, catálogo e identidade visual.
 */
// Props (recebidas do LoginScreen):
//   onBack     → volta para a tela de login
//   onComplete → envia o cadastro pronto ao backend (useAppSession.registerCompany)
//   notify     → mostra avisos e erros (Toast)
//
// ETAPAS (state 'step', de 0 a 5):
//   0 Empresa · 1 Gestor · 2 Localização · 3 Serviços · 4 Marca · 5 Revisão e aceites
function CompanyRegistrationPage({ onBack, onComplete, notify }) {
  // Etapa atual do cadastro (começa na 0 = 'Empresa').
  const [step, setStep] = useState(0)
  // Todos os campos de texto do formulário ficam juntos neste objeto.
  const [data, setData] = useState({
    companyName: "",
    businessType: "",
    document: "",
    ownerName: "",
    professionalRole: "",
    birthDate: "", // USUARIO.data_nascimento da gestora (mínimo 16 anos)
    email: "", // e-mail de ACESSO (login) → USUARIO.email
    contactEmail: "", // e-mail de CONTATO da clínica → CLINICA.email_contato
    password: "",
    phone: "",
    whatsapp: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    tagline: "",
    heroTitle: "",
    description: "",
    instagram: "",
    termsOfUse:
      "Este é um texto demonstrativo de Termos de Uso da empresa. A clínica pode editar este conteúdo para explicar as regras de agendamento, cancelamento e atendimento.",
    privacyPolicy:
      "Este é um texto demonstrativo de Política de Privacidade da empresa. A clínica pode editar este conteúdo para explicar quais dados das clientes utiliza, para quais finalidades e como entrar em contato.",
  })
  // Etapa 4 (Serviços): categorias criadas, texto da nova categoria, serviços
  // já adicionados e o 'rascunho' do serviço que está sendo digitado.
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState("")
  const [initialServices, setInitialServices] = useState([])
  const [serviceDraft, setServiceDraft] = useState({
    name: "",
    category: "",
    duration: "",
    price: "",
    description: "",
  })
  // Etapa 5 (Marca): imagens em base64 (texto gerado a partir do arquivo).
  const [logoImage, setLogoImage] = useState("")
  const [heroImage, setHeroImage] = useState(neutralLoginImage)
  // Etapa 6 (Revisão): PDF opcional dos termos da clínica e as caixas de aceite.
  const [clinicTermsDocument, setClinicTermsDocument] = useState("")
  const [clinicTermsFileName, setClinicTermsFileName] = useState("")
  const [acceptClinicTerms, setAcceptClinicTerms] = useState(false)
  const [acceptPronttoTerms, setAcceptPronttoTerms] = useState(false)
  const [acceptPronttoPrivacy, setAcceptPronttoPrivacy] = useState(false)
  /** Atualiza um campo de 'data' sem apagar os outros. Ex.: update('city', 'São Paulo'). */
  const update = (field, value) =>
    setData((current) => ({ ...current, [field]: value }))
  /**
   * Lê a imagem escolhida no computador e guarda como texto base64 (data URL).
   * Aceita só imagens de até 5 MB. 'setter' é a função que guarda o resultado.
   */
  const readImage = (file, setter) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      notify("Use uma imagem JPG, PNG ou WEBP de até 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }
  /** Adiciona uma categoria nova, sem permitir repetidas (ignora acentos e maiúsculas). */
  const addCategory = () => {
    const category = newCategory.trim()
    if (!category) {
      notify("Digite o nome da categoria antes de continuar.")
      return
    }
    if (
      categories.some(
        (item) =>
          normalizeCategoryName(item) === normalizeCategoryName(category),
      )
    ) {
      notify(`A categoria “${category}” já foi adicionada.`)
      return
    }
    setCategories((current) => [...current, category])
    setServiceDraft((current) => ({ ...current, category }))
    setNewCategory("")
  }
  /** Valida o serviço digitado, adiciona à lista e limpa o formulário do serviço. */
  const addInitialService = () => {
    // Preço digitado com máscara "R$ 150,00" → número 150 (SERVICO.preco)
    const numericPrice = parseMoney(serviceDraft.price)
    // Duração digitada em minutos → número inteiro (SERVICO.duracao)
    const minutes = Number(serviceDraft.duration)
    if (
      !serviceDraft.name.trim() ||
      !serviceDraft.category ||
      !Number.isInteger(minutes) ||
      minutes <= 0 ||
      !Number.isFinite(numericPrice)
    ) {
      notify("Preencha nome, categoria, duração (em minutos) e preço (em reais).")
      return
    }
    setInitialServices((current) => [
      ...current,
      {
        // id temporário só para a lista da tela; o backend cria o id de verdade.
        id: `registered-${Date.now()}`,
        name: serviceDraft.name.trim(),
        category: serviceDraft.category,
        duration: minutes,
        price: numericPrice,
        active: true,
        description: serviceDraft.description.trim(),
        image: heroImage,
      },
    ])
    setServiceDraft({
      name: "",
      category: categories[0] || "",
      duration: "",
      price: "",
      description: "",
    })
  }
  /**
   * Confere os campos obrigatórios da etapa atual.
   * Devolve "" se estiver tudo certo, ou o texto do erro para mostrar.
   */
  const validateStep = () => {
    if (step === 0) {
      // Cada mensagem diz qual campo corrigir e como (WCAG 3.3.3).
      if (!data.companyName.trim())
        return "Informe o nome da empresa, como ele deve aparecer na vitrine."
      if (!data.businessType) return "Escolha o tipo de negócio na lista."
      const documentError = cpfCnpjError(data.document)
      if (documentError) return documentError
      if (emailError(data.contactEmail))
        return `E-mail de contato da clínica: ${emailError(data.contactEmail)}`
    }
    if (step === 1) {
      if (!data.ownerName.trim())
        return "Informe o nome completo da responsável pelo painel."
      if (emailError(data.email))
        return `E-mail de acesso: ${emailError(data.email)}`
      if (data.password.length < 6)
        return "A senha precisa ter pelo menos 6 caracteres. Exemplo: Clinica2026."
      const ageError = birthError(data.birthDate, MIN_AGE_MANAGER)
      if (ageError) return ageError
      if (phoneError(data.whatsapp)) return phoneError(data.whatsapp)
      const emailsError = sameEmailsError(data.email, data.contactEmail)
      if (emailsError) return emailsError
    }
    if (step === 2) {
      if (!data.address.trim()) return "Informe o endereço (rua ou avenida)."
      if (!data.number.trim())
        return "Informe o número do endereço. Se não houver, digite S/N."
      if (!data.city.trim()) return "Informe a cidade."
      if (!data.state.trim()) return "Informe o estado com a sigla. Exemplo: SP."
      if (cepError(data.cep)) return cepError(data.cep)
    }
    if (step === 3 && categories.length === 0)
      return "Crie pelo menos uma categoria de serviço."
    if (step === 4) {
      if (!data.tagline.trim())
        return "Informe a assinatura da marca. Exemplo: BEAUTY & ESTHETICS."
      if (!data.heroTitle.trim())
        return "Informe o título principal da vitrine. Exemplo: Realçando sua beleza com naturalidade."
      if (!data.description.trim())
        return "Escreva um texto curto de apresentação da empresa."
    }
    return ""
  }
  /** Botão 'Continuar': só avança se a etapa atual for válida (máximo: etapa 5). */
  const next = () => {
    const error = validateStep()
    if (error) {
      notify(error)
      return
    }
    setStep((current) => Math.min(current + 1, 5))
  }
  /**
   * Botão final 'Criar empresa e acessar painel'.
   * Confere os aceites, monta o objeto no formato que o backend espera
   * ({ empresa, gestora, servicos, categorias, aceites }) e envia.
   */
  const complete = () => {
    if (!acceptClinicTerms) {
      notify("É necessário aceitar os termos de atendimento da clínica.")
      return
    }
    if (!acceptPronttoTerms || !acceptPronttoPrivacy) {
      notify(
        "A gestora precisa aceitar os Termos de Uso e a Política de Privacidade do Prontto.",
      )
      return
    }
    // Iniciais do nome (até 3 letras), usadas quando a empresa não tem logo. Ex.: 'CA Beauty' → 'CB'.
    const initials =
      data.companyName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase() || "EMP"
    // Dados da CLINICA. O CPF/CNPJ e o telefone vão só com números.
    const empresa = {
      name: data.companyName.trim(),
      initials,
      cpfCnpj: onlyDigits(data.document),
      tagline: data.tagline.trim(),
      heroTitle: data.heroTitle.trim(),
      description: data.description.trim(),
      phone: data.whatsapp.trim(),
      email: data.contactEmail.trim().toLowerCase(),
      instagram: data.instagram.trim(),
      address: `${data.address}, ${data.number}${
        data.complement ? ` — ${data.complement}` : ""
      } · ${data.neighborhood}, ${data.city} — ${data.state} · CEP ${maskCep(data.cep)}`,
      logoImage,
      heroImage,
      termsOfUse: data.termsOfUse.trim(),
      privacyPolicy: data.privacyPolicy.trim(),
      clinicTermsDocument,
      clinicTermsFileName,
    }
    // Dados da gestora (USUARIO tipo GESTORA)
    const gestora = {
      nome: data.ownerName.trim(),
      email: data.email.trim().toLowerCase(),
      senha: data.password,
      dataNascimento: data.birthDate,
      whatsapp: onlyDigits(data.whatsapp),
    }
    // Aceites → ACEITE_DOCUMENTO com papel_no_aceite = 'GESTORA' (gravado pelo backend)
    const aceites = {
      termosUso: acceptPronttoTerms,
      politicaPrivacidade: acceptPronttoPrivacy,
      termosClinica: acceptClinicTerms,
      dataHora: new Date().toISOString(),
    }
    onComplete({
      empresa,
      gestora,
      // Remove o id temporário de cada serviço antes de enviar.
      servicos: initialServices.map(({ id: _localId, ...service }) => service),
      categorias: categories,
      aceites,
    })
  }
  // Nomes mostrados na lista de etapas, à esquerda da tela.
  const stepNames = [
    "Empresa",
    "Gestor",
    "Localização",
    "Serviços",
    "Marca",
    "Revisão",
  ]
  return (
    <main className="registration-page">
      {/* Topo: logo do Prontto e botão para voltar ao login. */}
      <header className="registration-header">
        <Brand />
        <button type="button" onClick={onBack}>
          ← Voltar ao login
        </button>
      </header>
      <div className="registration-shell">
        {/* COLUNA ESQUERDA: lista das etapas. 'active' = etapa atual, 'done' = já concluída (✓). */}
        <aside className="registration-steps">
          <span>CADASTRO DA EMPRESA</span>
          <strong>Configure seu espaço no Prontto</strong>
          <p>
            As informações criam o painel da gestora e a vitrine apresentada às
            clientes.
          </p>
          {stepNames.map((name, index) => (
            <div
              key={name}
              className={`${index === step ? "active" : ""} ${
                index < step ? "done" : ""
              }`}
            >
              <i>{index < step ? "✓" : index + 1}</i>
              <span>{name}</span>
            </div>
          ))}
        </aside>
        {/* COLUNA DIREITA: só a etapa atual aparece (cada bloco abaixo tem step === N). */}
        <section className="registration-content">
          {/* ===== ETAPA 1: dados da empresa ===== */}
          {step === 0 && (
            <>
              <span className="section-kicker">ETAPA 1 DE 6</span>
              <div className="registration-title">Sobre a empresa</div>
              <p>
                Comece com os dados jurídicos e o segmento principal do negócio.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-nome-da-empresa">
                  <span>NOME DA EMPRESA *</span>
                  <input id="cad-nome-da-empresa"
                    autoFocus
                    value={data.companyName}
                    onChange={(event) =>
                      update("companyName", event.target.value)
                    }
                    placeholder="Nome que será exibido na vitrine"
                  />
                </label>
                <label htmlFor="cad-tipo-de-negocio">
                  <span>TIPO DE NEGÓCIO *</span>
                  <select id="cad-tipo-de-negocio"
                    value={data.businessType}
                    onChange={(event) =>
                      update("businessType", event.target.value)
                    }
                  >
                    <option value="">Selecione</option>
                    <option>Treinamento funcional</option>
                    <option>Pilates</option>
                    <option>Salão de beleza</option>
                    <option>Clínica de estética</option>
                    <option>Consultório médico</option>
                    <option>Consultório odontológico</option>
                    <option>Outro serviço</option>
                  </select>
                </label>
                <label htmlFor="cad-cpf-cnpj">
                  <span>CPF / CNPJ *</span>
                  <input id="cad-cpf-cnpj"
                    inputMode="numeric"
                    value={data.document}
                    onChange={(event) =>
                      update("document", maskCpfCnpj(event.target.value))
                    }
                    placeholder={PLACEHOLDER.cpfCnpj}
                  />
                  <small className="field-hint">
                    CPF (profissional autônoma) ou CNPJ da empresa. Digite só os
                    números.
                  </small>
                </label>
                <label htmlFor="cad-e-mail-de-contato">
                  <span>E-MAIL DE CONTATO DA CLÍNICA *</span>
                  <input id="cad-e-mail-de-contato"
                    type="email"
                    value={data.contactEmail}
                    onChange={(event) =>
                      update("contactEmail", event.target.value)
                    }
                    placeholder="contato@suaempresa.com.br"
                  />
                  <small className="field-hint">
                    Aparece na vitrine para as clientes. Precisa ser diferente
                    do e-mail de acesso ao painel.
                  </small>
                </label>
                <label htmlFor="cad-instagram">
                  <span>INSTAGRAM</span>
                  <input id="cad-instagram"
                    value={data.instagram}
                    onChange={(event) =>
                      update("instagram", event.target.value)
                    }
                    placeholder="@suaempresa"
                  />
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 2: dados da gestora (acesso ao painel) ===== */}
          {step === 1 && (
            <>
              <span className="section-kicker">ETAPA 2 DE 6</span>
              <div className="registration-title">
                Gestor ou profissional responsável
              </div>
              <p>
                Esses dados serão usados para identificar o acesso
                administrativo.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-nome-completo">
                  <span>NOME COMPLETO *</span>
                  <input id="cad-nome-completo"
                    autoFocus
                    value={data.ownerName}
                    onChange={(event) =>
                      update("ownerName", event.target.value)
                    }
                  />
                </label>
                <label htmlFor="cad-cargo-especialidade">
                  <span>CARGO / ESPECIALIDADE</span>
                  <input id="cad-cargo-especialidade"
                    value={data.professionalRole}
                    onChange={(event) =>
                      update("professionalRole", event.target.value)
                    }
                    placeholder="Ex.: Fisioterapeuta, médica, proprietária"
                  />
                </label>
                <label htmlFor="cad-e-mail-de-acesso">
                  <span>E-MAIL DE ACESSO *</span>
                  <input id="cad-e-mail-de-acesso"
                    type="email"
                    value={data.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                  <small className="field-hint">
                    Usado só para entrar no painel; não aparece para as
                    clientes. Por segurança, não use o mesmo e-mail de contato
                    da clínica.
                  </small>
                </label>
                <label htmlFor="cad-data-de-nascimento">
                  <span>DATA DE NASCIMENTO *</span>
                  <input id="cad-data-de-nascimento"
                    type="date"
                    value={data.birthDate}
                    onChange={(event) => update("birthDate", event.target.value)}
                  />
                  <small className="field-hint">
                    É preciso ter pelo menos {MIN_AGE_MANAGER} anos para abrir
                    uma clínica.
                  </small>
                </label>
                <label htmlFor="cad-senha">
                  <span>SENHA *</span>
                  <input id="cad-senha"
                    type="password"
                    value={data.password}
                    onChange={(event) => update("password", event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                  />
                </label>
                <label htmlFor="cad-telefone">
                  <span>TELEFONE</span>
                  <input id="cad-telefone"
                    inputMode="tel"
                    value={data.phone}
                    onChange={(event) =>
                      update("phone", maskPhone(event.target.value))
                    }
                    placeholder={PLACEHOLDER.phone}
                  />
                </label>
                <label htmlFor="cad-whatsapp">
                  <span>WHATSAPP *</span>
                  <input id="cad-whatsapp"
                    inputMode="tel"
                    value={data.whatsapp}
                    onChange={(event) =>
                      update("whatsapp", maskPhone(event.target.value))
                    }
                    placeholder={PLACEHOLDER.phone}
                  />
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 3: endereço ===== */}
          {step === 2 && (
            <>
              <span className="section-kicker">ETAPA 3 DE 6</span>
              <div className="registration-title">Localização</div>
              <p>O endereço será usado na vitrine e no link “Como chegar”.</p>
              <div className="registration-form">
                <label htmlFor="cad-cep">
                  <span>CEP *</span>
                  <input id="cad-cep"
                    autoFocus
                    inputMode="numeric"
                    value={data.cep}
                    onChange={(event) =>
                      update("cep", maskCep(event.target.value))
                    }
                    placeholder={PLACEHOLDER.cep}
                  />
                </label>
                <label htmlFor="cad-endereco">
                  <span>ENDEREÇO *</span>
                  <input id="cad-endereco"
                    value={data.address}
                    onChange={(event) => update("address", event.target.value)}
                  />
                </label>
                <label htmlFor="cad-numero">
                  <span>NÚMERO *</span>
                  <input id="cad-numero"
                    value={data.number}
                    onChange={(event) => update("number", event.target.value)}
                  />
                </label>
                <label htmlFor="cad-complemento">
                  <span>COMPLEMENTO</span>
                  <input id="cad-complemento"
                    value={data.complement}
                    onChange={(event) =>
                      update("complement", event.target.value)
                    }
                  />
                </label>
                <label htmlFor="cad-bairro">
                  <span>BAIRRO</span>
                  <input id="cad-bairro"
                    value={data.neighborhood}
                    onChange={(event) =>
                      update("neighborhood", event.target.value)
                    }
                  />
                </label>
                <label htmlFor="cad-cidade">
                  <span>CIDADE *</span>
                  <input id="cad-cidade"
                    value={data.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                </label>
                <label htmlFor="cad-estado">
                  <span>ESTADO *</span>
                  <input id="cad-estado"
                    maxLength={2}
                    value={data.state}
                    onChange={(event) =>
                      update("state", event.target.value.toUpperCase())
                    }
                  />
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 4: categorias e serviços iniciais ===== */}
          {step === 3 && (
            <>
              <span className="section-kicker">ETAPA 4 DE 6</span>
              <div className="registration-title">Categorias e serviços</div>
              <p>
                Primeiro crie os grupos do catálogo e depois adicione os
                serviços dentro de cada grupo.
              </p>
              <div className="category-field-help">
                <strong>O que devo escrever como categoria?</strong>
                <small>
                  Digite o nome de um grupo de serviços, como Pilates,
                  Consultas, Cabelo ou Massagens. O sistema não permite duas
                  categorias com o mesmo nome.
                </small>
              </div>
              <div className="registration-category-create">
                <input
                  autoFocus
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addCategory()}
                  placeholder="Nome da categoria — Ex.: Pilates"
                />
                <Action onClick={addCategory}>
                  <Icon name="plus" size={14} />
                  Criar categoria
                </Action>
              </div>
              <div className="registration-chips">
                {categories.map((category) => (
                  <span key={category}>
                    {category}
                    <button
                      type="button"
                      onClick={() =>
                        setCategories((current) =>
                          current.filter((item) => item !== category),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {categories.length > 0 && (
                <div className="initial-service-form">
                  <strong>Adicionar serviço inicial</strong>
                  <p className="service-form-help">
                    Agora informe o nome do serviço e selecione em qual
                    categoria ele deve aparecer.
                  </p>
                  <div className="registration-form">
                    <label htmlFor="cad-nome-do-servico">
                      <span>NOME DO SERVIÇO</span>
                      <input id="cad-nome-do-servico"
                        value={serviceDraft.name}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Avaliação inicial"
                      />
                    </label>
                    <label htmlFor="cad-categoria-do-servico">
                      <span>CATEGORIA DO SERVIÇO</span>
                      <select id="cad-categoria-do-servico"
                        value={serviceDraft.category}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione a categoria</option>
                        {categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="cad-duracao-em-minutos">
                      <span>DURAÇÃO (EM MINUTOS)</span>
                      <input id="cad-duracao-em-minutos"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="Ex.: 60"
                        value={serviceDraft.duration}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            duration: event.target.value,
                          }))
                        }
                      />
                      <small className="field-hint">
                        Considerado em minutos. Ex.: 90 = 1h30.
                      </small>
                    </label>
                    <label htmlFor="cad-preco-em-reais">
                      <span>PREÇO (EM REAIS)</span>
                      <input id="cad-preco-em-reais"
                        inputMode="numeric"
                        placeholder={PLACEHOLDER.money}
                        value={serviceDraft.price}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            price: maskMoney(event.target.value),
                          }))
                        }
                      />
                      <small className="field-hint">
                        Valor em reais. Digite só os números.
                      </small>
                    </label>
                    <label htmlFor="cad-descricao" className="wide">
                      <span>DESCRIÇÃO</span>
                      <textarea id="cad-descricao"
                        rows={2}
                        value={serviceDraft.description}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <Action variant="secondary" onClick={addInitialService}>
                    Adicionar serviço à lista
                  </Action>
                  <div className="initial-service-list">
                    {initialServices.map((service) => (
                      <span key={service.id}>
                        <strong>{service.name}</strong>
                        <small>
                          {service.category} ·{" "}
                          {formatDuration(service.duration)} ·{" "}
                          {formatPrice(service.price)}
                        </small>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {/* ===== ETAPA 5: identidade da vitrine (textos, logo e capa) ===== */}
          {step === 4 && (
            <>
              <span className="section-kicker">ETAPA 5 DE 6</span>
              <div className="registration-title">Identidade e vitrine</div>
              <p>
                Defina como sua empresa aparece na vitrine. As cores seguem o
                padrão do Prontto.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-assinatura-da-marca" className="wide">
                  <span>ASSINATURA DA MARCA *</span>
                  <input id="cad-assinatura-da-marca"
                    value={data.tagline}
                    onChange={(event) => update("tagline", event.target.value)}
                    placeholder="Ex.: MOVIMENTO & SAÚDE"
                  />
                </label>
                <label htmlFor="cad-titulo-principal" className="wide">
                  <span>TÍTULO PRINCIPAL *</span>
                  <input id="cad-titulo-principal"
                    value={data.heroTitle}
                    onChange={(event) =>
                      update("heroTitle", event.target.value)
                    }
                    placeholder="Mensagem principal da vitrine"
                  />
                </label>
                <label htmlFor="cad-apresentacao" className="wide">
                  <span>APRESENTAÇÃO *</span>
                  <textarea id="cad-apresentacao"
                    rows={3}
                    value={data.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="registration-uploads">
                <label htmlFor="cad-logo">
                  <span>LOGO</span>
                  <input id="cad-logo"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      readImage(event.target.files?.[0], setLogoImage)
                    }
                  />
                  <div>
                    {logoImage ? (
                      <img src={logoImage} alt="" />
                    ) : (
                      <>
                        <Icon name="plus" />
                        <small>Adicionar logo</small>
                      </>
                    )}
                  </div>
                </label>
                <label htmlFor="cad-imagem-da-vitrine">
                  <span>IMAGEM DA VITRINE</span>
                  <input id="cad-imagem-da-vitrine"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      readImage(event.target.files?.[0], setHeroImage)
                    }
                  />
                  <div>
                    {heroImage ? (
                      <img src={heroImage} alt="" />
                    ) : (
                      <>
                        <Icon name="plus" />
                        <small>Adicionar imagem</small>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 6: revisão, termos e aceites ===== */}
          {step === 5 && (
            <>
              <span className="section-kicker">ETAPA 6 DE 6</span>
              <div className="registration-title">Tudo pronto para começar</div>
              <p>Revise o resumo antes de criar o espaço da sua empresa.</p>
              <div className="registration-review">
                <div>
                  <small>EMPRESA</small>
                  <strong>{data.companyName}</strong>
                  <span>
                    {data.businessType} · {data.document} · {data.contactEmail}
                  </span>
                </div>
                <div>
                  <small>GESTOR</small>
                  <strong>{data.ownerName}</strong>
                  <span>
                    {data.email} · {data.whatsapp}
                  </span>
                </div>
                <div>
                  <small>LOCALIZAÇÃO</small>
                  <strong>
                    {data.city} — {data.state}
                  </strong>
                  <span>
                    {data.address}, {data.number}
                  </span>
                </div>
                <div>
                  <small>CATÁLOGO INICIAL</small>
                  <strong>{categories.length} categorias</strong>
                  <span>{initialServices.length} serviços cadastrados</span>
                </div>
                <div>
                  <small>IDENTIDADE</small>
                  <strong>{data.tagline}</strong>
                  <span>{data.heroTitle}</span>
                </div>
              </div>
              <div className="registration-ready">
                <Icon name="check" />
                <span>
                  <strong>
                    Seu painel e sua vitrine serão criados juntos.
                  </strong>
                  <small>
                    Você poderá alterar todas essas informações na área da
                    gestora.
                  </small>
                </span>
              </div>
              <div className="registration-form" style={{ marginTop: 22 }}>
                <div className="wide">
                  <strong style={{ display: "block", marginBottom: 14 }}>
                    Termos e condições
                  </strong>
                  <label htmlFor="cad-termos-de-atendimento-da"
                    className="pf-check wide"
                    style={{ alignItems: "flex-start", marginBottom: 14 }}
                  >
                    <input id="cad-termos-de-atendimento-da"
                      type="checkbox"
                      checked={acceptClinicTerms}
                      onChange={(event) =>
                        setAcceptClinicTerms(event.target.checked)
                      }
                    />
                    <span>
                      <strong>Termos de Atendimento da clínica</strong>
                      <small style={{ display: "block", marginTop: 5 }}>
                        Li e aceito as condições de atendimento da{" "}
                        {data.companyName || "minha clínica"}.
                      </small>
                      <a
                        href="#termos-atendimento-clinica"
                        onClick={(event) => {
                          event.preventDefault()
                          notify(
                            clinicTermsFileName
                              ? `Documento anexado: ${clinicTermsFileName}.`
                              : "Os termos de atendimento podem ser anexados em PDF nesta etapa.",
                          )
                        }}
                        style={{ display: "inline-block", marginTop: 7 }}
                      >
                        Visualizar documento
                      </a>
                    </span>
                  </label>
                  <label htmlFor="cad-termos-de-uso-do"
                    className="pf-check wide"
                    style={{ alignItems: "flex-start", marginBottom: 14 }}
                  >
                    <input id="cad-termos-de-uso-do"
                      type="checkbox"
                      checked={acceptPronttoTerms}
                      onChange={(event) =>
                        setAcceptPronttoTerms(event.target.checked)
                      }
                    />
                    <span>
                      <strong>
                        Termos de Uso do Prontto{" "}
                        <b style={{ color: "#B86B77" }}>*</b>
                      </strong>
                      <small style={{ display: "block", marginTop: 5 }}>
                        Li e aceito os termos de uso da plataforma Prontto.
                      </small>
                      <a
                        href="#termos-uso-prontto"
                        onClick={(event) => {
                          event.preventDefault()
                          notify(
                            "Termos de Uso do Prontto — documento demonstrativo.",
                          )
                        }}
                        style={{ display: "inline-block", marginTop: 7 }}
                      >
                        Visualizar documento
                      </a>
                    </span>
                  </label>
                  <label htmlFor="cad-politica-de-privacidade-do"
                    className="pf-check wide"
                    style={{ alignItems: "flex-start", marginBottom: 14 }}
                  >
                    <input id="cad-politica-de-privacidade-do"
                      type="checkbox"
                      checked={acceptPronttoPrivacy}
                      onChange={(event) =>
                        setAcceptPronttoPrivacy(event.target.checked)
                      }
                    />
                    <span>
                      <strong>
                        Política de Privacidade do Prontto{" "}
                        <b style={{ color: "#B86B77" }}>*</b>
                      </strong>
                      <small style={{ display: "block", marginTop: 5 }}>
                        Li e estou ciente de como meus dados são tratados pela
                        plataforma.
                      </small>
                      <a
                        href="#privacidade-prontto"
                        onClick={(event) => {
                          event.preventDefault()
                          notify(
                            "Política de Privacidade do Prontto — documento demonstrativo.",
                          )
                        }}
                        style={{ display: "inline-block", marginTop: 7 }}
                      >
                        Visualizar documento
                      </a>
                    </span>
                  </label>
                  <small
                    style={{
                      color: "#475569",
                      display: "block",
                      marginBottom: 18,
                    }}
                  >
                    * Os aceites dos documentos do Prontto são obrigatórios para
                    criar a conta da gestora.
                  </small>
                </div>
                <label htmlFor="cad-anexar-termos-de-atendimento" className="wide">
                  <span>ANEXAR TERMOS DE ATENDIMENTO (PDF)</span>
                  <input id="cad-anexar-termos-de-atendimento"
                    type="file"
                    // Anexo opcional dos termos da clínica: aceita só PDF de até 5 MB.
                    accept="application/pdf,.pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (
                        file.type !== "application/pdf" &&
                        !file.name.toLowerCase().endsWith(".pdf")
                      ) {
                        notify(
                          "Anexe um arquivo PDF para os termos de atendimento.",
                        )
                        event.target.value = ""
                        return
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        notify("O PDF deve ter no máximo 5 MB.")
                        event.target.value = ""
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        setClinicTermsDocument(String(reader.result))
                        setClinicTermsFileName(file.name)
                        notify(
                          "Termos de atendimento anexados para a demonstração.",
                        )
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {clinicTermsFileName && (
                  <div className="registration-ready">
                    <Icon name="check" />
                    <span>
                      <strong>{clinicTermsFileName}</strong>
                      <small>
                        PDF anexado. A cliente poderá abrir e confirmar que leu
                        os termos.
                      </small>
                      <button
                        type="button"
                        className="forgot-password"
                        onClick={() => {
                          setClinicTermsDocument("")
                          setClinicTermsFileName("")
                        }}
                      >
                        Remover arquivo
                      </button>
                    </span>
                  </div>
                )}
                <small style={{ color: "#475569" }}>
                  Os textos são exemplos editáveis. O PDF é opcional nesta
                  demonstração; se nenhum arquivo for anexado, a cliente verá os
                  termos escritos acima.
                </small>
              </div>
            </>
          )}
          {/* Rodapé: 'Voltar' (ou 'Cancelar' na 1ª etapa) e 'Continuar' (ou 'Criar empresa' na última). */}
          <div className="registration-actions">
            <Action
              variant="secondary"
              onClick={() =>
                step === 0 ? onBack() : setStep((current) => current - 1)
              }
            >
              {step === 0 ? "Cancelar" : "Voltar"}
            </Action>
            {step < 5 ? (
              <Action onClick={next}>
                Continuar <Icon name="arrow" size={15} />
              </Action>
            ) : (
              <Action onClick={complete}>Criar empresa e acessar painel</Action>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default CompanyRegistrationPage
