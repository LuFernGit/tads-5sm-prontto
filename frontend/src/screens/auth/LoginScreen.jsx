import { useState } from "react"
import Action from "@/components/ui/Action"
import Brand from "@/components/ui/Brand"
import Icon from "@/components/ui/Icon"
import { USE_MOCKS, api } from "@/api"
import { neutralLoginImage } from "@/constants"
import CompanyRegistrationPage from "./CompanyRegistrationPage"

/* ---------- Link do Prontto: login e cadastro da GESTORA ---------- */
/**
 * Tela de acesso da gestora e ponto de entrada para o cadastro de uma nova empresa.
 */
// Props (recebidas do App.jsx):
//   notify            → mostra um aviso (Toast) na tela
//   onManagerLogin    → faz o login da gestora (useAppSession.loginManager)
//   onRegisterCompany → envia o cadastro da empresa (useAppSession.registerCompany)
function LoginScreen({ notify, onManagerLogin, onRegisterCompany }) {
  // Estados da tela: o que foi digitado, se está no cadastro e se o login está em andamento.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  // true = mostra o cadastro da empresa no lugar do login.
  const [registering, setRegistering] = useState(false)
  // true enquanto espera o backend: evita cliques repetidos e mostra 'Entrando…'.
  const [submitting, setSubmitting] = useState(false)
  /** Clique em 'Entrar' (ou Enter no campo de senha). */
  const signIn = async () => {
    // Validação simples antes de chamar o backend (a validação real é feita lá).
    if (!email.includes("@") || !password) {
      notify("Informe um e-mail válido e a sua senha.")
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      // trim() tira espaços e toLowerCase() deixa minúsculo, igual ao e-mail salvo no banco.
      // Se der certo, o App troca sozinho para o painel (mode = 'admin').
      await onManagerLogin(email.trim().toLowerCase(), password)
      notify("Empresa e acesso de gestora identificados.")
    } catch (error) {
      notify(error.message)
      setSubmitting(false)
    }
  }
  /** 'Esqueci minha senha': usa o e-mail digitado para pedir a recuperação. */
  const forgotPassword = async () => {
    if (!email.includes("@")) {
      notify("Digite seu e-mail para recuperar a senha.")
      return
    }
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase())
      notify("Enviaremos as instruções de recuperação para o seu e-mail.")
    } catch (error) {
      notify(error.message)
    }
  }
  // Se a gestora clicou em 'Cadastre sua empresa', mostra o formulário de cadastro.
  if (registering)
    return (
      <CompanyRegistrationPage
        onBack={() => setRegistering(false)}
        onComplete={async (...args) => {
          try {
            await onRegisterCompany(...args)
          } catch (error) {
            notify(error.message)
          }
        }}
        notify={notify}
      />
    )
  return (
    // Layout em duas colunas: à esquerda a imagem (login-visual), à direita o formulário (login-panel).
    // 'neutral-auth' = visual padrão do Prontto (a gestora ainda não entrou em nenhuma clínica).
    <main className="login-page neutral-auth">
      {/* COLUNA ESQUERDA: imagem e apresentação do Prontto (some no celular). */}
      <section className="login-visual">
        <img src={neutralLoginImage} alt="" />
        <div />
        <div className="login-visual-copy">
          <Brand />
          <span>GESTÃO E AGENDAMENTO PARA EMPRESAS DE SERVIÇOS</span>
          <h1>Organização para sua empresa. Experiência para seus clientes.</h1>
          <p>
            Funcional, pilates, Salões, Clínicas e Consultórios em uma
            plataforma que assume a identidade de cada negócio.
          </p>
        </div>
      </section>
      {/* COLUNA DIREITA: formulário de login. */}
      <section className="login-panel">
        <div className="login-box">
          {/* Logo que aparece só no celular, quando a coluna da imagem fica escondida. */}
          <div className="login-mobile-brand">
            <Brand />
          </div>
          <span className="section-kicker">ACESSO DA EMPRESA</span>
          <div className="login-title">Entre na sua conta</div>
          <p>Use o e-mail e a senha cadastrados pela gestora.</p>
          {/* htmlFor do label + id do input ligam o texto ao campo (acessibilidade). */}
          <div className="login-form">
            <label htmlFor="lg-email">
              <span>E-MAIL</span>
              <input
                id="lg-email"
                autoFocus
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
              />
            </label>
            <label htmlFor="lg-senha">
              <span>SENHA</span>
              <input
                id="lg-senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && signIn()}
                placeholder="Digite sua senha"
              />
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
          {/* Separador 'OU' entre o login e o convite para cadastrar uma empresa. */}
          <div className="login-divider">
            <span>OU</span>
          </div>
          <div className="company-signup">
            <strong>Quer usar o Prontto na sua empresa?</strong>
            <p>
              Crie o painel, o catálogo e a vitrine em um cadastro guiado. Você
              receberá o link para suas clientes.
            </p>
            <Action
              variant="secondary"
              className="full"
              onClick={() => setRegistering(true)}
            >
              Cadastre sua empresa
            </Action>
          </div>
          {/* Só aparece no modo de demonstração (backend falso). */}
          {USE_MOCKS && (
            <small className="login-hint">
              Acesso demonstrativo: camile@cabeauty.com.br · senha: Prontto@123
            </small>
          )}
        </div>
      </section>
    </main>
  )
}

export default LoginScreen
