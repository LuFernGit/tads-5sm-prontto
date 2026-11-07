/** MOCK — modelos de mensagem e destinatários demonstrativos do WhatsApp. */

const defaultTemplates = [
  {
    id: "confirmacao",
    nome: "Confirmação de agendamento",
    finalidade: "CONFIRMACAO",
    ativo: true,
    texto:
      "Olá, {nome}! Seu agendamento de {procedimento}, marcado para {data} às {horario}, está confirmado. Será um prazer receber você! — {clinica}",
  },
  {
    id: "cancelamento",
    nome: "Cancelamento de agendamento",
    finalidade: "CANCELAMENTO",
    ativo: true,
    texto:
      "Olá, {nome}! Informamos que seu agendamento de {procedimento}, marcado para {data} às {horario}, precisou ser cancelado. Motivo: {motivo}. Pedimos desculpas pelo transtorno. — {clinica}",
  },
  {
    id: "lembrete",
    nome: "Lembrete de agendamento",
    finalidade: "LEMBRETE",
    ativo: true,
    texto:
      "Olá, {nome}! Passando para lembrar do seu atendimento de {procedimento}, no dia {data} às {horario}. Esperamos você! — {clinica}",
  },
  {
    id: "manutencao",
    nome: "Aviso de manutenção",
    finalidade: "MANUTENCAO",
    ativo: true,
    texto:
      "Olá, {nome}! Informamos que a clínica estará em manutenção em {data}. Entre em contato conosco para verificar a disponibilidade de horários. — {clinica}",
  },
  {
    id: "alteracao",
    nome: "Alteração de horário",
    finalidade: "ALTERACAO",
    ativo: true,
    texto:
      "Olá, {nome}! Precisamos conversar sobre o horário do seu atendimento de {procedimento}, previsto para {data} às {horario}. Por favor, fale conosco. — {clinica}",
  },
  {
    id: "reagendamento",
    nome: "Reagendamento",
    finalidade: "REAGENDAMENTO",
    ativo: true,
    texto:
      "Olá, {nome}! Gostaríamos de combinar um novo horário para seu atendimento de {procedimento}. Entre em contato para escolhermos a melhor opção. — {clinica}",
  },
]

const sampleClients = [
  {
    nome: "Jamily Souza",
    whatsapp: "5511999881111",
    servico: "Lash Design",
    ultimo: "2026-10-14",
    data: "03/11/2026",
    horario: "09:00",
  },
  {
    nome: "Carolina Alves",
    whatsapp: "5511999882222",
    servico: "Nail Design",
    ultimo: "2026-09-26",
    data: "04/11/2026",
    horario: "14:00",
  },
  {
    nome: "Verônica Lima",
    whatsapp: "5511999883333",
    servico: "Hidra Gloss",
    ultimo: "2026-08-30",
    data: "05/11/2026",
    horario: "11:00",
  },
]

export { defaultTemplates, sampleClients }
