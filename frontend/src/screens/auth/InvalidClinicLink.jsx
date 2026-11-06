/* ---------- Link de clínica que não existe ---------- */
/**
 * Informa que o identificador de clínica presente na URL não foi encontrado.
 */
// Mostrada pelo App.jsx quando o ?clinica=<slug> da URL não existe no backend (404).
function InvalidClinicLink() {
  return (
    <main className="ff-page">
      <div className="ff-card" role="alert">
        <h1>Link não encontrado</h1>
        <p className="ff-copy">
          Não encontramos a clínica deste endereço. Confira o link com a clínica
          e tente de novo.
        </p>
      </div>
    </main>
  )
}

export default InvalidClinicLink
