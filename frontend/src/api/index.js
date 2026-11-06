/**
 * Ponto único de acesso ao backend. Nas telas, use:
 *   import { api } from "@/api"
 *   const servicos = await api.catalog.listServices()
 */
import { appointmentsApi } from "./services/appointments"
import { auditApi } from "./services/audit"
import { authApi } from "./services/auth"
import { catalogApi } from "./services/catalog"
import { clientsApi } from "./services/clients"
import { clinicApi } from "./services/clinic"
import { companyApi } from "./services/company"
import { documentsApi } from "./services/documents"
import { meApi } from "./services/me"
import { messagesApi } from "./services/messages"
import { scheduleApi } from "./services/schedule"

// Cada chave agrupa as rotas de um assunto: api.auth (login), api.company (empresa) etc.
export const api = {
  auth: authApi,
  clinic: clinicApi,
  company: companyApi,
  catalog: catalogApi,
  clients: clientsApi,
  appointments: appointmentsApi,
  schedule: scheduleApi,
  documents: documentsApi,
  messages: messagesApi,
  audit: auditApi,
  me: meApi,
}

// Reexporta para as telas importarem tudo de um lugar só: import { api, ApiError } from '@/api'
export { ApiError } from "./http"
export { API_URL, USE_MOCKS } from "./config"
