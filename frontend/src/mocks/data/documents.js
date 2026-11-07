/** MOCK — documentos legais e registros de auditoria usados nas telas administrativas. */

const initialDocs = [
  {
    id: 1,
    titulo: "Termos de Uso do Prontto",
    tipo: "TERMOS_USO",
    versao: "1.0",
    arquivo: null,
    status: "PUBLICADO",
    publicadoEm: "2026-09-01 09:00",
    plataforma: true,
    aceites: 1,
  },
  {
    id: 2,
    titulo: "Política de Privacidade do Prontto",
    tipo: "POLITICA_PRIVACIDADE",
    versao: "1.0",
    arquivo: null,
    status: "PUBLICADO",
    publicadoEm: "2026-09-01 09:00",
    plataforma: true,
    aceites: 1,
  },
  {
    id: 3,
    titulo: "Termos de atendimento da CA Beauty Clinic",
    tipo: "TERMOS_USO",
    versao: "1.0",
    arquivo: "termos-atendimento.pdf",
    status: "PUBLICADO",
    publicadoEm: "2026-09-02 10:30",
    plataforma: false,
    aceites: 3,
  },
]

/* ---------- 8) REGISTROS DE ACESSO — LOG_AUDITORIA (Marco Civil art. 15 / ISO 27002 8.15) ---------- */
const auditLogs = [
  {
    id: 1,
    user: "Camile Oli",
    acao: "LOGIN",
    ip: "187.12.0.4",
    dh: "2026-10-30 08:02:11",
  },
  {
    id: 2,
    user: "Jamily Souza",
    acao: "CRIAR_AGENDAMENTO",
    ip: "177.45.9.20",
    dh: "2026-10-29 19:40:02",
  },
  {
    id: 3,
    user: null,
    acao: "LOGIN_FALHA",
    ip: "200.10.33.8",
    dh: "2026-10-29 03:15:47",
  },
  {
    id: 4,
    user: "Camile Oli",
    acao: "ACESSO_FICHA_ANAMNESE",
    ip: "187.12.0.4",
    dh: "2026-10-28 14:21:30",
  },
  {
    id: 5,
    user: "Camile Oli",
    acao: "EXCLUSAO_CONTA_LGPD",
    ip: "187.12.0.4",
    dh: "2026-10-22 16:05:12",
  },
]

export { auditLogs, initialDocs }
