/**
 * Monta os campos de FICHA_ANAMNESE a partir das respostas do formulário.
 *
 * - respostas: todas as ~30 perguntas → coluna JSON (FICHA_ANAMNESE.respostas)
 * - alergias: VARCHAR(255), "Nenhuma" quando não há
 * - observacoes_medicas: VARCHAR(500), resumo em texto das respostas "Sim"
 *   (antes o front mandava o JSON inteiro aqui, que passava de 500 caracteres)
 */

// Cada item: [campo da pergunta, campo do detalhe (ou null), rótulo usado no resumo].
const QUESTIONS = [
  ["reacaoProduto", "reacaoProdutoDetalhe", "Reação a produto"],
  ["sensibilidade", "sensibilidadeDetalhe", "Sensibilidade"],
  ["condicaoTratamento", "condicaoTratamentoDetalhe", "Condição/tratamento"],
  ["medicamentos", "medicamentosDetalhe", "Medicamentos"],
  ["gravidezAmamentacao", null, "Gestante ou amamentando"],
  ["alteracaoAtual", "alteracaoAtualDetalhe", "Alteração atual"],
  ["condicaoOcular", "condicaoOcularDetalhe", "Alteração em unhas/cílios/lábios"],
  ["herpesLabial", null, "Herpes labial"],
  ["lentesContato", null, "Usa lentes de contato"],
  ["complicacaoAnterior", "complicacaoAnteriorDetalhe", "Complicação anterior"],
  ["problemaProcedimento", "problemaProcedimentoDetalhe", "Problema em procedimento"],
  ["informacaoAdicional", "informacaoAdicionalDetalhe", "Informação adicional"],
]

// Corta o texto no tamanho máximo da coluna do banco e coloca '…' no final.
const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

/** h = respostas do formulário. Devolve o objeto pronto para gravar em FICHA_ANAMNESE. */
export function toHealthRecord(h) {
  const alergias =
    h.alergia === "Sim" ? h.alergiaDetalhe.trim() || "Sim" : "Nenhuma"
  const items = QUESTIONS.filter(([key]) => h[key] === "Sim").map(
    ([, detailKey, label]) => {
      const detail = detailKey ? String(h[detailKey] ?? "").trim() : ""
      return detail ? `${label}: ${detail}` : label
    },
  )
  if (h.sinaisAtuais?.length) items.push(`Sinais: ${h.sinaisAtuais.join(", ")}`)
  return {
    alergias: clip(alergias, 255),
    observacoes_medicas: clip(items.join("; ") || "Nenhuma", 500),
    respostas: h,
  }
}
