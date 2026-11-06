/** @typedef {"login" | "admin" | "client" | "preview"} AppMode */

/**
 * Empresa (tabela CLINICA). As cores da vitrine não são personalizáveis.
 * @typedef {Object} CompanyProfile
 * @property {string} [slug]       CLINICA.slug (gerado pelo backend)
 * @property {"ATIVA"|"ENCERRAMENTO_SOLICITADO"|"ENCERRADA"} [status]
 * @property {string} name
 * @property {string} cpfCnpj      CLINICA.cpf_cnpj (obrigatório, só números)
 * @property {string} ownerName    nome da gestora (USUARIO.nome)
 * @property {string} initials
 * @property {string} tagline
 * @property {string} heroTitle
 * @property {string} description
 * @property {string} phone        CLINICA.whatsapp
 * @property {string} email        CLINICA.email_contato (≠ e-mail de acesso)
 * @property {string} instagram
 * @property {string} address
 * @property {string} [logoImage]
 * @property {string} [favicon]  Ícone da aba no link da cliente (senão usa logoImage)
 * @property {string} heroImage
 * @property {string} [termsOfUse]
 * @property {string} [privacyPolicy]
 * @property {string} [clinicTermsDocument]
 * @property {string} [clinicTermsFileName]
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} duration  minutos (SERVICO.duracao)
 * @property {number} price     reais (SERVICO.preco)
 * @property {boolean} active
 * @property {string} [description]
 * @property {string} [image]
 */

/**
 * @typedef {Object} Workspace
 * @property {CompanyProfile} company
 * @property {Service[]} services
 * @property {string[]} categories
 */

/** @typedef {(message: string) => void} Notify */

/**
 * Pagamento do sinal: SIMULADO no front (mock), não é enviado ao banco.
 * Só o valor do sinal vai para AGENDAMENTO.valor_sinal.
 * @typedef {Object} PaymentInfo
 * @property {string} id
 * @property {string} paidAt
 * @property {number} valor
 * @property {"pix" | "card"} [method]
 * @property {string} [cardBrand]
 * @property {string} [cardLast4]
 * @property {number} [installments]
 */

export {}
