import { useState } from "react"
import Field from "@/components/ui/Field"
import { api } from "@/api"
import AsyncState from "@/components/ui/AsyncState"
import { useApiQuery } from "@/hooks/useApiQuery"
import { br } from "@/lib/format"
import "./AuditPage.css"

/**
 * Consulta os registros imutáveis de acesso e ações de auditoria.
 */
function AuditPageView({ auditLogs }) {
  // Filtro por tipo de ação (LOGIN, LOGIN_FALHA...). 'TODAS' mostra tudo.
  const [acao, setAcao] = useState("TODAS")
  const rows = auditLogs.filter((l) => acao === "TODAS" || l.acao === acao)
  return (
    <section className="af-wrap">
      <div className="ff-card af-card" role="region" aria-labelledby="au-h1">
        <h1 id="au-h1">Registros de acesso e auditoria</h1>
        <p className="ff-copy">
          Os registros ficam sob sigilo, guardados por no mínimo 6 meses, e não
          podem ser editados nem apagados por aqui. Usuário vazio indica ação
          sem login, como tentativa falha.
        </p>
        <Field id="au-f" label="Filtrar por ação">
          <select
            id="au-f"
            className="af-select"
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
          >
            <option value="TODAS">Todas</option>
            {[...new Set(auditLogs.map((l) => l.acao))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <div className="audit-scroll">
          <table className="audit-table">
            <caption className="sr-only">Registros de auditoria</caption>
            <thead>
              <tr>
                <th scope="col">Data e hora</th>
                <th scope="col">Usuário</th>
                <th scope="col">Ação</th>
                <th scope="col">IP de origem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    {br(l.dh.slice(0, 10))} {l.dh.slice(11)}
                  </td>
                  <td>{l.user ?? "Sem login"}</td>
                  <td>{l.acao}</td>
                  <td>{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/** Carrega os registros do backend (GET /gestora/auditoria). */
// Busca os registros e, quando chegarem, mostra o AuditPageView.
function AuditPage(props) {
  const query = useApiQuery(() => api.audit.list(), [])
  return (
    <AsyncState query={query}>
      {(auditLogs) => <AuditPageView {...props} auditLogs={auditLogs} />}
    </AsyncState>
  )
}

export default AuditPage
