import { DEFAULT_CATEGORY_COVER, storefrontCategories } from "@/constants"

/**
 * Localiza os metadados visuais de uma categoria ou fornece valores padrão.
 * covers = { [nome]: capa } enviadas pela gestora (CATEGORIA.capa): quando a
 * categoria tem foto própria, ela substitui a capa padrão.
 */
function getCategoryMeta(name, covers) {
  const meta = storefrontCategories.find((category) => category.name === name) || {
    name,
    copy: "Serviços personalizados para realçar sua beleza e bem-estar.",
    image: DEFAULT_CATEGORY_COVER,
  }
  const cover = covers?.[name]
  return cover ? { ...meta, image: cover } : meta
}

/**
 * Escolhe o ícone mais adequado de acordo com o nome do procedimento.
 */
function procedureIcon(name) {
  const n = name.toLowerCase()
  if (n.includes("lash") || n.includes("sobrancelha")) return "eye"
  if (n.includes("pele")) return "face"
  if (n.includes("hidrata")) return "drop"
  return "sparkle"
}

/**
 * Duração do serviço em minutos (o backend já envia número: SERVICO.duracao).
 * Usa 90 minutos só se o valor vier vazio ou inválido.
 */
function durationInMinutes(value) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 90
}

/**
 * Verifica se um horário comporta a duração do serviço antes do encerramento.
 */
function fitsBusinessHours(time, duration) {
  const [hours, minutes] = time.split(":").map(Number)
  // Converte tudo para minutos do dia e compara com 19h (fim do expediente).
  return hours * 60 + minutes + duration <= 19 * 60
}

export { durationInMinutes, fitsBusinessHours, getCategoryMeta, procedureIcon }
