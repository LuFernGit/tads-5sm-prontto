/** MOCK — dados demonstrativos de agenda e atendimentos da gestora. */

/** Data ISO (YYYY-MM-DD) do dia "offset" da semana atual (0 = segunda-feira). */
export function isoInCurrentWeek(offset) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  const fromMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - fromMonday + offset)
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Próximos atendimentos do painel (bloco lateral "Próximas clientes"). */
const nextAppointments = [
  {
    id: "carolina",
    time: "11:00",
    end: "12:30",
    name: "Carolina Alves",
    initial: "C",
    alt: false,
    service: "Nail Design",
    detail: "Fibra de Vidro · manutenção",
    status: "Confirmado",
    signal: "Isenta de sinal",
  },
  {
    id: "veronica",
    time: "14:30",
    end: "16:00",
    name: "Verônica Lima",
    initial: "V",
    alt: true,
    service: "Estética Labial",
    detail: "Hidra Gloss",
    status: "Confirmado",
    signal: "Sinal pago (Pix)",
  },
  {
    id: "sandra",
    time: "17:30",
    end: "19:00",
    name: "Sandra Oliveira",
    initial: "S",
    alt: false,
    service: "Estética Labial",
    detail: "Hidra Gloss",
    status: "Pendente",
    signal: "Sinal pendente",
  },
]

/** Horário de funcionamento inicial (vira linhas da tabela HORARIO). */
const initialRules = [
  ["SEGUNDA", "Segunda-feira"],
  ["TERCA", "Terça-feira"],
  ["QUARTA", "Quarta-feira"],
  ["QUINTA", "Quinta-feira"],
  ["SEXTA", "Sexta-feira"],
  ["SABADO", "Sábado"],
  ["DOMINGO", "Domingo"],
].map(([dia, label]) => ({
  dia,
  label,
  ativo: dia !== "DOMINGO",
  inicio: "09:00",
  fim: "19:00",
  almocoIni: "12:00",
  almocoFim: "13:00",
}))

/**
 * Agendamentos vistos pela gestora, no formato que o backend devolve
 * (AGENDAMENTO + nome/WhatsApp da cliente vindos de USUARIO).
 */
const sampleManagerAppointments = [
  {
    id: "ag-1",
    cliente: "Jamily Souza",
    whatsapp: "5511999881111",
    nomeProcedimento: "Volume Brasileiro",
    data: isoInCurrentWeek(1),
    hora: "09:00",
    duracao: 120,
    status: "CONFIRMADO",
  },
  {
    id: "ag-2",
    cliente: "Carolina Alves",
    whatsapp: "5511999882222",
    nomeProcedimento: "Fibra de Vidro",
    data: isoInCurrentWeek(0),
    hora: "14:00",
    duracao: 120,
    status: "PENDENTE",
  },
  {
    id: "ag-3",
    cliente: "Verônica Lima",
    whatsapp: "5511999883333",
    nomeProcedimento: "Hidra Gloss",
    data: isoInCurrentWeek(2),
    hora: "13:00",
    duracao: 60,
    status: "CONFIRMADO",
  },
  {
    id: "ag-4",
    cliente: "Marina Costa",
    whatsapp: "5511999884444",
    nomeProcedimento: "Hidra Gloss",
    data: isoInCurrentWeek(4),
    hora: "09:00",
    duracao: 60,
    status: "CONFIRMADO",
  },
]

/** Bloqueio de exemplo (tabela BLOQUEIO_HORARIO). */
const sampleBlocks = [
  {
    id: 1,
    data: isoInCurrentWeek(3),
    inicio: "15:00",
    fim: "16:00",
    motivo: "Curso",
  },
]

/** Horários livres de exemplo mostrados à cliente no agendamento. */
// A clínica fecha às 19h: a tela só mostra o horário se o serviço TERMINAR até 19h
// (fitsBusinessHours em src/lib/booking.js). Por isso não há horário às 19:00.
const timePeriods = [
  {
    label: "MANHÃ",
    slots: [
      { time: "09:00", occupied: false },
      { time: "10:00", occupied: false },
      { time: "11:00", occupied: false },
      { time: "11:30", occupied: true },
    ],
  },
  {
    label: "TARDE",
    slots: [
      { time: "13:00", occupied: false },
      { time: "14:00", occupied: false },
      { time: "15:00", occupied: true },
      { time: "16:00", occupied: false },
    ],
  },
  {
    label: "NOITE",
    slots: [
      { time: "17:00", occupied: false },
      { time: "17:30", occupied: false },
      { time: "18:00", occupied: false },
      { time: "18:30", occupied: false },
    ],
  },
]

export {
  initialRules,
  nextAppointments,
  sampleBlocks,
  sampleManagerAppointments,
  timePeriods,
}
