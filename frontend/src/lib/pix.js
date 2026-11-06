/* ---------- Pix: monta o "copia e cola" no padrão BR Code (EMV) ----------
 * O código Pix é uma sequência de campos no formato ID + TAMANHO + VALOR,
 * terminando com um código de verificação (CRC16). Aqui é só demonstração:
 * nenhum pagamento real é feito. Também tem máscaras do cartão (simulado). */
/**
 * Calcula o CRC16 exigido ao final do payload Pix.
 */
const crc16 = (payload) => {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

/**
 * Codifica um campo no formato identificador, tamanho e valor do padrão EMV.
 */
const emv = (id, value) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`

/**
 * Normaliza textos do recebedor para os limites aceitos pelo payload Pix.
 */
const cleanText = (value, max) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max)

/**
 * Monta o código Pix copia e cola usado na demonstração.
 */
const buildPixPayload = ({ key, name, city, amount, txid }) => {
  const body =
    // 00 = versão, 26 = chave Pix, 53 = moeda (986 = real), 54 = valor,
    // 58 = país, 59 = nome, 60 = cidade, 62 = id da transação, 6304 = início do CRC.
    emv("00", "01") +
    emv("01", "12") +
    emv("26", emv("00", "br.gov.bcb.pix") + emv("01", key)) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", amount.toFixed(2)) +
    emv("58", "BR") +
    emv("59", cleanText(name, 25)) +
    emv("60", cleanText(city, 15)) +
    emv("62", emv("05", txid)) +
    "6304"
  return body + crc16(body)
}

/**
 * Gera uma sequência alfanumérica aleatória com o tamanho solicitado.
 */
const randomAlnum = (n) =>
  Array.from(
    { length: n },
    () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
  ).join("")

/**
 * Gera um identificador demonstrativo de transação Pix
 * (E + 8 dígitos + data/hora + 11 caracteres = 32).
 */
const makeEndToEndId = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `E00000000${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${randomAlnum(11)}`
}

/**
 * Formata segundos restantes no padrão minutos e segundos.
 */
const formatClock = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

/* Cartão (mock): máscaras e bandeira */
/**
 * Aplica agrupamento visual ao número do cartão.
 */
const formatCardNumber = (v) =>
  v.replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim()

/**
 * Formata a validade do cartão no padrão MM/AA.
 */
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

/**
 * Identifica a bandeira provável a partir do início do número do cartão.
 */
const cardBrandOf = (n) => {
  const d = n.replace(/\D/g, "")
  if (/^4/.test(d)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard"
  if (/^3[47]/.test(d)) return "Amex"
  return "Cartão"
}

export {
  buildPixPayload,
  cardBrandOf,
  formatCardNumber,
  formatClock,
  formatExpiry,
  makeEndToEndId,
}
