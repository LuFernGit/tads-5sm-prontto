import { http } from "../http"

/** Vitrine pública da clínica (sem login), usada no link ?clinica=<slug>. */
export const clinicApi = {
  /**
   * GET /clinicas/{slug}
   * → { empresa: Empresa, servicos: Servico[] (somente ativos), categorias: string[] }
   * 404 quando o slug não existe (a tela mostra "link inválido").
   */
  getPublic: (slug) => http.get(`/clinicas/${slug}`),

  /**
   * GET /clinicas/{slug}/versao → { versao } (leve, sem imagens). Muda quando a
   * gestora altera serviços, categorias, identidade ou termos: a vitrine então
   * recarrega os dados completos sem a cliente recarregar a página.
   */
  getVersion: (slug) => http.get(`/clinicas/${slug}/versao`),

  /**
   * GET /clinicas/{slug}/calendario?mes=YYYY-MM
   * → { diasLotados: number[], diasSemanaFechados: number[] (0 = domingo) }
   */
  getCalendar: (slug, mes) => http.get(`/clinicas/${slug}/calendario`, { mes }),

  /**
   * GET /clinicas/{slug}/horarios?data=YYYY-MM-DD&servicoId=...
   * → [{ label: "MANHÃ"|"TARDE"|"NOITE", slots: [{ time: "09:00", occupied: boolean }] }]
   */
  getAvailableTimes: (slug, data, servicoId) =>
    http.get(`/clinicas/${slug}/horarios`, { data, servicoId }),
}
