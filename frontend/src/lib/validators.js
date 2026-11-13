/*
 * PADRÃO DESTE ARQUIVO: cada função recebe o valor digitado e devolve
 *   ""         → valor válido (string vazia = sem erro)
 *   "mensagem" → texto do erro, já explicando como corrigir.
 * Assim a tela só precisa fazer: const erro = emailError(email); if (erro) ...
 */
/* ---------- Validações com sugestão de correção (RF06, WCAG 3.3.3) ---------- */
/**
 * Valida se o nome informado contém nome e sobrenome.
 */
const nameError = (v) =>
  v.trim().split(/\s+/).length >= 2
    ? ""
    : "Informe seu nome completo, com nome e sobrenome."

/**
 * Valida um celular brasileiro com DDD.
 */
const phoneError = (v) => {
  // Campo vazio: pede para preencher (mensagem diferente de "formato errado").
  if (!String(v ?? "").trim())
    return "Informe o número do celular com DDD. Exemplo: (11) 98765-4321."
  // Regex: 2 dígitos de DDD + 9 + 8 dígitos (11 números no total).
  return /^\d{2}9\d{8}$/.test(v.replace(/\D/g, ""))
    ? ""
    : "Por favor, insira o telefone com DDD no formato (11) 9XXXX-XXXX."
}

/**
 * Valida a estrutura básica de um endereço de e-mail.
 * Vazio → pede para preencher; preenchido fora do formato → explica o formato.
 */
const emailError = (v) => {
  if (!String(v ?? "").trim())
    return "Informe o e-mail. Exemplo: nome@email.com."
  // Regex: algo@algo.algo, sem espaços.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    ? ""
    : "O e-mail precisa ter @ e domínio. Exemplo: nome@email.com."
}

/**
 * Valida o tamanho e a composição mínima da senha.
 */
const passwordError = (v) =>
  v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)
    ? ""
    : "Use pelo menos 8 caracteres, combinando letras e números."

/** Idade mínima para cadastro: cliente 15 anos, gestora (abrir clínica) 16 anos. */
const MIN_AGE_CLIENT = 15
const MIN_AGE_MANAGER = 16

/**
 * Valida a data de nascimento (ISO "YYYY-MM-DD") e a idade mínima.
 * A mesma regra precisa ser validada no backend: o MySQL não aceita a data
 * de hoje dentro de um CHECK, então a idade mínima não é uma restrição do banco.
 */
const birthError = (v, minAge = MIN_AGE_CLIENT) => {
  if (!v) return "Informe a data de nascimento no formato DD/MM/AAAA."
  const b = new Date(`${v}T00:00:00`)
  if (Number.isNaN(b.getTime()))
    return "Data inválida. Use o formato DD/MM/AAAA."
  const t = new Date()
  // Calcula a idade: diferença de anos, menos 1 se o aniversário deste ano ainda não chegou.
  let age = t.getFullYear() - b.getFullYear()
  if (
    t.getMonth() < b.getMonth() ||
    (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())
  )
    age--
  if (age >= minAge) return ""
  return minAge === MIN_AGE_MANAGER
    ? `É preciso ter pelo menos ${MIN_AGE_MANAGER} anos para abrir uma clínica no Prontto.`
    : `O cadastro é permitido a partir de ${minAge} anos. Confira a data informada.`
}

/** Dígitos verificadores de CPF (11 dígitos) ou CNPJ (14 dígitos). */
function validCpfCnpj(digits) {
  // Números repetidos (111.111.111-11) passam no cálculo, mas são inválidos.
  if (/^(\d)\1+$/.test(digits)) return false
  // Cálculo oficial do dígito verificador: multiplica cada dígito pelo seu peso,
  // soma tudo e usa o resto da divisão por 11.
  const calc = (base, weights) => {
    const sum = weights.reduce((acc, w, i) => acc + Number(base[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  if (digits.length === 11) {
    const d1 = calc(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2])
    const d2 = calc(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    return d1 === Number(digits[9]) && d2 === Number(digits[10])
  }
  if (digits.length === 14) {
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const d1 = calc(digits, w1)
    const d2 = calc(digits, [6, ...w1])
    return d1 === Number(digits[12]) && d2 === Number(digits[13])
  }
  return false
}

/** CPF/CNPJ da empresa (obrigatório, guardado em CLINICA.cpf_cnpj). */
const cpfCnpjError = (v) => {
  const digits = String(v ?? "").replace(/\D/g, "")
  if (!digits) return "Informe o CPF ou o CNPJ da empresa."
  if (digits.length !== 11 && digits.length !== 14)
    return "Digite os 11 números do CPF ou os 14 números do CNPJ."
  return validCpfCnpj(digits) ? "" : "CPF ou CNPJ inválido. Confira os números."
}

/** CEP com 8 dígitos. */
const cepError = (v) =>
  String(v ?? "").replace(/\D/g, "").length === 8
    ? ""
    : "Digite os 8 números do CEP."

/**
 * O e-mail de contato da clínica (exibido na vitrine) não pode ser o mesmo
 * e-mail de acesso da gestora, por segurança. O backend repete esta validação.
 */
const sameEmailsError = (accessEmail, contactEmail) =>
  accessEmail.trim().toLowerCase() &&
  accessEmail.trim().toLowerCase() === contactEmail.trim().toLowerCase()
    ? "Por segurança, o e-mail de contato da clínica precisa ser diferente do e-mail de acesso."
    : ""

/**
 * Valida respostas obrigatórias e detalhes condicionais da ficha de anamnese.
 */
const validateAnamnesis = (h) => {
  const next = {}
  // Perguntas que precisam ter resposta (Sim/Não).
  const required = [
    "alergia",
    "reacaoProduto",
    "condicaoTratamento",
    "medicamentos",
    "alteracaoAtual",
    "condicaoOcular",
    "herpesLabial",
    "lentesContato",
    "gravidezAmamentacao",
    "complicacaoAnterior",
    "procedimentosAnteriores",
    "problemaProcedimento",
    "informacaoAdicional",
  ]
  required.forEach((key) => {
    if (!String(h[key] ?? "").trim())
      next[String(key)] = "Selecione uma opção para continuar."
  })
  // Regra geral: se a resposta for 'Sim', o campo de detalhe passa a ser obrigatório.
  if (h.alergia === "Sim" && !h.alergiaDetalhe.trim())
    next.alergiaDetalhe = "Descreva a alergia."
  if (h.reacaoProduto === "Sim" && !h.reacaoProdutoDetalhe.trim())
    next.reacaoProdutoDetalhe = "Informe o produto e a reação."
  if (h.condicaoTratamento === "Sim" && !h.condicaoTratamentoDetalhe.trim())
    next.condicaoTratamentoDetalhe = "Informe a condição ou tratamento."
  if (h.medicamentos === "Sim" && !h.medicamentosDetalhe.trim())
    next.medicamentosDetalhe = "Informe os medicamentos ou produtos."
  if (
    h.alteracaoAtual === "Sim" &&
    h.sinaisAtuais.length === 0 &&
    !h.alteracaoAtualDetalhe.trim()
  )
    next.alteracaoAtualDetalhe = "Selecione os sinais ou descreva outro."
  if (h.sinaisAtuais.includes("Outro") && !h.alteracaoAtualDetalhe.trim())
    next.alteracaoAtualDetalhe = "Descreva o outro sinal."
  if (h.condicaoOcular === "Sim" && !h.condicaoOcularDetalhe.trim())
    next.condicaoOcularDetalhe =
      "Informe a alteração nas unhas, cílios, sobrancelhas ou lábios."
  if (h.complicacaoAnterior === "Sim" && !h.complicacaoAnteriorDetalhe.trim())
    next.complicacaoAnteriorDetalhe =
      "Descreva o procedimento e o que aconteceu."
  if (
    h.procedimentosAnteriores === "Sim" &&
    h.procedimentos.length === 0 &&
    !h.outroProcedimento.trim()
  )
    next.procedimentos = "Selecione os procedimentos ou informe outro."
  if (h.problemaProcedimento === "Sim" && !h.problemaProcedimentoDetalhe.trim())
    next.problemaProcedimentoDetalhe = "Descreva o problema ocorrido."
  if (h.informacaoAdicional === "Sim" && !h.informacaoAdicionalDetalhe.trim())
    next.informacaoAdicionalDetalhe =
      "Descreva a informação que deseja compartilhar."
  if (!h.cienciaInformacoes)
    next.cienciaInformacoes = "Confirme que leu a declaração da cliente."
  return next
}

export {
  MIN_AGE_CLIENT,
  MIN_AGE_MANAGER,
  birthError,
  cepError,
  cpfCnpjError,
  emailError,
  sameEmailsError,
  nameError,
  passwordError,
  phoneError,
  validateAnamnesis,
}
