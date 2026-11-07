import Field from "@/components/ui/Field"
import Detail from "./Detail"
import YesNo from "./YesNo"
import "./AnamnesisFields.css"

/**
 * Reúne todas as perguntas e declarações da ficha de saúde da cliente.
 */
// Props: h = respostas atuais; errors = erros por campo; updateHealth(campo, valor)
// altera uma resposta. Usado no cadastro da cliente e na edição da ficha (ClientApp).
// Padrão das perguntas: <YesNo> (Sim/Não) e, se 'Sim', aparece um <Detail> para descrever.
// editing = true na edição da ficha (Meu perfil): layout mais limpo e sem os
// campos de local, nome e assinatura (eles só fazem sentido no cadastro).
// boxed = true no cadastro da cliente: cada pergunta dentro de uma caixa com borda
// (o texto de introdução fica num quadro separado, em ClientRegisterPage).
function AnamnesisFields({ h, errors, updateHealth, defaultName, editing = false, boxed = false }) {
  return (
    <div
      className={`ff-anamnesis ${editing || boxed ? "ff-anamnesis-clean" : ""} ${
        boxed ? "ff-anamnesis-boxed" : ""
      }`}
    >
      {!boxed && (
      <p className="ff-copy">
        Responda conforme seu conhecimento. As informações ajudam a profissional
        a avaliar os cuidados necessários antes do procedimento.
      </p>
      )}
      <h2 className="ff-section-heading">2. Histórico de saúde e alergias</h2>
      <YesNo
        id="a1"
        label="1. Você possui alguma alergia conhecida?"
        value={h.alergia}
        onChange={(v) => updateHealth("alergia", v)}
        error={errors.alergia}
      />
      {h.alergia === "Sim" && (
        <Detail
          id="a1d"
          label="Quais alergias?"
          value={h.alergiaDetalhe}
          onChange={(v) => updateHealth("alergiaDetalhe", v)}
          error={errors.alergiaDetalhe}
          placeholder="Ex.: látex, cola para cílios, acetona..."
        />
      )}
      <YesNo
        id="a2"
        label="2. Já apresentou alguma reação a cosméticos, esmaltes, géis, colas, tinturas, henna, adesivos ou outros produtos utilizados em procedimentos estéticos?"
        value={h.reacaoProduto}
        onChange={(v) => updateHealth("reacaoProduto", v)}
        error={errors.reacaoProduto}
      />
      {h.reacaoProduto === "Sim" && (
        <Detail
          id="a2d"
          label="Qual produto e qual foi a reação?"
          value={h.reacaoProdutoDetalhe}
          onChange={(v) => updateHealth("reacaoProdutoDetalhe", v)}
          error={errors.reacaoProdutoDetalhe}
          placeholder="Ex.: cola de cílios; vermelhidão e coceira..."
        />
      )}
      <fieldset className="ff-question">
        <legend>
          3. Você possui alguma condição de saúde, dermatológica ou ocular, ou
          está realizando algum tratamento que possa interferir nos
          procedimentos estéticos?
        </legend>
        <div className="ff-radio-row">
          {["Não", "Sim", "Não sei informar"].map((v) => (
            <label key={v} className="ff-radio">
              <input
                type="radio"
                name="a3"
                checked={h.condicaoTratamento === v}
                onChange={() => updateHealth("condicaoTratamento", v)}
              />
              {v}
            </label>
          ))}
        </div>
        {errors.condicaoTratamento && (
          <small className="ff-error">{errors.condicaoTratamento}</small>
        )}
      </fieldset>
      {h.condicaoTratamento === "Sim" && (
        <Detail
          id="a3d"
          label="Qual condição ou tratamento?"
          value={h.condicaoTratamentoDetalhe}
          onChange={(v) => updateHealth("condicaoTratamentoDetalhe", v)}
          error={errors.condicaoTratamentoDetalhe}
          placeholder="Descreva a condição ou o tratamento..."
        />
      )}
      <fieldset className="ff-question">
        <legend>
          4. Utiliza medicamentos ou produtos que possam sensibilizar a pele, os
          olhos, os lábios, as unhas ou afetar os fios?
        </legend>
        <div className="ff-radio-row">
          {["Não", "Sim", "Não sei informar"].map((v) => (
            <label key={v} className="ff-radio">
              <input
                type="radio"
                name="a4"
                checked={h.medicamentos === v}
                onChange={() => updateHealth("medicamentos", v)}
              />
              {v}
            </label>
          ))}
        </div>
        {errors.medicamentos && (
          <small className="ff-error">{errors.medicamentos}</small>
        )}
      </fieldset>
      {h.medicamentos === "Sim" && (
        <Detail
          id="a4d"
          label="Quais medicamentos ou produtos?"
          value={h.medicamentosDetalhe}
          onChange={(v) => updateHealth("medicamentosDetalhe", v)}
          error={errors.medicamentosDetalhe}
          placeholder="Informe o nome e, se souber, como utiliza..."
        />
      )}
      <h2 className="ff-section-heading">3. Condições atuais</h2>
      <fieldset className="ff-question">
        <legend>
          5. Atualmente, apresenta algum dos seguintes sinais na região que será
          submetida ao procedimento?
        </legend>
        <div className="ff-procedure-list">
          {[
            "Não apresento nenhum desses sinais",
            "Vermelhidão, coceira ou irritação",
            "Feridas, lesões ou inflamação",
            "Inchaço ou dor",
            "Secreção ou sinais de possível infecção",
            "Descamação intensa ou rachaduras",
            "Outro",
          ].map((v) => (
            <label key={v} className="ff-radio">
              <input
                type="checkbox"
                checked={h.sinaisAtuais.includes(v)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? v === "Não apresento nenhum desses sinais"
                      ? [v]
                      : [
                          ...h.sinaisAtuais.filter(
                            (x) => x !== "Não apresento nenhum desses sinais",
                          ),
                          v,
                        ]
                    : h.sinaisAtuais.filter((x) => x !== v)
                  updateHealth("sinaisAtuais", next)
                  // 'Não apresento nenhum desses sinais' conta como resposta 'Não'.
                  updateHealth(
                    "alteracaoAtual",
                    next.length === 0
                      ? ""
                      : next.includes("Não apresento nenhum desses sinais")
                        ? "Não"
                        : "Sim",
                  )
                }}
              />
              {v}
            </label>
          ))}
        </div>
        {errors.alteracaoAtual && (
          <small className="ff-error">{errors.alteracaoAtual}</small>
        )}
      </fieldset>
      {h.sinaisAtuais.includes("Outro") && (
        <Detail
          id="a5d"
          label="Descreva o outro sinal"
          value={h.alteracaoAtualDetalhe}
          onChange={(v) => updateHealth("alteracaoAtualDetalhe", v)}
          error={errors.alteracaoAtualDetalhe}
          placeholder="Descreva o sinal apresentado..."
        />
      )}
      <YesNo
        id="a6"
        label="6. Você apresenta alguma alteração nas unhas, nos cílios, nas sobrancelhas ou nos lábios?"
        value={h.condicaoOcular}
        onChange={(v) => updateHealth("condicaoOcular", v)}
        error={errors.condicaoOcular}
      />
      {h.condicaoOcular === "Sim" && (
        <Detail
          id="a6d"
          label="Qual(is)?"
          value={h.condicaoOcularDetalhe}
          onChange={(v) => updateHealth("condicaoOcularDetalhe", v)}
          error={errors.condicaoOcularDetalhe}
          placeholder="Ex.: unhas com alteração de cor; cílios com falhas; lábios ressecados..."
        />
      )}
      <YesNo
        id="a7"
        label="7. Você costuma apresentar herpes labial?"
        value={h.herpesLabial}
        onChange={(v) => updateHealth("herpesLabial", v)}
        error={errors.herpesLabial}
      />
      <YesNo
        id="a8"
        label="8. Você utiliza lentes de contato?"
        value={h.lentesContato}
        onChange={(v) => updateHealth("lentesContato", v)}
        error={errors.lentesContato}
      />
      <h2 className="ff-section-heading">
        4. Histórico de procedimentos estéticos
      </h2>
      <fieldset className="ff-question">
        <legend>9. Já realizou algum dos procedimentos abaixo?</legend>
        <div className="ff-procedure-list">
          {[
            "Não realizei nenhum",
            "Alongamento, gel ou esmaltação em gel nas unhas",
            "Extensão de cílios",
            "Lash Lifting",
            "Design ou tintura de sobrancelhas",
            "Brow Lamination",
            "Beauty Brows — Protocolo de Reconstrução",
            "Hidra Gloss ou outro procedimento labial",
            "Outro",
          ].map((v) => (
            <label key={v} className="ff-radio">
              <input
                type="checkbox"
                checked={
                  v === "Não realizei nenhum"
                    ? h.procedimentosAnteriores === "Não"
                    : h.procedimentos.includes(v)
                }
                onChange={(e) => {
                  if (v === "Não realizei nenhum") {
                    updateHealth(
                      "procedimentosAnteriores",
                      e.target.checked ? "Não" : "",
                    )
                    updateHealth("procedimentos", [])
                    updateHealth("outroProcedimento", "")
                  } else {
                    const arr = e.target.checked
                      ? [
                          ...h.procedimentos.filter(
                            (x) => x !== "Não realizei nenhum",
                          ),
                          v,
                        ]
                      : h.procedimentos.filter((x) => x !== v)
                    updateHealth("procedimentos", arr)
                    updateHealth(
                      "procedimentosAnteriores",
                      arr.length || h.outroProcedimento.trim() ? "Sim" : "",
                    )
                  }
                }}
              />
              {v}
            </label>
          ))}
        </div>
        {errors.procedimentosAnteriores && (
          <small className="ff-error">{errors.procedimentosAnteriores}</small>
        )}
      </fieldset>
      {(h.procedimentos.includes("Outro") ||
        h.procedimentosAnteriores === "Sim") && (
        <Detail
          id="a9d"
          label="Outro procedimento (se necessário)"
          value={h.outroProcedimento}
          onChange={(v) => {
            updateHealth("outroProcedimento", v)
            if (v.trim()) updateHealth("procedimentosAnteriores", "Sim")
          }}
          error={errors.procedimentos}
          placeholder="Informe outro procedimento, se não estiver na lista..."
        />
      )}
      <YesNo
        id="a10"
        label="10. Já apresentou alguma reação, complicação ou desconforto durante ou após procedimentos estéticos?"
        value={h.complicacaoAnterior}
        onChange={(v) => updateHealth("complicacaoAnterior", v)}
        error={errors.complicacaoAnterior}
      />
      {h.complicacaoAnterior === "Sim" && (
        <Detail
          id="a10d"
          label="Qual procedimento e o que aconteceu?"
          value={h.complicacaoAnteriorDetalhe}
          onChange={(v) => updateHealth("complicacaoAnteriorDetalhe", v)}
          error={errors.complicacaoAnteriorDetalhe}
          placeholder="Descreva o procedimento e a reação ou desconforto..."
        />
      )}
      <YesNo
        id="a11"
        label="11. Está utilizando atualmente algum produto aplicado sobre as unhas ou realizou recentemente algum procedimento químico nas unhas, cílios ou sobrancelhas?"
        value={h.problemaProcedimento}
        onChange={(v) => updateHealth("problemaProcedimento", v)}
        error={errors.problemaProcedimento}
      />
      {h.problemaProcedimento === "Sim" && (
        <Detail
          id="a11d"
          label="Qual procedimento ou produto e quando?"
          value={h.problemaProcedimentoDetalhe}
          onChange={(v) => updateHealth("problemaProcedimentoDetalhe", v)}
          error={errors.problemaProcedimentoDetalhe}
          placeholder="Informe o produto/procedimento e a data aproximada..."
        />
      )}
      <h2 className="ff-section-heading">5. Informações complementares</h2>
      <YesNo
        id="a12"
        label="12. Existe alguma outra informação sobre sua saúde, alergias, sensibilidades ou tratamentos que considere importante informar à profissional?"
        value={h.informacaoAdicional}
        onChange={(v) => updateHealth("informacaoAdicional", v)}
        error={errors.informacaoAdicional}
      />
      {h.informacaoAdicional === "Sim" && (
        <Detail
          id="a12d"
          label="Descreva"
          value={h.informacaoAdicionalDetalhe}
          onChange={(v) => updateHealth("informacaoAdicionalDetalhe", v)}
          error={errors.informacaoAdicionalDetalhe}
          placeholder="Informe qualquer detalhe relevante..."
        />
      )}
      <h2 className="ff-section-heading">6. Declaração da cliente</h2>
      <div className="ff-notice">
        <p>
          Declaro que respondi às perguntas de forma verdadeira, conforme meu
          conhecimento, e que me comprometo a informar à profissional qualquer
          alteração relevante antes da realização dos procedimentos.
        </p>
        <p>
          Estou ciente de que as informações desta ficha auxiliam na avaliação
          de segurança, mas não garantem a realização do procedimento. A
          profissional poderá solicitar esclarecimentos adicionais, recomendar
          avaliação especializada ou adiar o atendimento caso identifique
          possíveis riscos.
        </p>
      </div>
      <label htmlFor="fs-li-e-concordo-com" className="ff-check">
        <input id="fs-li-e-concordo-com"
          type="checkbox"
          checked={h.cienciaInformacoes}
          onChange={(e) => updateHealth("cienciaInformacoes", e.target.checked)}
        />
        <span>Li e concordo com a declaração acima.</span>
      </label>
      {errors.cienciaInformacoes && (
        <small className="ff-error">{errors.cienciaInformacoes}</small>
      )}
      {/* Local, nome e assinatura: não aparecem no cadastro nem na edição (layout de referência). */}
      {!editing && !boxed && (
      <div className="ff-grid ff-signature-fields">
        <Field id="ff-local-data" label="Local e data">
          <input
            id="ff-local-data"
            value={h.localData}
            onChange={(e) => updateHealth("localData", e.target.value)}
            placeholder="Cidade, DD/MM/AAAA"
          />
        </Field>
        <Field id="ff-nome-ficha" label="Nome da cliente">
          <input
            id="ff-nome-ficha"
            value={h.nomeCliente || defaultName}
            onChange={(e) => updateHealth("nomeCliente", e.target.value)}
          />
        </Field>
        <Field id="ff-assinatura" label="Assinatura da cliente (se aplicável)">
          <input
            id="ff-assinatura"
            value={h.assinatura}
            onChange={(e) => updateHealth("assinatura", e.target.value)}
            placeholder="Opcional"
          />
        </Field>
      </div>
      )}
    </div>
  )
}

export default AnamnesisFields
