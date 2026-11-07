/**
 * MOCK — "banco de dados" em memória que simula o backend.
 * É salvo no localStorage para o protótipo sobreviver a um F5.
 * Para zerar: rode `localStorage.removeItem("prontto.mockdb.v9")` no console
 * ou acesse qualquer URL com ?resetMocks.
 */
import { toHorarioRows } from "@/lib/schedule"
import { toSlug } from "@/lib/format"
import { initialAppointments } from "./data/appointments"
import { clientList } from "./data/clients"
import { defaultCompany } from "./data/company"
import { auditLogs, initialDocs } from "./data/documents"
import { defaultTemplates, sampleClients } from "./data/messages"
import {
  initialRules,
  nextAppointments,
  sampleBlocks,
  sampleManagerAppointments,
  timePeriods,
} from "./data/schedule"
import { services } from "./data/services"
import { demoClientAccounts } from "./data/session"

// O número no fim ('v9') é a versão: quando a estrutura muda, troca-se o número e o banco é recriado.
const STORAGE_KEY = "prontto.mockdb.v9"

const clone = (value) => JSON.parse(JSON.stringify(value))

// Categorias da clínica de demonstração.
const defaultCategories = [
  "Nail Design",
  "Lash Design",
  "Sobrancelhas",
  "Estética Labial",
]

/** Cria a estrutura de uma clínica nova (usada no seed e no cadastro de empresa). */
export function createClinic({
  company,
  services: catalog = [],
  categories = [],
  seed = false,
}) {
  return {
    company: { status: "ATIVA", ...clone(company) },
    services: clone(catalog),
    categories: clone(categories),
    horarios: toHorarioRows(clone(initialRules)),
    bloqueios: seed ? clone(sampleBlocks) : [],
    proximos: seed ? clone(nextAppointments) : [],
    agendamentos: seed ? clone(sampleManagerAppointments) : [],
    clientes: seed ? clone(clientList) : [],
    documentos: clone(
      seed ? initialDocs : initialDocs.filter((doc) => doc.plataforma),
    ),
    aceites: [],
    modelos: clone(defaultTemplates),
    destinatarios: seed ? clone(sampleClients) : [],
    auditoria: seed ? clone(auditLogs) : [],
    horariosDisponiveis: clone(timePeriods),
    diasLotados: seed ? [2, 9, 14, 21, 27] : [],
  }
}

/**
 * 'Seed' = dados iniciais. Cria a clínica de demonstração, a conta da gestora
 * (login: camile@cabeauty.com.br / senha: Prontto@123) e as clientes de exemplo.
 */
function seed() {
  const slug = toSlug(defaultCompany.name)
  return {
    clinics: {
      [slug]: createClinic({
        company: defaultCompany,
        services,
        categories: defaultCategories,
        seed: true,
      }),
    },
    managers: {
      "camile@cabeauty.com.br": {
        senha: "Prontto@123",
        nome: defaultCompany.ownerName,
        dataNascimento: "1994-03-18",
        whatsapp: "(11) 99988-7766",
        slug,
      },
    },
    clientAccounts: Object.fromEntries(
      demoClientAccounts.map((account) => [
        `${slug}|${account.email}`,
        {
          ...clone(account),
          slug,
          appointments: clone(initialAppointments),
        },
      ]),
    ),
    tokens: {},
  }
}

/** Carrega o banco salvo no localStorage; se não houver (ou ?resetMocks na URL), usa o seed. */
function load() {
  try {
    if (new URLSearchParams(window.location.search).has("resetMocks"))
      window.localStorage.removeItem(STORAGE_KEY)
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    /* Sem armazenamento: começa do zero. */
  }
  return seed()
}

// Objeto único que guarda tudo. Os handlers leem e alteram este objeto.
export const db = load()

/** Grava o estado atual (chamado depois de cada requisição que altera dados). */
export function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* Imagens grandes podem estourar a cota; o mock segue em memória. */
  }
}
