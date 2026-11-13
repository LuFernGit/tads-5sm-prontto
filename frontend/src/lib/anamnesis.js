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

/**
 * Rótulo legível de cada pergunta da ficha (usado no "Histórico de alterações
 * da ficha" da gestora, que recebe a chave do campo do backend).
 */
const EXTRA_LABELS = {
  alergia: "Alergia",
  alergiaDetalhe: "Alergia (detalhe)",
  sinaisAtuais: "Sinais atuais",
  procedimentosAnteriores: "Já fez procedimentos",
  procedimentos: "Procedimentos anteriores",
  outroProcedimento: "Outro procedimento",
  cienciaInformacoes: "Ciência das informações",
  localData: "Local e data",
  nomeCliente: "Nome da cliente",
  assinatura: "Assinatura",
}
const QUESTION_LABELS = Object.fromEntries(
  QUESTIONS.flatMap(([key, detailKey, label]) =>
    detailKey ? [[key, label], [detailKey, `${label} (detalhe)`]] : [[key, label]],
  ),
)

/** "lentesContato" → "Usa lentes de contato" (sem rótulo: separa o camelCase). */
export function anamnesisLabel(key) {
  if (QUESTION_LABELS[key]) return QUESTION_LABELS[key]
  if (EXTRA_LABELS[key]) return EXTRA_LABELS[key]
  const words = String(key).replace(/([A-Z])/g, " $1").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/* ---------- Ficha completa (versões do histórico) ---------- */

// Perguntas que a cliente VÊ no formulário (AnamnesisFields), na mesma ordem.
// "sensibilidade" não existe no formulário (só na estrutura vazia); local,
// nome e assinatura ficam escondidos. Por isso não
// entram aqui: só aparecem na versão se tiverem alguma resposta (dados antigos).
const ORDER = [
  "alergia", "reacaoProduto", "condicaoTratamento", "medicamentos",
  "alteracaoAtual", "sinaisAtuais", "condicaoOcular",
  "herpesLabial", "lentesContato", "gravidezAmamentacao", "procedimentosAnteriores", "procedimentos",
  "outroProcedimento", "complicacaoAnterior", "problemaProcedimento",
  "informacaoAdicional", "cienciaInformacoes",
]
// Preenchidos automaticamente/escondidos: nunca mostrados na versão.
const HIDDEN = new Set(["localData", "nomeCliente", "assinatura"])

/** Valor de uma resposta em texto: true → "Sim", lista → "a, b", vazio → "—". */
function answerText(value) {
  if (value === true) return "Sim"
  if (value === false) return "Não"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  const text = String(value ?? "").trim()
  return text || "—"
}

/**
 * Todas as respostas de uma versão da ficha, na ordem do formulário, com o
 * detalhe junto da pergunta: [{ key, label, value }]. Toda pergunta do
 * formulário aparece (mesmo sem resposta), para a versão ficar completa.
 */
export function anamnesisEntries(respostas = {}) {
  const r = respostas ?? {}
  const detailOf = (key) => `${key}Detalhe`
  const hasAnswer = (k) => answerText(r[k]) !== "—" || String(r[detailOf(k)] ?? "").trim() !== ""
  const keys = [
    ...ORDER,
    // Campos fora do formulário: só se tiverem resposta (ex.: dados antigos).
    ...Object.keys(r).filter(
      (k) =>
        !ORDER.includes(k) &&
        !HIDDEN.has(k) &&
        !k.endsWith("Detalhe") &&
        hasAnswer(k),
    ),
  ]
  return keys.map((key) => {
    const detail = String(r[detailOf(key)] ?? "").trim()
    const value = answerText(r[key])
    return { key, label: anamnesisLabel(key), value: detail ? `${value} — ${detail}` : value }
  })
}
