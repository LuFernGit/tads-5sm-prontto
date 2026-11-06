/**
 * Funções de FORMATAÇÃO para exibir dados na tela (datas, dinheiro, duração)
 * e para normalizar textos (comparar categorias, gerar o slug da URL).
 * Não alteram dados: recebem um valor e devolvem o texto formatado.
 */
/**
 * Converte uma data ISO simples para a ordem brasileira.
 */
const br = (iso) => iso.split("-").reverse().join("/")

/**
 * Remove todos os caracteres não numéricos de um texto.
 */
const digits = (v) => v.replace(/\D/g, "")

/**
 * Calcula quantos dias se passaram desde uma data ISO.
 */
// 86400000 = milissegundos em um dia (1000 * 60 * 60 * 24).
const daysSince = (iso) =>
  Math.max(
    0,
    Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000),
  )

/**
 * Formata um número como valor monetário em reais.
 */
const brl = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/**
 * Preço vindo do backend (número em reais, SERVICO.preco DECIMAL(10,2)) → "R$ 150,00".
 */
const formatPrice = (value) =>
  Number.isFinite(Number(value)) ? brl(Number(value)) : "—"

/**
 * Duração vinda do backend (número em minutos, SERVICO.duracao INT) → "1h30" / "45 min".
 */
const formatDuration = (minutes) => {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return "—"
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`
}

/**
 * Normaliza o nome de uma categoria para comparações sem acentos ou espaços extras.
 */
function normalizeCategoryName(value) {
  return value
    .trim()
    // normalize("NFD") separa a letra do acento; o replace seguinte remove os acentos.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
}

/**
 * Transforma um nome de empresa em um identificador seguro para URL.
 */
// Ex.: "CA Beauty Clínica" → "ca-beauty-clinica" (usado em ?clinica=...).
const toSlug = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export {
  br,
  brl,
  daysSince,
  digits,
  formatDuration,
  formatPrice,
  normalizeCategoryName,
  toSlug,
}
