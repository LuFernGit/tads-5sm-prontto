import { useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import PasswordInput from "@/components/ui/PasswordInput"
import { USE_MOCKS, api } from "@/api"
import { useFieldErrors } from "@/hooks/useFieldErrors"
import { emailError } from "@/lib/validators"
import ClientRegisterPage from "@/screens/client/ClientRegisterPage"
import "./ClientLoginScreen.css"

/* ---------- Link da clínica: login e cadastro da CLIENTE ---------- */
/**
 * Tela de autenticação e cadastro das clientes vinculadas a uma clínica.
 */
// Mesma estrutura do LoginScreen (gestora), mas com a identidade da clínica:
// imagem, nome, logo e textos vêm de 'company' (dados públicos da clínica do link).
function ClientLoginScreen({ company, notify, onLogin, onRegister, onBack }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [registering, setRegistering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Erros mostrados embaixo de cada campo (borda vermelha + orientação).
  const { a11y, errorFor, showErrors, clearOnInput } = useFieldErrors(notify)
  /** Clique em 'Entrar': valida o básico e chama o login da cliente. */
  const signIn = async () => {
    // Mensagens com sugestão de correção (WCAG 3.3.3), não só "dados inválidos".
    if (
      showErrors({
        "cl-email": email.trim()
          ? emailError(email)
          : "Digite o seu e-mail para entrar.",
        "cl-senha":
          !password &&
          "Digite a sua senha para entrar. Esqueceu? Use “Esqueci minha senha”.",
      })
    )
      return
    if (submitting) return
    setSubmitting(true)
    try {
      await onLogin(email.trim().toLowerCase(), password)
      notify("Acesso de cliente identificado.")
    } catch (error) {
      // Resposta do backend embaixo do campo: e-mail de gestora (403) ou de
      // outra clínica (400) → e-mail; e-mail ou senha incorretos (401) → senha.
      showErrors({
        [error.status === 403 || error.status === 400 ? "cl-email" : "cl-senha"]:
          error.message,
      })
      setSubmitting(false)
    }
  }
  /** 'Esqueci minha senha': envia o e-mail digitado para recuperação. */
  const forgotPassword = async () => {
    if (
      showErrors({
        "cl-email": email.trim()
          ? emailError(email)
          : "Para recuperar a senha, digite aqui o e-mail da sua conta.",
      })
    )
      return
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase())
      notify("Enviaremos as instruções de recuperação para o seu e-mail.")
    } catch (error) {
      notify(error.message)
    }
  }
  // Cliente clicou em 'Criar conta de cliente': mostra o cadastro.
  if (registering)
    return (
      <ClientRegisterPage
        company={company}
        notify={notify}
        onBack={() => setRegistering(false)}
        onDone={async (data) => {
          try {
            await onRegister(data)
            notify("Conta criada. Bem-vindo!")
          } catch (error) {
            notify(error.message)
          }
        }}
      />
    )
  // Logo + nome da clínica. Guardado numa variável porque aparece duas vezes
  // (na coluna da imagem e no topo da versão de celular).
  const clinicMark = (
    <div className="client-brand clinic-on-dark">
      <div className="ca-monogram">
        {company.logoImage ? (
          <img src={company.logoImage} alt="" />
        ) : (
          company.initials
        )}
      </div>
      <div>
        <strong>{company.name}</strong>
        <span>{company.tagline}</span>
      </div>
    </div>
  )
  return (
    <main className="login-page">
      {/* COLUNA ESQUERDA: capa da clínica. */}
      <section className="login-visual">
        <img src={company.heroImage} alt="" />
        <div />
        <div className="login-visual-copy">
          {clinicMark}
          <span>{company.tagline}</span>
          <h1>{company.heroTitle}</h1>
          <p>{company.description}</p>
        </div>
      </section>
      {/* COLUNA DIREITA: formulário de login da cliente. */}
      <section className="login-panel">
        <div className="login-box">
          <div className="login-mobile-brand">{clinicMark}</div>
          {/* Volta para a vitrine sem fazer login */}
          {onBack && (
            <button type="button" className="back-to-store" onClick={onBack}>
              ← Voltar para a vitrine
            </button>
          )}
          <span className="section-kicker">ÁREA DO CLIENTE</span>
          <div className="login-title">Entre na sua conta</div>
          <p>
            Acesse para agendar na {company.name} e acompanhar seus
            atendimentos.
          </p>
          <div className="login-form" onInput={clearOnInput}>
            <label htmlFor="cl-email">
              <span>E-MAIL</span>
              <input
                {...a11y("cl-email")}
                autoFocus
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
              />
              {errorFor("cl-email")}
            </label>
            <label htmlFor="cl-senha">
              <span>SENHA</span>
              <PasswordInput
                {...a11y("cl-senha")}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && signIn()}
                placeholder="Digite sua senha"
              />
              {errorFor("cl-senha")}
            </label>
            <button
              type="button"
              className="forgot-password"
              onClick={forgotPassword}
            >
              Esqueci minha senha
            </button>
            <Action className="full" onClick={signIn}>
              {submitting ? "Entrando…" : "Entrar"} <Icon name="arrow" />
            </Action>
          </div>
          <div className="login-divider">
            <span>OU</span>
          </div>
          <div className="company-signup">
            <strong>Ainda não tem conta?</strong>
            <p>Crie seu cadastro para agendar na {company.name}.</p>
            <Action
              variant="secondary"
              className="full"
              onClick={() => setRegistering(true)}
            >
              Criar conta de cliente
            </Action>
          </div>
          {/* Assinatura do Prontto: discreta (a página é da clínica), mas com
              a marca de verdade (símbolo + nome na fonte do logo). */}
          <p className="prontto-signature">
            <span className="prontto-signature-label">Agendamentos por</span>
            <span className="prontto-signature-brand">
              <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <rect x="13" y="13" width="38" height="38" rx="7"
                  transform="rotate(45 32 32)" stroke="#E0A96D" strokeWidth="4" />
                <rect x="22.5" y="22.5" width="19" height="19" rx="4"
                  transform="rotate(45 32 32)" stroke="#D97706" strokeWidth="4" />
              </svg>
              prontto
            </span>
          </p>
          {USE_MOCKS && (
            <small className="login-hint">
              Demonstração: jamily@email.com · senha: Prontto@123
            </small>
          )}
        </div>
      </section>
    </main>
  )
}

export default ClientLoginScreen
