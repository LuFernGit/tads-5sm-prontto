/**
 * Valida os intervalos de expediente e almoço de uma regra semanal.
 */
// r = regra de um dia: { dia, ativo, inicio, fim, almocoIni, almocoFim } (horários 'HH:mm').
// Comparar strings 'HH:mm' funciona porque têm sempre o mesmo formato.
const ruleError = (r) => {
  if (!r.ativo) return ""
  if (!r.inicio || !r.fim || r.fim <= r.inicio)
    return "O horário de fim precisa ser depois do início."
  const hasLunch = r.almocoIni || r.almocoFim
  if (
    hasLunch &&
    !(
      r.almocoIni &&
      r.almocoFim &&
      r.inicio < r.almocoIni &&
      r.almocoIni < r.almocoFim &&
      r.almocoFim < r.fim
    )
  )
    return "O almoço precisa estar dentro do expediente, com início antes do fim."
  return ""
}

/**
 * Converte as regras da tela em linhas da tabela HORARIO.
 * Com almoço, o dia vira dois blocos: início→almoço e fim do almoço→fim.
 */
const toHorarioRows = (rules) =>
  rules.flatMap((r) => {
    if (!r.ativo)
      return [
        {
          dia_semana: r.dia,
          hora_inicio: `${r.inicio}:00`,
          hora_fim: `${r.fim}:00`,
          ativo: false,
        },
      ]
    if (r.almocoIni && r.almocoFim)
      return [
        {
          dia_semana: r.dia,
          hora_inicio: `${r.inicio}:00`,
          hora_fim: `${r.almocoIni}:00`,
          ativo: true,
        },
        {
          dia_semana: r.dia,
          hora_inicio: `${r.almocoFim}:00`,
          hora_fim: `${r.fim}:00`,
          ativo: true,
        },
      ]
    return [
      {
        dia_semana: r.dia,
        hora_inicio: `${r.inicio}:00`,
        hora_fim: `${r.fim}:00`,
        ativo: true,
      },
    ]
  })

const WEEKDAYS = [
  ["SEGUNDA", "Segunda-feira"],
  ["TERCA", "Terça-feira"],
  ["QUARTA", "Quarta-feira"],
  ["QUINTA", "Quinta-feira"],
  ["SEXTA", "Sexta-feira"],
  ["SABADO", "Sábado"],
  ["DOMINGO", "Domingo"],
]

// '09:00:00' → '09:00'
const hhmm = (value) => (value || "").slice(0, 5)

/**
 * Faz o caminho inverso de toHorarioRows: converte as linhas da tabela HORARIO
 * (uma ou duas faixas por dia) nas regras editáveis da tela, com almoço.
 */
const fromHorarioRows = (rows = []) =>
  WEEKDAYS.map(([dia, label]) => {
    const ranges = rows
      .filter((row) => row.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    const first = ranges[0]
    const last = ranges[ranges.length - 1]
    return {
      dia,
      label,
      ativo: Boolean(first?.ativo),
      inicio: hhmm(first?.hora_inicio) || "09:00",
      fim: hhmm(last?.hora_fim) || "19:00",
      almocoIni: ranges.length > 1 ? hhmm(first.hora_fim) : "",
      almocoFim: ranges.length > 1 ? hhmm(last.hora_inicio) : "",
    }
  })

export { fromHorarioRows, ruleError, toHorarioRows }
