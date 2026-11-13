/**
 * MOCK — implementação falsa de cada rota do backend.
 *
 * Os caminhos, formatos e REGRAS aqui são o contrato que o Spring Boot deve
 * seguir (resumo em docs/INTEGRACAO-BACKEND.md). Os comentários "BACKEND:"
 * descrevem o que o backend real precisa fazer no banco MySQL.
 */
import { toSlug } from "@/lib/format"
import {
  MIN_AGE_CLIENT,
  MIN_AGE_MANAGER,
  birthError,
  cpfCnpjError,
  sameEmailsError,
} from "@/lib/validators"
import { defaultTemplates } from "./data/messages"
import { createClinic, db } from "./db"
import { createRouter, fail } from "./router"

const router = createRouter()

/* ---------------- helpers ---------------- */

/** Cria um token falso e guarda quem é o dono dele (perfil, e-mail, clínica). O backend real usa JWT. */
const newToken = (payload) => {
  const token = `mock.${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  db.tokens[token] = payload
  return token
}

/** Descobre de quem é o token enviado na requisição (ou null se não houver). */
const session = (ctx) => (ctx.token ? db.tokens[ctx.token] : null)

/** Busca a clínica pelo slug; se não existir, responde 404. */
const getClinic = (slug) => {
  const clinic = db.clinics[slug]
  if (!clinic) fail(404, "Clínica não encontrada.")
  return clinic
}

/** Dados da empresa que são devolvidos às telas (com o slug junto). */
const companyOut = (slug) => ({ ...db.clinics[slug].company, slug })

/**
 * Campos da empresa liberados na vitrine PÚBLICA (sem login).
 * BACKEND: não expor cpf_cnpj (pode ser o CPF pessoal da profissional autônoma),
 * nome da gestora nem status — princípio da necessidade da LGPD (art. 6º, III).
 */
const PUBLIC_COMPANY_FIELDS = [
  "slug", "name", "initials", "logoImage", "heroImage", "favicon",
  "tagline", "heroTitle", "description",
  "phone", "email", "instagram", "address",
  "termsOfUse", "privacyPolicy", "clinicTermsDocument", "clinicTermsFileName",
]
const publicCompanyOut = (slug) => {
  const full = companyOut(slug)
  return Object.fromEntries(PUBLIC_COMPANY_FIELDS.map((key) => [key, full[key]]))
}

/** Exige token de gestora e devolve a clínica dela. */
const manager = (ctx) => {
  const s = session(ctx)
  if (!s) fail(401, "Sua sessão expirou. Entre novamente.")
  if (s.perfil !== "GESTORA") fail(403, "Acesso restrito à gestora.")
  return { clinic: getClinic(s.slug), slug: s.slug, session: s }
}

/** Exige token de cliente e devolve a conta dela. */
const client = (ctx) => {
  const s = session(ctx)
  if (!s) fail(401, "Sua sessão expirou. Entre novamente.")
  if (s.perfil !== "CLIENTE") fail(403, "Acesso restrito a clientes.")
  const account = db.clientAccounts[`${s.slug}|${s.email}`]
  if (!account) fail(401, "Sua sessão expirou. Entre novamente.")
  return { account, clinic: getClinic(s.slug), slug: s.slug }
}

/** Monta o objeto 'usuario' da gestora no formato que o backend devolve. */
const managerUser = (email) => ({
  id: email,
  nome: db.managers[email].nome,
  email,
  perfil: "GESTORA",
  clinicaSlug: db.managers[email].slug,
})

/** Monta o objeto 'usuario' da cliente no formato que o backend devolve. */
const clientUser = (account) => ({
  id: `${account.slug}|${account.email}`,
  nome: account.profile.name,
  email: account.email,
  perfil: "CLIENTE",
  clinicaSlug: account.slug,
})

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ")

/** Responde 400 (dados inválidos) se o texto estiver vazio. */
const requireText = (value, message) => {
  if (!String(value ?? "").trim()) fail(400, message)
}

// Conversões de horário: '09:30' ⇄ 570 minutos (facilita comparar e somar horários).
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number)
  return h * 60 + m
}
const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/** Serviço: preço em reais e duração em minutos, ambos números (SERVICO.preco / SERVICO.duracao). */
const validateService = (s) => {
  requireText(s?.name, "Informe o nome do serviço.")
  requireText(s?.category, "Escolha a categoria do serviço.")
  if (!Number.isFinite(s?.price) || s.price < 0)
    fail(400, "Informe o preço do serviço em reais (número).")
  if (!Number.isInteger(s?.duration) || s.duration <= 0)
    fail(400, "Informe a duração do serviço em minutos (número inteiro).")
}

/** Registra uma ação no log de auditoria (o mais recente fica primeiro). */
const audit = (clinic, user, acao) =>
  clinic.auditoria.unshift({
    id: Date.now(),
    user,
    acao,
    ip: "127.0.0.1",
    dh: new Date().toISOString().slice(0, 19).replace("T", " "),
  })

/* ---------------- autenticação ---------------- */

/**
 * LOGIN DA GESTORA.
 * 1. Normaliza o e-mail (sem espaços e minúsculo).
 * 2. Procura a conta e compara a senha. Se não bater → 401, com mensagem genérica
 *    (não diz se o erro foi no e-mail ou na senha, por segurança).
 * 3. Devolve { token, usuario }. O front guarda o token (api/session.js).
 * BACKEND: comparar a senha com o hash BCrypt e registrar LOGIN/LOGIN_FALHA na auditoria.
 */
router.post("/auth/gestora/login", ({ body }) => {
  const email = String(body?.email || "").trim().toLowerCase()
  const account = db.managers[email]
  if (!account || account.senha !== body?.senha)
    fail(401, "E-mail ou senha incorretos. Confira suas credenciais.")
  return {
    token: newToken({ perfil: "GESTORA", email, slug: account.slug }),
    usuario: managerUser(email),
  }
})

/**
 * Cadastro da empresa + gestora.
 * BACKEND (numa única transação):
 *  1. Validar: idade mínima de 16 anos da gestora (data_nascimento), CPF/CNPJ válido,
 *     e-mail de acesso diferente do e-mail de contato da clínica, aceites obrigatórios.
 *  2. INSERT USUARIO (tipo GESTORA, senha com hash BCrypt, data_nascimento, whatsapp).
 *  3. INSERT CLINICA (id_gestora = usuário criado, slug gerado do nome, cpf_cnpj,
 *     email_contato, status 'ATIVA'...).
 *  4. INSERT CATEGORIA para cada categoria e SERVICO para cada serviço inicial.
 *  5. INSERT HORARIO com o expediente padrão.
 *  6. INSERT ACEITE_DOCUMENTO (papel_no_aceite 'GESTORA', ip_origem) para os
 *     Termos de Uso e a Política de Privacidade do Prontto publicados.
 *  7. INSERT LOG_AUDITORIA ('CADASTRO_EMPRESA').
 */
router.post("/auth/gestora/cadastro", ({ body }) => {
  const empresa = body?.empresa || {}
  const gestora = body?.gestora || {}
  const email = String(gestora.email || "").trim().toLowerCase()
  requireText(empresa.name, "Informe o nome da empresa.")
  requireText(gestora.nome, "Informe o nome da gestora.")
  requireText(email, "Informe o e-mail de acesso da gestora.")
  const ageError = birthError(gestora.dataNascimento, MIN_AGE_MANAGER)
  if (ageError) fail(400, ageError)
  const documentError = cpfCnpjError(empresa.cpfCnpj)
  if (documentError) fail(400, documentError)
  const emailsError = sameEmailsError(email, String(empresa.email || ""))
  if (emailsError) fail(400, emailsError)
  if (!body?.aceites?.termosUso || !body?.aceites?.politicaPrivacidade)
    fail(400, "Aceite os Termos de Uso e a Política de Privacidade do Prontto.")
  ;(body.servicos || []).forEach(validateService)
  if (db.managers[email]) fail(409, "Já existe uma conta com este e-mail.")
  const slug = toSlug(empresa.name)
  if (db.clinics[slug])
    fail(409, "Já existe uma empresa com este nome. Escolha outro.")
  if (
    Object.values(db.clinics).some(
      (c) => c.company.cpfCnpj?.replace(/\D/g, "") === empresa.cpfCnpj.replace(/\D/g, ""),
    )
  )
    fail(409, "Já existe uma empresa cadastrada com este CPF/CNPJ.")
  const clinic = createClinic({
    company: { ...empresa, ownerName: gestora.nome },
    services: (body.servicos || []).map((s, i) => ({
      ...s,
      id: `service-${Date.now()}-${i}`,
      active: true,
    })),
    categories: body.categorias || [],
  })
  clinic.aceites.push({ email, papel: "GESTORA", ...body.aceites })
  db.clinics[slug] = clinic
  db.managers[email] = {
    senha: gestora.senha,
    nome: gestora.nome,
    dataNascimento: gestora.dataNascimento,
    whatsapp: gestora.whatsapp,
    slug,
  }
  audit(clinic, gestora.nome, "CADASTRO_EMPRESA")
  return {
    token: newToken({ perfil: "GESTORA", email, slug }),
    usuario: managerUser(email),
  }
})

router.post("/clinicas/:slug/auth/login", ({ params, body }) => {
  getClinic(params.slug)
  const email = String(body?.email || "").trim().toLowerCase()
  if (db.managers[email])
    fail(403, "Este acesso é para clientes. A gestora entra pelo link do Prontto.")
  const account = db.clientAccounts[`${params.slug}|${email}`]
  if (!account || account.senha !== body?.senha)
    fail(
      401,
      "E-mail ou senha incorretos. Se ainda não possui conta, faça seu cadastro.",
    )
  return {
    token: newToken({ perfil: "CLIENTE", email, slug: params.slug }),
    usuario: clientUser(account),
  }
})

/**
 * Cadastro da cliente pelo link da clínica.
 * BACKEND (numa única transação):
 *  1. Validar idade mínima de 15 anos.
 *  2. INSERT USUARIO (tipo CLIENTE, id_clinica = clínica do slug, senha com hash).
 *     O id_clinica liga a cliente à clínica do link (decisão do MVP).
 *  3. INSERT FICHA_ANAMNESE: alergias e observacoes_medicas (resumo em texto,
 *     até 500 caracteres) + respostas (coluna JSON com todas as perguntas).
 *  4. INSERT ACEITE_DOCUMENTO (papel 'CLIENTE') para cada documento aceito.
 *  5. INSERT LOG_AUDITORIA ('CADASTRO_CLIENTE').
 */
router.post("/clinicas/:slug/clientes", ({ params, body }) => {
  const clinic = getClinic(params.slug)
  const u = body?.usuario || {}
  const email = String(u.email || "").trim().toLowerCase()
  requireText(email, "Informe o seu e-mail.")
  const ageError = birthError(u.data_nascimento, MIN_AGE_CLIENT)
  if (ageError) fail(400, ageError)
  if (String(body?.ficha?.observacoes_medicas || "").length > 500)
    fail(400, "O resumo da ficha passou de 500 caracteres.")
  if (db.managers[email])
    fail(409, "Este e-mail pertence a uma gestora. Use outro e-mail.")
  const key = `${params.slug}|${email}`
  if (db.clientAccounts[key])
    fail(409, "Já existe uma conta com este e-mail. Faça login.")
  const account = {
    email,
    senha: u.senha,
    slug: params.slug,
    profile: {
      name: u.nome,
      email,
      whatsapp: u.whatsapp || "",
      birthDate: u.data_nascimento || "",
      recurring: Boolean(u.recorrente),
    },
    respostas: body?.ficha?.respostas ?? null,
    atualizadaEm: new Date().toISOString(),
    appointments: [],
  }
  db.clientAccounts[key] = account
  clinic.clientes.push({
    id: Date.now(),
    name: u.nome,
    initials: u.nome
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    email,
    whatsapp: u.whatsapp || "",
    recorrente: false,
    status: "ATIVO",
    service: "—",
    model: "—",
    lastDate: new Date().toISOString().slice(0, 10),
    appts: [],
    alergias: body?.ficha?.alergias || "Nenhuma",
    observacoes: body?.ficha?.observacoes_medicas || "Nenhuma",
    notasGestora: "",
    atualizadaEm: new Date().toISOString().slice(0, 10),
    // FICHA_ANAMNESE_VERSAO: versão 1 = ficha do cadastro (cópia completa).
    versoes: [
      {
        id: Date.now(),
        numero: 1,
        data: new Date().toISOString(),
        alergias: body?.ficha?.alergias || "Nenhuma",
        observacoes: body?.ficha?.observacoes_medicas || "Nenhuma",
        respostas: body?.ficha?.respostas ?? {},
      },
    ],
  })
  audit(clinic, u.nome, "CADASTRO_CLIENTE")
  return {
    token: newToken({ perfil: "CLIENTE", email, slug: params.slug }),
    usuario: clientUser(account),
  }
})

router.get("/auth/me", (ctx) => {
  const s = session(ctx)
  if (!s) fail(401, "Sua sessão expirou. Entre novamente.")
  if (s.perfil === "GESTORA") return managerUser(s.email)
  return clientUser(client(ctx).account)
})

router.post("/auth/logout", (ctx) => {
  if (ctx.token) delete db.tokens[ctx.token]
  return null
})

router.post("/auth/recuperar-senha", () => null)

/* ---------------- vitrine pública ---------------- */

router.get("/clinicas/:slug", ({ params }) => {
  const clinic = getClinic(params.slug)
  if (clinic.company.status === "ENCERRADA") fail(404, "Clínica não encontrada.")
  return {
    empresa: publicCompanyOut(params.slug), // só os campos públicos (sem CPF/CNPJ)
    servicos: clinic.services.filter((s) => s.active),
    categorias: clinic.categories,
  }
})

/**
 * BACKEND: diasLotados = dias do mês sem nenhum horário livre (considerando
 * HORARIO, BLOQUEIO_HORARIO e AGENDAMENTO); diasSemanaFechados = dias sem
 * HORARIO ativo (0 = domingo).
 */
router.get("/clinicas/:slug/calendario", ({ params }) => {
  const clinic = getClinic(params.slug)
  return { diasLotados: clinic.diasLotados, diasSemanaFechados: [0] }
})

/**
 * BACKEND: calcula os horários livres do dia para o serviço escolhido:
 * faixas do HORARIO do dia da semana, menos BLOQUEIO_HORARIO, menos AGENDAMENTO
 * não cancelados, respeitando a duração do serviço (SERVICO.duracao).
 */
router.get("/clinicas/:slug/horarios", ({ params }) => {
  return getClinic(params.slug).horariosDisponiveis
})

/* ---------------- gestora: empresa ---------------- */

router.get("/gestora/empresa", (ctx) => companyOut(manager(ctx).slug))

/**
 * BACKEND: UPDATE CLINICA. Validar CPF/CNPJ e que email_contato seja
 * diferente do e-mail de acesso da gestora (USUARIO.email).
 */
router.put("/gestora/empresa", (ctx) => {
  const { clinic, slug, session: s } = manager(ctx)
  requireText(ctx.body?.name, "Informe o nome da empresa.")
  const documentError = cpfCnpjError(ctx.body?.cpfCnpj)
  if (documentError) fail(400, documentError)
  const emailsError = sameEmailsError(s.email, String(ctx.body?.email || ""))
  if (emailsError) fail(400, emailsError)
  const { slug: _ignored, status: _status, ...company } = ctx.body
  clinic.company = { ...clinic.company, ...company }
  return companyOut(slug)
})

/** BACKEND: UPDATE CLINICA SET status = 'ENCERRAMENTO_SOLICITADO' + LOG_AUDITORIA. */
router.post("/gestora/empresa/encerramento", (ctx) => {
  const { clinic, session: s } = manager(ctx)
  clinic.company.status = "ENCERRAMENTO_SOLICITADO"
  audit(clinic, db.managers[s.email].nome, "ENCERRAMENTO_CLINICA_SOLICITADO")
  return null
})

/* ---------------- gestora: catálogo ---------------- */

router.get("/gestora/servicos", (ctx) => manager(ctx).clinic.services)

router.post("/gestora/servicos", (ctx) => {
  const { clinic } = manager(ctx)
  validateService(ctx.body)
  const service = { ...ctx.body, id: `service-${Date.now()}`, active: true }
  clinic.services.push(service)
  return service
})

router.put("/gestora/servicos/:id", (ctx) => {
  const { clinic } = manager(ctx)
  validateService(ctx.body)
  const index = clinic.services.findIndex((s) => s.id === ctx.params.id)
  if (index < 0) fail(404, "Serviço não encontrado.")
  clinic.services[index] = { ...ctx.body, id: ctx.params.id }
  return clinic.services[index]
})

/** BACKEND: exclusão lógica (SERVICO.ativo), nunca DELETE — agendamentos antigos apontam para o serviço. */
router.patch("/gestora/servicos/:id/status", (ctx) => {
  const { clinic } = manager(ctx)
  const service = clinic.services.find((s) => s.id === ctx.params.id)
  if (!service) fail(404, "Serviço não encontrado.")
  service.active = Boolean(ctx.body?.active)
  return service
})

/** BACKEND: tabela CATEGORIA (id_clinica, nome) com UNIQUE (id_clinica, nome). */
router.get("/gestora/categorias", (ctx) => manager(ctx).clinic.categories)

router.post("/gestora/categorias", (ctx) => {
  const { clinic } = manager(ctx)
  const nome = String(ctx.body?.nome || "").trim()
  requireText(nome, "Informe o nome da categoria.")
  if (clinic.categories.some((c) => c.toLowerCase() === nome.toLowerCase()))
    fail(409, `A categoria “${nome}” já existe. Use outro nome.`)
  clinic.categories.push(nome)
  return clinic.categories
})

router.delete("/gestora/categorias/:nome", (ctx) => {
  const { clinic } = manager(ctx)
  if (clinic.services.some((s) => s.category === ctx.params.nome))
    fail(409, "Não é possível remover uma categoria que possui serviços.")
  clinic.categories = clinic.categories.filter((c) => c !== ctx.params.nome)
  return clinic.categories
})

/* ---------------- gestora: clientes ---------------- */

/** BACKEND: USUARIO com tipo CLIENTE e id_clinica da gestora + FICHA_ANAMNESE + HISTORICO_ANAMNESE. */
router.get("/gestora/clientes", (ctx) => manager(ctx).clinic.clientes)

/** Notas internas da gestora (NOTA_CLIENTE): várias por cliente. */
const clientOf = (ctx) => {
  const { clinic } = manager(ctx)
  const found = clinic.clientes.find((c) => String(c.id) === ctx.params.id)
  if (!found) fail(404, "Cliente não encontrada.")
  found.notas ??= found.notasGestora
    ? [{ id: 1, texto: found.notasGestora, criadaEm: new Date().toISOString(), atualizadaEm: null }]
    : []
  return found
}
const noteText = (body) => {
  const texto = String(body?.texto ?? "").trim()
  requireText(texto, "Escreva a nota. Exemplo: prefere horários pela manhã.")
  if (texto.length > 1000) fail(400, "A nota pode ter no máximo 1000 caracteres.")
  return texto
}
router.get("/gestora/clientes/:id/notas", (ctx) => clientOf(ctx).notas)

/**
 * BACKEND: FICHA_ANAMNESE_VERSAO — versões COMPLETAS da ficha, da atual para a
 * mais antiga. Sem versão gravada, a ficha atual é a versão 1.
 */
router.get("/gestora/clientes/:id/ficha/versoes", (ctx) => {
  const found = clientOf(ctx)
  const versoes = found.versoes?.length
    ? found.versoes
    : [
        {
          id: null,
          numero: 1,
          data: found.atualizadaEm || null,
          alergias: found.alergias,
          observacoes: found.observacoes,
          respostas: {},
        },
      ]
  return [...versoes]
    .sort((a, b) => b.numero - a.numero)
    .map((v, i) => ({ ...v, atual: i === 0 }))
})
router.post("/gestora/clientes/:id/notas", (ctx) => {
  const found = clientOf(ctx)
  const nota = { id: Date.now(), texto: noteText(ctx.body), criadaEm: new Date().toISOString(), atualizadaEm: null }
  found.notas.unshift(nota)
  return nota
})
router.put("/gestora/clientes/:id/notas/:notaId", (ctx) => {
  const nota = clientOf(ctx).notas.find((n) => String(n.id) === ctx.params.notaId)
  if (!nota) fail(404, "Nota não encontrada.")
  nota.texto = noteText(ctx.body)
  nota.atualizadaEm = new Date().toISOString()
  return nota
})
router.delete("/gestora/clientes/:id/notas/:notaId", (ctx) => {
  const found = clientOf(ctx)
  found.notas = found.notas.filter((n) => String(n.id) !== ctx.params.notaId)
  return null
})

/* ---------------- gestora: agendamentos e agenda ---------------- */

router.get("/gestora/agendamentos", (ctx) => manager(ctx).clinic.agendamentos)

/**
 * BACKEND: UPDATE AGENDAMENTO SET status = 'CANCELADO', cancelado_por = 'GESTORA',
 * motivo_cancelamento, data_cancelamento = NOW() + LOG_AUDITORIA.
 */
router.post("/gestora/agendamentos/:id/cancelamento", (ctx) => {
  const { clinic } = manager(ctx)
  const item = clinic.agendamentos.find((a) => a.id === ctx.params.id)
  if (!item) fail(404, "Agendamento não encontrado.")
  if (item.status === "CANCELADO") fail(409, "Este agendamento já está cancelado.")
  const motivo = String(ctx.body?.motivo || "").trim()
  requireText(motivo, "Informe o motivo do cancelamento.")
  Object.assign(item, {
    status: "CANCELADO",
    canceladoPor: "GESTORA",
    motivoCancelamento: motivo,
    dataCancelamento: new Date().toISOString(),
  })
  // reflete na conta da cliente (no banco é o mesmo registro de AGENDAMENTO)
  Object.values(db.clientAccounts).forEach((account) => {
    const own = account.appointments.find((a) => a.id === item.id)
    if (own) Object.assign(own, item)
  })
  return item
})

const WEEK_LABELS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
const DIA_SEMANA = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"]
const SLOT_MINUTES = 60

/**
 * Painel semanal (opção A: só HORARIO + BLOQUEIO_HORARIO + AGENDAMENTO).
 * BACKEND: para cada dia da semana atual, gera os horários a partir das faixas
 * ativas de HORARIO (de 60 em 60 minutos) e marca cada um como:
 *   busy    → existe AGENDAMENTO não cancelado no período (traz agendamentoId);
 *   blocked → existe BLOQUEIO_HORARIO no período (traz bloqueio.id);
 *   free    → caso contrário.
 * Não existe "horário avulso": para abrir mais horários, a gestora muda o
 * horário de funcionamento; para fechar, cria um bloqueio.
 */
router.get("/gestora/painel", (ctx) => {
  const { clinic } = manager(ctx)
  // ?semana=YYYY-MM-DD (qualquer dia da semana desejada); sem ele = semana atual.
  const semana = /^\d{4}-\d{2}-\d{2}$/.test(ctx.query?.semana || "")
    ? ctx.query.semana.split("-").map(Number)
    : null
  const monday = semana ? new Date(semana[0], semana[1] - 1, semana[2]) : new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const pad = (n) => String(n).padStart(2, "0")
  const datas = WEEK_LABELS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const dias = datas.map((iso, i) => `${WEEK_LABELS[i]} ${iso.slice(8, 10)}`)
  const horarios = datas.map((iso, i) => {
    const ranges = clinic.horarios.filter(
      (h) => h.dia_semana === DIA_SEMANA[i] && h.ativo,
    )
    const slots = []
    ranges.forEach((range) => {
      for (
        let t = toMinutes(range.hora_inicio);
        t + SLOT_MINUTES <= toMinutes(range.hora_fim);
        t += SLOT_MINUTES
      ) {
        const end = t + SLOT_MINUTES
        const appointment = clinic.agendamentos.find(
          (a) =>
            a.data === iso &&
            a.status !== "CANCELADO" &&
            toMinutes(a.hora) < end &&
            toMinutes(a.hora) + (a.duracao || SLOT_MINUTES) > t,
        )
        const block = clinic.bloqueios.find(
          (b) =>
            b.data === iso &&
            (!b.inicio || (toMinutes(b.inicio) < end && toMinutes(b.fim) > t)),
        )
        slots.push({
          time: toHHMM(t),
          end: toHHMM(end),
          status: appointment ? "busy" : block ? "blocked" : "free",
          ...(appointment && {
            agendamentoId: appointment.id,
            client: appointment.cliente,
            whatsapp: appointment.whatsapp,
            service: appointment.nomeProcedimento,
          }),
          ...(block && {
            bloqueio: { id: block.id, inicio: block.inicio, fim: block.fim },
          }),
        })
      }
    })
    return slots
  })
  return { dias, datas, horarios, proximos: clinic.proximos }
})

router.get("/gestora/horarios-funcionamento", (ctx) => manager(ctx).clinic.horarios)

router.put("/gestora/horarios-funcionamento", (ctx) => {
  const { clinic } = manager(ctx)
  clinic.horarios = Array.isArray(ctx.body) ? ctx.body : []
  return clinic.horarios
})

router.get("/gestora/bloqueios", (ctx) => manager(ctx).clinic.bloqueios)

/**
 * BACKEND: INSERT BLOQUEIO_HORARIO. inicio/fim null = dia inteiro.
 * Regra do dicionário de dados: o bloqueio é PERMITIDO mesmo havendo
 * agendamentos no período; o sistema apenas ALERTA a gestora (campo
 * "agendamentosNoPeriodo" na resposta) e NÃO cancela os agendamentos.
 * Novos agendamentos nesse período passam a ser recusados.
 */
router.post("/gestora/bloqueios", (ctx) => {
  const { clinic } = manager(ctx)
  const { data, inicio = null, fim = null, motivo = "" } = ctx.body || {}
  requireText(data, "Escolha a data do bloqueio.")
  if ((inicio && !fim) || (!inicio && fim))
    fail(400, "Informe início e fim, ou deixe os dois vazios para o dia inteiro.")
  if (inicio && toMinutes(fim) <= toMinutes(inicio))
    fail(400, "O fim do bloqueio precisa ser depois do início.")
  const conflicts = clinic.agendamentos.filter(
    (a) =>
      a.data === data &&
      a.status !== "CANCELADO" &&
      (!inicio ||
        (toMinutes(a.hora) < toMinutes(fim) &&
          toMinutes(a.hora) + (a.duracao || SLOT_MINUTES) > toMinutes(inicio))),
  )
  const block = { id: Date.now(), data, inicio, fim, motivo }
  clinic.bloqueios.push(block)
  return {
    ...block,
    agendamentosNoPeriodo: conflicts.map((a) => ({
      id: a.id,
      cliente: a.cliente,
      hora: a.hora,
    })),
  }
})

router.delete("/gestora/bloqueios/:id", (ctx) => {
  const { clinic } = manager(ctx)
  clinic.bloqueios = clinic.bloqueios.filter(
    (b) => String(b.id) !== ctx.params.id,
  )
  return null
})

/* ---------------- gestora: documentos ---------------- */

const findDoc = (clinic, id) => {
  const doc = clinic.documentos.find((d) => String(d.id) === String(id))
  if (!doc) fail(404, "Documento não encontrado.")
  return doc
}

router.get("/gestora/documentos", (ctx) =>
  manager(ctx).clinic.documentos.filter((d) => !d.excluidoEm),
)

/** BACKEND: exclusão LÓGICA (DOCUMENTO_TERMO.excluido_em): o documento continua salvo. */
router.get("/gestora/documentos/excluidos", (ctx) =>
  manager(ctx).clinic.documentos.filter((d) => d.excluidoEm),
)

router.delete("/gestora/documentos/:id", (ctx) => {
  const doc = findDoc(manager(ctx).clinic, ctx.params.id)
  if (doc.plataforma) fail(400, "Os documentos do Prontto são só de leitura.")
  if (doc.status === "PUBLICADO") fail(400, "Documento publicado não pode ser excluído. Inative-o antes.")
  if (doc.aceites > 0)
    fail(400, "Este documento tem aceites registrados e precisa ser guardado (LGPD). Ele pode ficar inativo.")
  doc.excluidoEm = new Date().toISOString()
  return null
})

router.post("/gestora/documentos/:id/restauracao", (ctx) => {
  const doc = findDoc(manager(ctx).clinic, ctx.params.id)
  if (!doc.excluidoEm) fail(400, "Este documento não está excluído.")
  doc.excluidoEm = null
  return doc
})

router.post("/gestora/documentos/:id/versoes", (ctx) => {
  const { clinic } = manager(ctx)
  const doc = findDoc(clinic, ctx.params.id)
  const draft = {
    ...doc,
    id: Date.now(),
    versao: (parseFloat(doc.versao) + 1).toFixed(1),
    status: "RASCUNHO",
    arquivo: null,
    publicadoEm: null,
    aceites: 0,
  }
  clinic.documentos.push(draft)
  return draft
})

router.post("/gestora/documentos/:id/publicacao", (ctx) => {
  const { clinic } = manager(ctx)
  const doc = findDoc(clinic, ctx.params.id)
  clinic.documentos = clinic.documentos.map((x) =>
    x.id === doc.id
      ? { ...x, status: "PUBLICADO", publicadoEm: nowStamp() }
      : x.plataforma === doc.plataforma &&
          x.tipo === doc.tipo &&
          x.status === "PUBLICADO"
        ? { ...x, status: "INATIVO" }
        : x,
  )
  return clinic.documentos
})

router.post("/gestora/documentos/:id/inativacao", (ctx) => {
  const doc = findDoc(manager(ctx).clinic, ctx.params.id)
  doc.status = "INATIVO"
  return doc
})

router.post("/gestora/documentos/:id/arquivo", (ctx) => {
  const doc = findDoc(manager(ctx).clinic, ctx.params.id)
  const file = ctx.body instanceof FormData ? ctx.body.get("arquivo") : null
  doc.arquivo = file?.name || "documento.pdf"
  return doc
})

/* ---------------- gestora: mensagens e auditoria ---------------- */

/** BACKEND: tabela MODELO_MENSAGEM (id_clinica, nome, finalidade, texto, ativo). */
router.get("/gestora/mensagens/modelos", (ctx) => manager(ctx).clinic.modelos)

router.put("/gestora/mensagens/modelos", (ctx) => {
  const { clinic } = manager(ctx)
  clinic.modelos = Array.isArray(ctx.body) ? ctx.body : clinic.modelos
  return clinic.modelos
})

/** CRUD de um modelo por vez (mesmas regras do backend). */
const templateFromBody = (body) => {
  requireText(body?.nome, "Informe o nome do modelo. Exemplo: Aviso de feriado.")
  requireText(body?.texto, "Escreva o texto da mensagem. Exemplo: Olá, {nome}! ...")
  return {
    nome: body.nome.trim(),
    texto: body.texto.trim(),
    finalidade: body.finalidade || "PERSONALIZADA",
    ativo: body.ativo ?? true,
  }
}
const findTemplate = (clinic, id) =>
  clinic.modelos.find((m) => String(m.id) === String(id)) ||
  fail(404, "Modelo de mensagem não encontrado.")

router.post("/gestora/mensagens/modelos", (ctx) => {
  const { clinic } = manager(ctx)
  const created = { id: `modelo-${Date.now()}`, ...templateFromBody(ctx.body) }
  clinic.modelos.push(created)
  return created
})

router.put("/gestora/mensagens/modelos/:id", (ctx) => {
  const { clinic } = manager(ctx)
  const item = findTemplate(clinic, ctx.params.id)
  Object.assign(item, templateFromBody(ctx.body))
  return item
})

router.delete("/gestora/mensagens/modelos/:id", (ctx) => {
  const { clinic } = manager(ctx)
  const item = findTemplate(clinic, ctx.params.id)
  clinic.modelos = clinic.modelos.filter((m) => m !== item)
  return null
})

router.post("/gestora/mensagens/modelos/padrao", (ctx) => {
  const { clinic } = manager(ctx)
  const existing = new Set(clinic.modelos.map((m) => m.finalidade))
  defaultTemplates
    .filter((t) => !existing.has(t.finalidade))
    .forEach((t) => clinic.modelos.push({ ...t, id: `modelo-${t.finalidade}-${Date.now()}` }))
  return clinic.modelos
})

router.post("/gestora/mensagens/modelos/:id/restaurar", (ctx) => {
  const { clinic } = manager(ctx)
  const item = findTemplate(clinic, ctx.params.id)
  const original = defaultTemplates.find((t) => t.finalidade === item.finalidade)
  if (!original) fail(400, "Modelos personalizados não têm texto padrão para restaurar.")
  item.nome = original.nome
  item.texto = original.texto
  return item
})

router.get("/gestora/mensagens/destinatarios", (ctx) => manager(ctx).clinic.destinatarios)

router.get("/gestora/auditoria", (ctx) => manager(ctx).clinic.auditoria)

/* ---------------- cliente logada ---------------- */

router.get("/cliente/perfil", (ctx) => client(ctx).account.profile)

router.put("/cliente/perfil", (ctx) => {
  const { account } = client(ctx)
  requireText(ctx.body?.name, "Informe seu nome.")
  if (ctx.body?.birthDate) {
    const ageError = birthError(ctx.body.birthDate, MIN_AGE_CLIENT)
    if (ageError) fail(400, ageError)
  }
  account.profile = { ...account.profile, ...ctx.body }
  return account.profile
})

/**
 * BACKEND: FICHA_ANAMNESE.respostas (JSON) + alergias/observacoes_medicas (resumo).
 * A cada salvamento, gravar em FICHA_ANAMNESE_VERSAO uma cópia COMPLETA da
 * ficha (salvar sem mudar nada não gera versão).
 */
router.get("/cliente/ficha-saude", (ctx) => {
  const { account } = client(ctx)
  return { respostas: account.respostas, atualizadaEm: account.atualizadaEm }
})

router.put("/cliente/ficha-saude", (ctx) => {
  const { account, clinic } = client(ctx)
  const respostas = ctx.body?.respostas ?? null
  if (JSON.stringify(respostas) === JSON.stringify(account.respostas))
    return { respostas: account.respostas, atualizadaEm: account.atualizadaEm }
  account.respostas = respostas
  account.atualizadaEm = new Date().toISOString()
  const ficha = clinic.clientes.find((c) => c.email === account.profile.email)
  if (ficha) {
    ficha.alergias = ctx.body?.alergias || "Nenhuma"
    ficha.observacoes = ctx.body?.observacoes_medicas || "Nenhuma"
    ficha.atualizadaEm = account.atualizadaEm
    ficha.versoes ??= []
    ficha.versoes.push({
      id: Date.now(),
      numero: ficha.versoes.length + 1,
      data: account.atualizadaEm,
      alergias: ficha.alergias,
      observacoes: ficha.observacoes,
      respostas,
    })
  }
  return { respostas: account.respostas, atualizadaEm: account.atualizadaEm }
})

router.get("/cliente/agendamentos", (ctx) => client(ctx).account.appointments)

/**
 * BACKEND: INSERT AGENDAMENTO copiando nome_procedimento e valor_servico do
 * SERVICO no momento da reserva (snapshot). Antes, verificar se o horário está
 * livre (HORARIO, BLOQUEIO_HORARIO e outros AGENDAMENTOs) e responder 409 se não.
 * valor_sinal vem do front; o pagamento do sinal continua simulado (mock).
 */
router.post("/cliente/agendamentos", (ctx) => {
  const { account, clinic } = client(ctx)
  const { servicoId, data, hora, valorSinal = null } = ctx.body || {}
  const service = clinic.services.find((s) => s.id === servicoId)
  if (!service) fail(404, "Serviço não encontrado.")
  if (!data || !hora) fail(400, "Escolha a data e o horário.")
  // BACKEND: não aceitar agendamento no passado (a tela também bloqueia, mas a regra vale aqui).
  if (new Date(`${data}T${String(hora).slice(0, 5)}:00`) <= new Date())
    fail(400, "Essa data ou horário já passou. Escolha um horário futuro.")
  // BACKEND: agenda aberta só para o mês atual e o seguinte (2 meses).
  {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0) // último dia do mês seguinte
    if (new Date(`${data}T00:00:00`) > lastDay)
      fail(400, "A agenda está aberta só para este mês e o próximo. Escolha uma data mais próxima.")
  }
  const appointment = {
    id: `a${Date.now()}`,
    servicoId,
    nomeProcedimento: service.name,
    data,
    hora,
    duracao: service.duration,
    valorServico: service.price,
    valorSinal,
    status: valorSinal ? "CONFIRMADO" : "PENDENTE",
  }
  account.appointments.unshift(appointment)
  clinic.agendamentos.push({
    ...appointment,
    cliente: account.profile.name,
    whatsapp: account.profile.whatsapp,
  })
  audit(clinic, account.profile.name, "CRIAR_AGENDAMENTO")
  return appointment
})

/** BACKEND: igual ao cancelamento da gestora, com cancelado_por = 'CLIENTE'. */
router.post("/cliente/agendamentos/:id/cancelamento", (ctx) => {
  const { account, clinic } = client(ctx)
  const item = account.appointments.find((a) => a.id === ctx.params.id)
  if (!item) fail(404, "Agendamento não encontrado.")
  if (item.status !== "PENDENTE" && item.status !== "CONFIRMADO")
    fail(409, "Este agendamento não pode mais ser cancelado.")
  const changes = {
    status: "CANCELADO",
    canceladoPor: "CLIENTE",
    motivoCancelamento: ctx.body?.motivo || "Solicitado pela cliente",
    dataCancelamento: new Date().toISOString(),
  }
  Object.assign(item, changes)
  const managerView = clinic.agendamentos.find((a) => a.id === item.id)
  if (managerView) Object.assign(managerView, changes)
  return item
})

/**
 * Exclusão da conta pela própria cliente (LGPD), IMEDIATA — sem fila de pedidos.
 * BACKEND (numa única transação):
 *  1. Anonimizar USUARIO:
 *       nome = 'CLIENTE_ANONIMIZADO'
 *       email = 'anon-<id>@removido.invalid', whatsapp = 'ANON-<id>'
 *         (são UNIQUE e NOT NULL, então não podem ficar vazios)
 *       senha = hash aleatório (ninguém mais entra na conta)
 *       data_nascimento = '1900-01-01' (data genérica; '0000-00-00' não é
 *         usada porque o MySQL 8 a recusa no modo padrão)
 *       status = 'ANONIMIZADO_LGPD', solicitou_exclusao = 1
 *  2. MANTER os AGENDAMENTOs (nome_procedimento e valor_servico já são cópias),
 *     para comprovação fiscal e prestação de contas.
 *  3. MANTER a FICHA_ANAMNESE, com acesso só da gestora (defesa em processo);
 *     o motivo deve constar na política de privacidade.
 *  4. INSERT LOG_AUDITORIA ('EXCLUSAO_CONTA_LGPD') e invalidar a sessão.
 */
router.post("/cliente/conta/exclusao", (ctx) => {
  const { account, clinic, slug } = client(ctx)
  const anonId = Date.now()
  const oldEmail = account.email
  const listed = clinic.clientes.find((c) => c.email === oldEmail)
  if (listed)
    Object.assign(listed, {
      name: "CLIENTE_ANONIMIZADO",
      initials: "—",
      email: "",
      whatsapp: "",
      status: "ANONIMIZADO_LGPD",
      service: "Dados anonimizados",
    })
  clinic.agendamentos.forEach((a) => {
    if (account.appointments.some((own) => own.id === a.id)) {
      a.cliente = "CLIENTE_ANONIMIZADO"
      a.whatsapp = ""
    }
  })
  delete db.clientAccounts[`${slug}|${oldEmail}`]
  db.clientAccounts[`${slug}|anon-${anonId}@removido.invalid`] = {
    ...account,
    email: `anon-${anonId}@removido.invalid`,
    senha: Math.random().toString(36),
    profile: {
      ...account.profile,
      name: "CLIENTE_ANONIMIZADO",
      email: `anon-${anonId}@removido.invalid`,
      whatsapp: `ANON-${anonId}`,
      birthDate: "1900-01-01",
    },
    status: "ANONIMIZADO_LGPD",
  }
  Object.keys(db.tokens).forEach((token) => {
    if (db.tokens[token].email === oldEmail) delete db.tokens[token]
  })
  audit(clinic, null, "EXCLUSAO_CONTA_LGPD")
  return null
})

export { router }
