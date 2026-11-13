import { useState } from "react"
import { api } from "@/api"
import AnamnesisFields from "@/components/forms/AnamnesisFields"
import Field, { aria } from "@/components/ui/Field"
import { emptyAnamnesis } from "@/constants"
import { toHealthRecord } from "@/lib/anamnesis"
import { PLACEHOLDER, maskPhone } from "@/lib/masks"
import {
  MIN_AGE_CLIENT,
  birthError,
  emailError,
  nameError,
  passwordError,
  phoneError,
  validateAnamnesis,
} from "@/lib/validators"
import NewTabHint from "@/components/ui/NewTabHint"
import "./ClientRegisterPage.css"

/**
 * Conduz o cadastro da cliente, preenchimento da anamnese e aceite dos termos.
 */
// ETAPAS (state 'step'): 0 = dados pessoais, 1 = ficha de saúde, 2 = termos e privacidade.
// onDone envia tudo ao backend (useAppSession.registerClient).
function ClientRegisterPage({ onBack, onDone, notify, company }) {
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  // d = dados pessoais; h = respostas da ficha de saúde (anamnese).
  const [d, setD] = useState({
    nome: "",
    nascimento: "",
    whatsapp: "",
    email: "",
    senha: "",
    confirma: "",
  })
  const [h, setH] = useState(emptyAnamnesis)
  const [accept, setAccept] = useState(false)
  const [acceptClinicTerms, setAcceptClinicTerms] = useState(false)
  // Atalho para os inputs: onChange={set('email')} atualiza só aquele campo.
  const set = (k) => (e) => setD((c) => ({ ...c, [k]: e.target.value }))
  const updateHealth = (key, value) =>
    setH((current) => ({ ...current, [key]: value }))
  /** Confere os campos da etapa atual e devolve um objeto { campo: 'mensagem de erro' }. */
  const validate = () => {
    const next = {}
    if (step === 0) {
      next.nome = nameError(d.nome)
      next.nascimento = birthError(d.nascimento, MIN_AGE_CLIENT)
      next.whatsapp = phoneError(d.whatsapp)
      next.email = emailError(d.email)
      next.senha = passwordError(d.senha)
      next.confirma =
        d.confirma === d.senha
          ? ""
          : "As senhas não são iguais. Digite a mesma senha nos dois campos."
    }
    if (step === 1) Object.assign(next, validateAnamnesis(h))
    if (step === 2) {
      next.accept = accept
        ? ""
        : "Para criar a conta, aceite os Termos de Uso do Prontto e a Política de Privacidade."
      next.acceptClinicTerms = acceptClinicTerms
        ? ""
        : "É necessário aceitar os termos de atendimento da clínica."
    }
    const filtered = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v),
    )
    setErrors(filtered)
    return Object.keys(filtered).length === 0
  }
  const [checking, setChecking] = useState(false)
  /**
   * E-mail e WhatsApp já usados por outra conta? Confere no backend na etapa
   * dos dados pessoais (e de novo antes de criar a conta), para o erro aparecer
   * embaixo do campo certo — e não só no fim, depois dos Termos.
   * Devolve true se pode seguir. Sem conexão, segue (o backend confere de novo).
   */
  const checkAvailability = async () => {
    setChecking(true)
    try {
      const r = await api.auth.checkAvailability({
        email: d.email.trim().toLowerCase(),
        whatsapp: d.whatsapp.replace(/\D/g, ""),
      })
      const found = {}
      if (r?.emailEmUso)
        found.email = "Este e-mail já está cadastrado. Entre com sua senha ou use outro e-mail."
      if (r?.whatsappEmUso)
        found.whatsapp = "Este WhatsApp já está cadastrado em outra conta. Use outro número ou entre na sua conta."
      if (Object.keys(found).length) {
        setErrors(found)
        setStep(0)
        notify(Object.values(found)[0], "error")
        return false
      }
      return true
    } catch {
      return true
    } finally {
      setChecking(false)
    }
  }
  /** Botão de avançar: valida, avança de etapa e, na última, envia o cadastro. */
  const advance = async (e) => {
    e.preventDefault()
    if (checking) return
    if (!validate()) {
      notify("Corrija os campos indicados para continuar.")
      return
    }
    if ((step === 0 || step === 2) && !(await checkAvailability())) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    onDone({
      usuario: {
        nome: d.nome.trim(),
        data_nascimento: d.nascimento,
        whatsapp: d.whatsapp.replace(/\D/g, ""),
        email: d.email.trim().toLowerCase(),
        senha: d.senha,
        tipo: "CLIENTE",
        recorrente: false,
        status: "ATIVO",
        solicitou_exclusao: false,
      },
      // FICHA_ANAMNESE: resumo (alergias/observacoes_medicas) + respostas (JSON)
      ficha: toHealthRecord({
        ...h,
        nomeCliente: h.nomeCliente || d.nome.trim(),
      }),
      aceite: {
        termos: true,
        privacidade: true,
        termosClinica: true,
        data_hora: new Date().toISOString(),
      },
    })
  }
  const names = ["Dados pessoais", "Ficha de saúde", "Termos e privacidade"]
  return (
    <main className="ff-page">
      <header className="ff-header">
        {/* Marca da clínica do link (logo + nome) */}
        <button
          type="button"
          className="ff-clinic-brand brand-home"
          aria-label={`${company.name} — voltar`}
          onClick={onBack}
        >
          <span className="ff-clinic-logo">
            {company.logoImage ? <img src={company.logoImage} alt="" /> : company.initials}
          </span>
          <strong>{company.name}</strong>
        </button>
        <button type="button" onClick={onBack}>
          ← Voltar ao login
        </button>
      </header>
      <div className="ff-registration-shell">
        {/* Lista lateral com as 3 etapas. */}
        <aside className="ff-registration-sidebar">
          <span className="ff-sidebar-kicker">CADASTRO DA CLIENTE</span>
          <h2>Seu cuidado começa por aqui</h2>
          <p>
            Preencha seus dados e a ficha de saúde para que a profissional possa
            preparar seu atendimento com mais segurança.
          </p>
          {names.map((name, i) => (
            <div
              key={name}
              className={`ff-side-step ${
                i === step ? "active" : i < step ? "done" : ""
              }`}
            >
              <i>{i < step ? "✓" : i + 1}</i>
              <span>{name}</span>
            </div>
          ))}
        </aside>
        <form
          className="ff-card"
          onSubmit={advance}
          noValidate
          aria-labelledby="ff-title"
        >
          <ol className="ff-steps" aria-label="Etapas do cadastro">
            {names.map((n, i) => (
              <li
                key={n}
                aria-current={i === step ? "step" : undefined}
                className={i === step ? "active" : i < step ? "done" : ""}
              >
                {i + 1}. {n}
              </li>
            ))}
          </ol>
          <span className="ff-stage">ETAPA {step + 1} DE 3</span>
          <h1 id="ff-title">
            {step === 0
              ? "Seus dados pessoais"
              : step === 1
                ? "Histórico geral de saúde e anamnese"
                : "Termos e privacidade"}
          </h1>
          {step === 0 && (
            <div className="ff-grid">
              <Field id="ff-nome" label="Nome completo *" error={errors.nome}>
                <input
                  {...aria("ff-nome", errors.nome)}
                  autoComplete="name"
                  autoFocus
                  value={d.nome}
                  onChange={set("nome")}
                />
              </Field>
              <Field
                id="ff-nasc"
                label="Data de nascimento *"
                error={errors.nascimento}
                hint={`Cadastro permitido a partir de ${MIN_AGE_CLIENT} anos.`}
              >
                <input
                  {...aria("ff-nasc", errors.nascimento, "x")}
                  type="date"
                  autoComplete="bday"
                  value={d.nascimento}
                  onChange={set("nascimento")}
                />
              </Field>
              <Field
                id="ff-whats"
                label="WhatsApp com DDD *"
                error={errors.whatsapp}
              >
                <input
                  {...aria("ff-whats", errors.whatsapp)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={PLACEHOLDER.phone}
                  value={d.whatsapp}
                  onChange={(e) =>
                    setD((c) => ({ ...c, whatsapp: maskPhone(e.target.value) }))
                  }
                />
              </Field>
              <Field id="ff-email" label="E-mail *" error={errors.email}>
                <input
                  {...aria("ff-email", errors.email)}
                  type="email"
                  autoComplete="email"
                  value={d.email}
                  onChange={set("email")}
                />
              </Field>
              <Field
                id="ff-senha"
                label="Senha *"
                error={errors.senha}
                hint="Mínimo de 8 caracteres, com letras e números."
              >
                <input
                  {...aria("ff-senha", errors.senha, "x")}
                  type="password"
                  autoComplete="new-password"
                  value={d.senha}
                  onChange={set("senha")}
                />
              </Field>
              <Field
                id="ff-conf"
                label="Confirmar senha *"
                error={errors.confirma}
              >
                <input
                  {...aria("ff-conf", errors.confirma)}
                  type="password"
                  autoComplete="new-password"
                  value={d.confirma}
                  onChange={set("confirma")}
                />
              </Field>
            </div>
          )}
          {step === 1 && (
            <>
              <section className="ff-why-box" aria-labelledby="ff-why-health">
                <strong id="ff-why-health">Por que devo preencher esse questionário?</strong>
                <p>
                  Essas informações ajudam a profissional a avaliar os cuidados
                  necessários antes do procedimento. Responda às perguntas
                  conforme seu conhecimento.
                </p>
              </section>
              <AnamnesisFields
                h={h}
                errors={errors}
                updateHealth={updateHealth}
                defaultName={d.nome}
                boxed
              />
            </>
          )}

          {step === 2 && (
            <div className="ff-grid ff-one">
              <section className="ff-notice" aria-labelledby="ff-why">
                <h2 id="ff-why">Por que pedimos seus dados</h2>
                <p>
                  Usamos nome, contato e data de nascimento para o cadastro e o
                  agendamento. A ficha de saúde serve para a segurança do
                  procedimento e só é vista por você e pela gestora. Você pode
                  pedir acesso, correção ou exclusão dos seus dados a qualquer
                  momento.
                </p>
                <p>
                  Os registros de atendimento e valores precisam ser guardados
                  por prazo legal. Nesse caso, seus dados pessoais são
                  anonimizados em vez de apagados.
                </p>
              </section>
              <section
                className="ff-notice"
                aria-labelledby="ff-clinic-terms-title"
              >
                <h2 id="ff-clinic-terms-title">
                  Termos de atendimento da {company.name}
                </h2>
                {company.clinicTermsDocument ? (
                  <p>
                    A empresa anexou o documento{" "}
                    <strong>
                      {company.clinicTermsFileName ||
                        "Termos de atendimento.pdf"}
                    </strong>
                    .{" "}
                    <a
                      href={company.clinicTermsDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir PDF dos termos <NewTabHint />
                    </a>
                    .
                  </p>
                ) : (
                  <p>
                    {company.termsOfUse?.trim() ||
                      `Estes são os termos demonstrativos de atendimento da ${company.name}. Ao agendar, a cliente deve conferir as informações do serviço, valores, horários, regras de cancelamento e orientações informadas pela empresa.`}
                  </p>
                )}
              </section>
              <p className="ff-small ff-terms-note">
                Este documento é fornecido pela própria empresa e é separado dos
                termos gerais do Prontto.
              </p>
              <div className="ff-check">
                <input
                  id="ff-accept"
                  type="checkbox"
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  aria-invalid={errors.accept ? true : undefined}
                  aria-describedby={
                    errors.accept ? "ff-accept-error" : undefined
                  }
                />
                <label htmlFor="ff-accept">
                  Li e aceito os <a href="#termos">Termos de Uso do Prontto</a>{" "}
                  e a <a href="#privacidade">Política de Privacidade</a>.
                </label>
              </div>
              {errors.accept && (
                <small id="ff-accept-error" className="ff-error" role="alert">
                  {errors.accept}
                </small>
              )}
              <div className="ff-check">
                <input
                  id="ff-clinic-accept"
                  type="checkbox"
                  checked={acceptClinicTerms}
                  onChange={(e) => setAcceptClinicTerms(e.target.checked)}
                  aria-invalid={errors.acceptClinicTerms ? true : undefined}
                  aria-describedby={
                    errors.acceptClinicTerms
                      ? "ff-clinic-accept-error"
                      : undefined
                  }
                />
                <label htmlFor="ff-clinic-accept">
                  Li e aceito os termos de atendimento da {company.name}.
                </label>
              </div>
              {errors.acceptClinicTerms && (
                <small
                  id="ff-clinic-accept-error"
                  className="ff-error"
                  role="alert"
                >
                  {errors.acceptClinicTerms}
                </small>
              )}
            </div>
          )}
          <div className="ff-actions">
            <button
              type="button"
              className="ff-btn ff-secondary"
              onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
            >
              {/* Textos dizem para onde o botão leva (sem "Continuar"/"Voltar" genéricos). */}
              {
                [
                  "Cancelar cadastro",
                  "← Voltar para dados pessoais",
                  "← Voltar para ficha de saúde",
                ][step]
              }
            </button>
            <button type="submit" className="ff-btn ff-navy">
              {
                [
                  "Ir para ficha de saúde",
                  "Ir para termos e privacidade",
                  "Criar minha conta",
                ][step]
              }
              {checking && " (conferindo…)"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default ClientRegisterPage
