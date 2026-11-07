/**
 * MOCK — agendamentos da cliente de demonstração, no formato que o backend
 * devolve (espelha a tabela AGENDAMENTO). As datas são relativas a hoje para a
 * demonstração funcionar em qualquer dia.
 */

/** Data ISO (YYYY-MM-DD) a "dias" de hoje. */
export function isoFromToday(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const initialAppointments = [
  {
    id: "a1",
    servicoId: "lash-brasileiro",
    nomeProcedimento: "Volume Brasileiro", // AGENDAMENTO.nome_procedimento (snapshot)
    data: isoFromToday(6),
    hora: "09:00",
    duracao: 120,
    valorServico: 170, // AGENDAMENTO.valor_servico (snapshot)
    valorSinal: 51,
    status: "PENDENTE",
  },
  {
    id: "a2",
    servicoId: "lash-brasileiro",
    nomeProcedimento: "Volume Brasileiro",
    data: isoFromToday(20),
    hora: "12:00",
    duracao: 120,
    valorServico: 170,
    valorSinal: 51,
    status: "CONFIRMADO",
  },
  {
    id: "a3",
    servicoId: "lash-brasileiro",
    nomeProcedimento: "Volume Brasileiro",
    data: isoFromToday(-21),
    hora: "13:30",
    duracao: 120,
    valorServico: 150,
    valorSinal: null,
    status: "CONCLUIDO",
  },
  {
    id: "a4",
    servicoId: "lash-brasileiro",
    nomeProcedimento: "Volume Brasileiro",
    data: isoFromToday(-42),
    hora: "12:00",
    duracao: 120,
    valorServico: 150,
    valorSinal: null,
    status: "CANCELADO",
    canceladoPor: "CLIENTE",
    motivoCancelamento: "Solicitado pela cliente",
  },
  {
    id: "a5",
    servicoId: "lash-brasileiro",
    nomeProcedimento: "Volume Brasileiro",
    data: isoFromToday(-63),
    hora: "09:00",
    duracao: 120,
    valorServico: 150,
    valorSinal: null,
    status: "CONCLUIDO",
  },
]

export { initialAppointments }
