/**
 * Agendamento escolhido por uma VISITANTE (sem login), guardado enquanto ela
 * entra na conta ou se cadastra. Depois do login, a área da cliente recupera a
 * escolha (serviço, dia e horário) e segue direto para a confirmação.
 *
 * Fica no sessionStorage: vale só para esta aba e some ao fechá-la.
 * Uma escolha por clínica (chave com o slug).
 */
const key = (slug) => `prontto.agendamentoPendente.${slug}`

/** Validade da escolha guardada: depois disso, ela é ignorada. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000 // 2 horas

/** Guarda a escolha: { serviceId, dateIso: "YYYY-MM-DD", time: "HH:mm" }. */
export function savePendingBooking(slug, booking) {
  try {
    window.sessionStorage.setItem(
      key(slug),
      JSON.stringify({ ...booking, savedAt: Date.now() }),
    )
  } catch {
    // Navegador bloqueou o armazenamento: a cliente só terá que escolher de novo.
  }
}

/** Lê a escolha guardada (sem apagar). Devolve null se não houver ou se venceu. */
export function readPendingBooking(slug) {
  try {
    const raw = window.sessionStorage.getItem(key(slug))
    if (!raw) return null
    const booking = JSON.parse(raw)
    if (!booking?.serviceId || !booking?.dateIso || !booking?.time) return null
    if (Date.now() - (booking.savedAt ?? 0) > MAX_AGE_MS) return null
    return booking
  } catch {
    return null
  }
}

/** Apaga a escolha guardada (depois de recuperada). */
export function clearPendingBooking(slug) {
  try {
    window.sessionStorage.removeItem(key(slug))
  } catch {
    // nada a fazer
  }
}
