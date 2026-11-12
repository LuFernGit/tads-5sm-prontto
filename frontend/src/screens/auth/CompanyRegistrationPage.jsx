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
  passwordError,
  phoneError,
  sameEmailsError,
} from "@/lib/validators"
import { useFieldErrors } from "@/hooks/useFieldErrors"
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
  // Etapa mais distante já alcançada: até ela, a lista lateral é clicável.
  const [maxStep, setMaxStep] = useState(0)
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
    confirmPassword: "", // só na tela: confere se a senha foi digitada igual
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
  // Erros por campo (borda vermelha + orientação embaixo) — hooks/useFieldErrors.
  const { a11y, errorFor, showErrors, clearError, setErrors } =
    useFieldErrors(notify)
  /** Atualiza um campo de 'data' sem apagar os outros. Ex.: update('city', 'São Paulo'). */
  const update = (field, value) =>
    setData((current) => ({ ...current, [field]: value }))
  /**
   * Lê a imagem escolhida no computador e guarda como texto base64 (data URL).
   * Aceita só imagens de até 5 MB. 'setter' guarda o resultado e 'id' é o
   * campo onde o erro aparece.
   */
  const readImage = (file, setter, id) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showErrors({
        [id]: "Escolha uma imagem JPG, PNG ou WEBP de até 5 MB. Se a foto for maior, reduza o tamanho dela antes de enviar.",
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      clearError(id)
      setter(String(reader.result))
    }
    reader.readAsDataURL(file)
  }
  /** Adiciona uma categoria nova, sem permitir repetidas (ignora acentos e maiúsculas). */
  const addCategory = () => {
    const category = newCategory.trim()
    if (!category) {
      showErrors({
        "cad-nova-categoria":
          "Digite o nome da categoria e depois clique em “Criar categoria”. Exemplo: Pilates.",
      })
      return
    }
    if (
      categories.some(
        (item) =>
          normalizeCategoryName(item) === normalizeCategoryName(category),
      )
    ) {
      showErrors({
        "cad-nova-categoria": `A categoria “${category}” já existe. Use outro nome ou escolha a categoria já criada.`,
      })
      return
    }
    clearError("cad-nova-categoria")
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
    const found = {}
    if (!serviceDraft.name.trim())
      found["cad-nome-do-servico"] =
        "Informe o nome do serviço. Exemplo: Avaliação inicial."
    if (!serviceDraft.category)
      found["cad-categoria-do-servico"] =
        "Escolha na lista em qual categoria o serviço vai aparecer."
    if (!Number.isInteger(minutes) || minutes <= 0)
      found["cad-duracao-em-minutos"] =
        "Informe a duração em minutos, só com números. Exemplo: 60."
    if (!Number.isFinite(numericPrice))
      found["cad-preco-em-reais"] =
        "Informe o preço em reais, só com números. Exemplo: 150,00."
    if (showErrors(found)) return
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
   * Devolve { "id-do-campo": "como corrigir" } — vazio se estiver tudo certo.
   * Cada mensagem diz o que fazer, com exemplo (WCAG 3.3.3).
   */
  const validateStep = () => {
    const found = {}
    const check = (id, message) => {
      if (message && !found[id]) found[id] = message
    }
    if (step === 0) {
      check(
        "cad-nome-da-empresa",
        !data.companyName.trim() &&
          "Informe o nome da empresa, como ele deve aparecer na vitrine.",
      )
      check(
        "cad-tipo-de-negocio",
        !data.businessType && "Escolha o tipo de negócio na lista.",
      )
      check("cad-cpf-cnpj", cpfCnpjError(data.document))
      check("cad-e-mail-de-contato", emailError(data.contactEmail))
    }
    if (step === 1) {
      check(
        "cad-nome-completo",
        !data.ownerName.trim() &&
          "Informe o nome completo da responsável pelo painel.",
      )
      check(
        "cad-e-mail-de-acesso",
        emailError(data.email) ||
          sameEmailsError(data.email, data.contactEmail),
      )
      check("cad-data-de-nascimento", birthError(data.birthDate, MIN_AGE_MANAGER))
      check("cad-senha", passwordError(data.password))
      check(
        "cad-confirmar-senha",
        data.confirmPassword !== data.password &&
          "As senhas não são iguais. Digite exatamente a mesma senha nos dois campos.",
      )
      check("cad-whatsapp", phoneError(data.whatsapp))
    }
    if (step === 2) {
      check("cad-cep", cepError(data.cep))
      check(
        "cad-endereco",
        !data.address.trim() && "Informe o endereço (rua ou avenida).",
      )
      check(
        "cad-numero",
        !data.number.trim() &&
          "Informe o número do endereço. Se não houver, digite S/N.",
      )
      check("cad-cidade", !data.city.trim() && "Informe a cidade.")
      check(
        "cad-estado",
        !/^[A-Z]{2}$/.test(data.state) &&
          "Informe o estado com as 2 letras da sigla. Exemplo: SP.",
      )
    }
    if (step === 3 && categories.length === 0)
      check(
        "cad-nova-categoria",
        "Crie pelo menos uma categoria: digite o nome e clique em “Criar categoria”.",
      )
    if (step === 4) {
      check(
        "cad-assinatura-da-marca",
        !data.tagline.trim() &&
          "Informe a assinatura da marca. Exemplo: Estética Premium em São Paulo.",
      )
      check(
        "cad-titulo-principal",
        !data.heroTitle.trim() &&
          "Informe o título principal da vitrine. Exemplo: Realçando sua beleza com naturalidade.",
      )
      check(
        "cad-apresentacao",
        !data.description.trim() &&
          "Escreva um texto curto de apresentação da empresa.",
      )
    }
    return found
  }
  /** Muda de etapa e leva o foco para o título dela (leitor de tela anuncia a etapa). */
  const changeStep = (target) => {
    setErrors({})
    setStep(target)
    setMaxStep((current) => Math.max(current, target))
    requestAnimationFrame(() =>
      document.getElementById("cad-step-title")?.focus(),
    )
  }
  /** Botão de avançar: só vai para a próxima etapa se a atual for válida. */
  const next = () => {
    if (showErrors(validateStep())) return
    changeStep(Math.min(step + 1, 5))
  }
  /** Botão de voltar: volta uma etapa (na primeira, cancela o cadastro). */
  const back = () => {
    if (step === 0) onBack()
    else changeStep(step - 1)
  }
  /**
   * Clique numa etapa da lista lateral.
   * - Voltar para qualquer etapa anterior: sempre pode (os dados ficam salvos).
   * - Avançar: só até a etapa mais distante já alcançada, e só se a etapa
   *   atual estiver correta — assim nenhuma validação é pulada.
   */
  const goToStep = (target) => {
    if (target === step || target > maxStep) return
    if (target > step && showErrors(validateStep())) return
    changeStep(target)
  }
  /**
   * Botão final 'Criar empresa e acessar painel'.
   * Confere os aceites, monta o objeto no formato que o backend espera
   * ({ empresa, gestora, servicos, categorias, aceites }) e envia.
   */
  const complete = () => {
    const found = {}
    if (!acceptClinicTerms)
      found["cad-termos-de-atendimento-da"] =
        "Marque esta caixa para aceitar os termos de atendimento da clínica."
    if (!acceptPronttoTerms)
      found["cad-termos-de-uso-do"] =
        "Marque esta caixa para aceitar os Termos de Uso do Prontto."
    if (!acceptPronttoPrivacy)
      found["cad-politica-de-privacidade-do"] =
        "Marque esta caixa para confirmar que leu a Política de Privacidade."
    if (showErrors(found)) return
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
      servicos: initialServices.map((service) => {
        const sent = { ...service }
        delete sent.id
        return sent
      }),
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
  // Texto dos botões: diz exatamente para onde a pessoa vai (em vez de "Continuar").
  const nextLabels = [
    "Ir para dados do gestor",
    "Ir para localização",
    "Ir para categorias e serviços",
    "Ir para identidade da marca",
    "Revisar cadastro",
  ]
  const backLabels = [
    "Cancelar cadastro",
    "Voltar para empresa",
    "Voltar para dados do gestor",
    "Voltar para localização",
    "Voltar para categorias e serviços",
    "Voltar para identidade da marca",
  ]
  return (
    <main className="registration-page">
      {/* Topo: logo do Prontto e botão para voltar ao login. */}
      <header className="registration-header">
        {/* Logo leva para a página inicial (login da gestora) */}
        <button
          type="button"
          className="brand-home"
          aria-label="Prontto — ir para a página inicial"
          onClick={onBack}
        >
          <Brand />
        </button>
        <button type="button" onClick={onBack}>
          ← Voltar ao login
        </button>
      </header>
      <div className="registration-shell">
        {/* COLUNA ESQUERDA: lista das etapas. 'active' = etapa atual, 'done' = já concluída (✓).
            Etapas já alcançadas são botões: dá para voltar direto (ex.: da 5 para a 2). */}
        <aside className="registration-steps">
          <span>CADASTRO DA EMPRESA</span>
          <strong>Configure seu espaço no Prontto</strong>
          <p>
            As informações criam o painel da gestora e a vitrine apresentada às
            clientes.
          </p>
          <nav aria-label="Etapas do cadastro">
            <ol className="registration-step-list">
              {stepNames.map((name, index) => {
                const state =
                  index === step ? "active" : index < maxStep || index < step ? "done" : ""
                const reachable = index <= maxStep && index !== step
                const content = (
                  <>
                    <i aria-hidden="true">
                      {state === "done" ? "✓" : index + 1}
                    </i>
                    <span>{name}</span>
                    <span className="sr-only">
                      {index === step
                        ? " (etapa atual)"
                        : state === "done"
                          ? " (concluída)"
                          : " (ainda não disponível)"}
                    </span>
                  </>
                )
                return (
                  <li key={name} className={state}>
                    {reachable ? (
                      <button
                        type="button"
                        onClick={() => goToStep(index)}
                        aria-label={`Etapa ${index + 1}: ${name}${
                          state === "done" ? " (concluída)" : ""
                        } — ir para esta etapa`}
                      >
                        {content}
                      </button>
                    ) : (
                      <div aria-current={index === step ? "step" : undefined}>
                        {content}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </aside>
        {/* COLUNA DIREITA: só a etapa atual aparece (cada bloco abaixo tem step === N).
            onInput: ao digitar em qualquer campo, o erro daquele campo some. */}
        <section
          className="registration-content"
          onInput={(event) => clearError(event.target.id)}
          onChange={(event) =>
            event.target.type === "checkbox" && clearError(event.target.id)
          }
        >
          {/* ===== ETAPA 1: dados da empresa ===== */}
          {step === 0 && (
            <>
              <span className="section-kicker">ETAPA 1 DE 6</span>
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>Sobre a empresa</h1>
              <p>
                Comece com os dados jurídicos e o segmento principal do negócio.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-nome-da-empresa">
                  <span>NOME DA EMPRESA *</span>
                  <input {...a11y("cad-nome-da-empresa")}
                    autoFocus
                    value={data.companyName}
                    onChange={(event) =>
                      update("companyName", event.target.value)
                    }
                    placeholder="Nome que será exibido na vitrine"
                  />
                  {errorFor("cad-nome-da-empresa")}
                </label>
                <label htmlFor="cad-tipo-de-negocio">
                  <span>TIPO DE NEGÓCIO *</span>
                  <select {...a11y("cad-tipo-de-negocio")}
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
                  {errorFor("cad-tipo-de-negocio")}
                </label>
                <label htmlFor="cad-cpf-cnpj">
                  <span>CPF / CNPJ *</span>
                  <input {...a11y("cad-cpf-cnpj", "cad-cpf-cnpj-hint")}
                    inputMode="numeric"
                    value={data.document}
                    onChange={(event) =>
                      update("document", maskCpfCnpj(event.target.value))
                    }
                    placeholder={PLACEHOLDER.cpfCnpj}
                  />
                  {errorFor("cad-cpf-cnpj")}
                  <small id="cad-cpf-cnpj-hint" className="field-hint">
                    CPF (profissional autônoma) ou CNPJ da empresa. Digite só os
                    números.
                  </small>
                </label>
                <label htmlFor="cad-e-mail-de-contato">
                  <span>E-MAIL DE CONTATO DA CLÍNICA *</span>
                  <input
                    {...a11y("cad-e-mail-de-contato", "cad-e-mail-de-contato-hint")}
                    type="email"
                    value={data.contactEmail}
                    onChange={(event) =>
                      update("contactEmail", event.target.value)
                    }
                    placeholder="contato@suaempresa.com.br"
                  />
                  {errorFor("cad-e-mail-de-contato")}
                  <small id="cad-e-mail-de-contato-hint" className="field-hint">
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
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>
                Gestor ou profissional responsável
              </h1>
              <p>
                Esses dados serão usados para identificar o acesso
                administrativo.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-nome-completo">
                  <span>NOME COMPLETO *</span>
                  <input {...a11y("cad-nome-completo")}
                    autoFocus
                    autoComplete="name"
                    value={data.ownerName}
                    onChange={(event) =>
                      update("ownerName", event.target.value)
                    }
                  />
                  {errorFor("cad-nome-completo")}
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
                <label htmlFor="cad-data-de-nascimento">
                  <span>DATA DE NASCIMENTO *</span>
                  <input
                    {...a11y("cad-data-de-nascimento", "cad-data-de-nascimento-hint")}
                    type="date"
                    autoComplete="bday"
                    value={data.birthDate}
                    onChange={(event) => update("birthDate", event.target.value)}
                  />
                  {errorFor("cad-data-de-nascimento")}
                  <small id="cad-data-de-nascimento-hint" className="field-hint">
                    É preciso ter pelo menos {MIN_AGE_MANAGER} anos para abrir
                    uma clínica.
                  </small>
                </label>
                <label htmlFor="cad-whatsapp">
                  <span>WHATSAPP *</span>
                  <input {...a11y("cad-whatsapp", "cad-whatsapp-hint")}
                    inputMode="tel"
                    autoComplete="tel"
                    value={data.whatsapp}
                    onChange={(event) =>
                      update("whatsapp", maskPhone(event.target.value))
                    }
                    placeholder={PLACEHOLDER.phone}
                  />
                  {errorFor("cad-whatsapp")}
                  <small id="cad-whatsapp-hint" className="field-hint">
                    Celular com DDD. É o número de contato da clínica na
                    vitrine.
                  </small>
                </label>
                <label htmlFor="cad-e-mail-de-acesso" className="wide">
                  <span>E-MAIL DE ACESSO *</span>
                  <input
                    {...a11y("cad-e-mail-de-acesso", "cad-e-mail-de-acesso-hint")}
                    type="email"
                    autoComplete="username"
                    value={data.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                  {errorFor("cad-e-mail-de-acesso")}
                  <small id="cad-e-mail-de-acesso-hint" className="field-hint">
                    Usado só para entrar no painel; não aparece para as
                    clientes. Por segurança, não use o mesmo e-mail de contato
                    da clínica.
                  </small>
                </label>
                <label htmlFor="cad-senha">
                  <span>SENHA *</span>
                  <input {...a11y("cad-senha", "cad-senha-hint")}
                    type="password"
                    autoComplete="new-password"
                    value={data.password}
                    onChange={(event) => update("password", event.target.value)}
                  />
                  {errorFor("cad-senha")}
                  <small id="cad-senha-hint" className="field-hint">
                    Mínimo de 8 caracteres, com letras e números. Exemplo:
                    Clinica2026.
                  </small>
                </label>
                <label htmlFor="cad-confirmar-senha">
                  <span>CONFIRMAR SENHA *</span>
                  <input {...a11y("cad-confirmar-senha")}
                    type="password"
                    autoComplete="new-password"
                    value={data.confirmPassword}
                    onChange={(event) =>
                      update("confirmPassword", event.target.value)
                    }
                  />
                  {errorFor("cad-confirmar-senha")}
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 3: endereço ===== */}
          {step === 2 && (
            <>
              <span className="section-kicker">ETAPA 3 DE 6</span>
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>Localização</h1>
              <p>O endereço será usado na vitrine e no link “Como chegar”.</p>
              <div className="registration-form">
                <label htmlFor="cad-cep">
                  <span>CEP *</span>
                  <input {...a11y("cad-cep")}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={data.cep}
                    onChange={(event) =>
                      update("cep", maskCep(event.target.value))
                    }
                    placeholder={PLACEHOLDER.cep}
                  />
                  {errorFor("cad-cep")}
                </label>
                <label htmlFor="cad-endereco">
                  <span>ENDEREÇO *</span>
                  <input {...a11y("cad-endereco")}
                    autoComplete="address-line1"
                    value={data.address}
                    onChange={(event) => update("address", event.target.value)}
                  />
                  {errorFor("cad-endereco")}
                </label>
                <label htmlFor="cad-numero">
                  <span>NÚMERO *</span>
                  <input {...a11y("cad-numero")}
                    value={data.number}
                    onChange={(event) => update("number", event.target.value)}
                  />
                  {errorFor("cad-numero")}
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
                  <input {...a11y("cad-cidade")}
                    autoComplete="address-level2"
                    value={data.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                  {errorFor("cad-cidade")}
                </label>
                <label htmlFor="cad-estado">
                  <span>ESTADO *</span>
                  <input {...a11y("cad-estado")}
                    maxLength={2}
                    autoComplete="address-level1"
                    placeholder="Ex.: SP"
                    value={data.state}
                    onChange={(event) =>
                      update("state", event.target.value.toUpperCase())
                    }
                  />
                  {errorFor("cad-estado")}
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 4: categorias e serviços iniciais ===== */}
          {step === 3 && (
            <>
              <span className="section-kicker">ETAPA 4 DE 6</span>
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>Categorias e serviços</h1>
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
              <div className="registration-form registration-category-form">
                <label htmlFor="cad-nova-categoria" className="wide">
                  <span>NOVA CATEGORIA *</span>
                  <div className="registration-category-create">
                    <input {...a11y("cad-nova-categoria")}
                      autoFocus
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        addCategory()
                      }}
                      placeholder="Ex.: Pilates"
                    />
                    <Action onClick={addCategory}>
                      <Icon name="plus" size={14} />
                      Criar categoria
                    </Action>
                  </div>
                  {errorFor("cad-nova-categoria")}
                </label>
              </div>
              <div className="registration-chips">
                {categories.map((category) => (
                  <span key={category}>
                    {category}
                    <button
                      type="button"
                      aria-label={`Remover a categoria ${category}`}
                      onClick={() =>
                        setCategories((current) =>
                          current.filter((item) => item !== category),
                        )
                      }
                    >
                      <span aria-hidden="true">×</span>
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
                      <span>NOME DO SERVIÇO *</span>
                      <input {...a11y("cad-nome-do-servico")}
                        value={serviceDraft.name}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Avaliação inicial"
                      />
                      {errorFor("cad-nome-do-servico")}
                    </label>
                    <label htmlFor="cad-categoria-do-servico">
                      <span>CATEGORIA DO SERVIÇO *</span>
                      <select {...a11y("cad-categoria-do-servico")}
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
                      {errorFor("cad-categoria-do-servico")}
                    </label>
                    <label htmlFor="cad-duracao-em-minutos">
                      <span>DURAÇÃO (EM MINUTOS) *</span>
                      <input
                        {...a11y("cad-duracao-em-minutos", "cad-duracao-em-minutos-hint")}
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
                      {errorFor("cad-duracao-em-minutos")}
                      <small id="cad-duracao-em-minutos-hint" className="field-hint">
                        Considerado em minutos. Ex.: 90 = 1h30.
                      </small>
                    </label>
                    <label htmlFor="cad-preco-em-reais">
                      <span>PREÇO (EM REAIS) *</span>
                      <input {...a11y("cad-preco-em-reais", "cad-preco-em-reais-hint")}
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
                      {errorFor("cad-preco-em-reais")}
                      <small id="cad-preco-em-reais-hint" className="field-hint">
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
                  <div className="initial-service-actions">
                    <Action variant="secondary" onClick={addInitialService}>
                      <Icon name="plus" size={14} />
                      Adicionar serviço à lista
                    </Action>
                  </div>
                  {initialServices.length > 0 && (
                    <p className="initial-service-count" aria-live="polite">
                      {initialServices.length === 1
                        ? "1 serviço adicionado"
                        : `${initialServices.length} serviços adicionados`}
                    </p>
                  )}
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
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>Identidade e vitrine</h1>
              <p>
                Defina como sua empresa aparece na vitrine. As cores seguem o
                padrão do Prontto.
              </p>
              <div className="registration-form">
                <label htmlFor="cad-assinatura-da-marca" className="wide">
                  <span>ASSINATURA DA MARCA *</span>
                  <input {...a11y("cad-assinatura-da-marca")}
                    value={data.tagline}
                    onChange={(event) => update("tagline", event.target.value)}
                    placeholder="Ex.: MOVIMENTO & SAÚDE"
                  />
                  {errorFor("cad-assinatura-da-marca")}
                </label>
                <label htmlFor="cad-titulo-principal" className="wide">
                  <span>TÍTULO PRINCIPAL *</span>
                  <input {...a11y("cad-titulo-principal")}
                    value={data.heroTitle}
                    onChange={(event) =>
                      update("heroTitle", event.target.value)
                    }
                    placeholder="Mensagem principal da vitrine"
                  />
                  {errorFor("cad-titulo-principal")}
                </label>
                <label htmlFor="cad-apresentacao" className="wide">
                  <span>APRESENTAÇÃO *</span>
                  <textarea {...a11y("cad-apresentacao")}
                    rows={3}
                    value={data.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                  {errorFor("cad-apresentacao")}
                </label>
              </div>
              <div className="registration-uploads">
                <label htmlFor="cad-logo">
                  <span>LOGO</span>
                  <input {...a11y("cad-logo")}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      readImage(event.target.files?.[0], setLogoImage, "cad-logo")
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
                  {errorFor("cad-logo")}
                </label>
                <label htmlFor="cad-imagem-da-vitrine">
                  <span>IMAGEM DA VITRINE</span>
                  <input {...a11y("cad-imagem-da-vitrine")}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      readImage(event.target.files?.[0], setHeroImage, "cad-imagem-da-vitrine")
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
                  {errorFor("cad-imagem-da-vitrine")}
                </label>
              </div>
            </>
          )}
          {/* ===== ETAPA 6: revisão, termos e aceites ===== */}
          {step === 5 && (
            <>
              <span className="section-kicker">ETAPA 6 DE 6</span>
              <h1 id="cad-step-title" className="registration-title" tabIndex={-1}>Tudo pronto para começar</h1>
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
                    <input {...a11y("cad-termos-de-atendimento-da")}
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
                      {errorFor("cad-termos-de-atendimento-da")}
                    </span>
                  </label>
                  <label htmlFor="cad-termos-de-uso-do"
                    className="pf-check wide"
                    style={{ alignItems: "flex-start", marginBottom: 14 }}
                  >
                    <input {...a11y("cad-termos-de-uso-do")}
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
                      {errorFor("cad-termos-de-uso-do")}
                    </span>
                  </label>
                  <label htmlFor="cad-politica-de-privacidade-do"
                    className="pf-check wide"
                    style={{ alignItems: "flex-start", marginBottom: 14 }}
                  >
                    <input {...a11y("cad-politica-de-privacidade-do")}
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
                      {errorFor("cad-politica-de-privacidade-do")}
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
          {/* Rodapé: os botões dizem para qual etapa vão (texto claro, sem "Continuar"). */}
          <div className="registration-actions">
            <Action variant="secondary" onClick={back}>
              {step > 0 && <span aria-hidden="true">←</span>}
              {backLabels[step]}
            </Action>
            {step < 5 ? (
              <Action onClick={next}>
                {nextLabels[step]} <Icon name="arrow" size={15} />
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
