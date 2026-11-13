/**
 * Link do Instagram da clínica a partir do que a gestora digitou
 * ("@cabeauty", "cabeauty" ou o endereço completo).
 * Devolve { url, label } ou null quando não há perfil.
 */
export function instagramLink(value) {
  const raw = (value ?? "").trim()
  if (!raw) return null
  const handle = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#\s]/)[0]
  if (!handle) return null
  return { url: `https://www.instagram.com/${handle}/`, label: `@${handle}` }
}
