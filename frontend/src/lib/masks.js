/**
 * Máscaras de digitação dos campos (o usuário digita só números e a máscara
 * monta o formato). O valor enviado ao backend é sempre o número "limpo":
 * use onlyDigits() ou parseMoney() antes de enviar.
 */

/** Remove tudo que não for dígito. */
export const onlyDigits = (value = "") => String(value).replace(/\D/g, "")

/** (11) 99999-9999 para celular ou (11) 9999-9999 para fixo. */
export function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 00000-000 */
export function maskCep(value) {
  const d = onlyDigits(value).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

/** CPF 000.000.000-00 (até 11 dígitos) ou CNPJ 00.000.000/0000-00 (14 dígitos). */
export function maskCpfCnpj(value) {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11)
    return d
      // Cada replace coloca um separador: 000.000.000-00
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2")
  return d
    // CNPJ: 00.000.000/0000-00
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

/**
 * Dinheiro digitado como centavos: "15000" vira "R$ 150,00".
 * Use parseMoney() para obter o número (150) enviado ao backend.
 */
export function maskMoney(value) {
  // Tira zeros à esquerda e limita a 9 dígitos (até R$ 9.999.999,99).
  const d = onlyDigits(value).replace(/^0+(?=\d)/, "").slice(0, 9)
  if (!d) return ""
  const cents = Number(d) / 100
  return cents.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** "R$ 1.250,50" → 1250.5 (número). Vazio → NaN. */
export function parseMoney(value) {
  const d = onlyDigits(value)
  return d ? Number(d) / 100 : Number.NaN
}

/** Número (150) → texto já mascarado ("R$ 150,00") para preencher um campo. */
export const moneyToMask = (number) =>
  Number.isFinite(Number(number)) && number !== "" && number !== null
    ? maskMoney(Math.round(Number(number) * 100))
    : ""

/** Placeholders padronizados dos campos com máscara. */
export const PLACEHOLDER = {
  phone: "(__) _____-____",
  cep: "_____-___",
  cpfCnpj: "___.___.___-__ ou __.___.___/____-__",
  money: "R$ __,__",
}
