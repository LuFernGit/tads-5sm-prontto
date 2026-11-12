/**
 * Decide se um aviso (Toast) é de SUCESSO ou de ERRO/ALERTA, pelo texto.
 *
 *   sucesso → azul-marinho com ✓ (ex.: "Serviço salvo.", "Link copiado.")
 *   erro    → vermelho com ⚠ (validações, alertas de botão e erros do backend)
 *
 * Regra: frases que começam pedindo uma ação/correção ("Escolha…", "Corrija…",
 * "Não foi possível…") são erro; frases com verbo de conclusão ("salvo",
 * "criado", "copiado"…) são sucesso; todo o resto (ex.: mensagens de erro do
 * backend) é tratado como erro. Para forçar: notify(texto, "success" | "error").
 */
const ERROR_START =
  /^(não|nao|corrija|selecione|marque|cadastre|informe|digite|escolha|preencha|use |este |esta |essa |esse |o |os |a |as |para |é |já |entre na sua conta|confira|anexe|adicione|crie )/i

const SUCCESS_WORDS =
  /\b(salv[ao]s?|criad[ao]s?|removid[ao]s?|atualizad[ao]s?|copiad[ao]s?|identificad[ao]s?|bem-vinda|enviaremos|liberad[ao]s?|bloquead[ao]s?|adicionad[ao]s?|aplicad[ao]s?|publicad[ao]s?|inativad[ao]s?|reativad[ao]s?|desativad[ao]s?|anexad[ao]s?|confirmad[ao]|encerrad[ao]|recuperamos)\b|\bcancelad[ao]\./i

export function noticeTone(message = "") {
  const text = String(message).trim()
  if (!text) return "success"
  if (ERROR_START.test(text)) return "error"
  if (SUCCESS_WORDS.test(text)) return "success"
  return "error"
}
