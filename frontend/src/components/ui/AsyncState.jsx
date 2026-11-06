/**
 * Mostra carregamento ou erro de uma consulta ao backend e, quando os dados
 * chegam, renderiza o conteúdo.
 *
 *   <AsyncState query={query}>{(data) => <Tela dados={data} />}</AsyncState>
 */
function AsyncState({ query, children, fullPage = false }) {
  const { data, error, reload } = query
  // Caixa centralizada usada para mostrar 'Carregando…' ou a mensagem de erro.
  const wrap = (content) => (
    <section
      className={fullPage ? undefined : "page-card"}
      style={{
        display: "grid",
        placeItems: "center",
        gap: 12,
        padding: 40,
        minHeight: fullPage ? "100vh" : 220,
        textAlign: "center",
        color: "#64748b",
      }}
      aria-live="polite"
    >
      {content}
    </section>
  )
  const hasData = data !== null && data !== undefined
  // Num recarregamento (dados já na tela), mantém o conteúdo visível.
  if (error && !hasData)
    return wrap(
      <>
        <p style={{ margin: 0 }}>{error.message}</p>
        <button
          type="button"
          className="ff-btn ff-secondary"
          onClick={() => reload()}
        >
          Tentar novamente
        </button>
      </>,
    )
  if (!hasData) return wrap(<p style={{ margin: 0 }}>Carregando…</p>)
  // Dados prontos: chama a função recebida em children passando os dados.
  return children(data)
}

export default AsyncState
