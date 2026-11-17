import { useEffect, useRef } from "react"
import SessionTimeoutWarning from "@/components/ui/SessionTimeoutWarning"
import Toast from "@/components/ui/Toast"
import { useAppSession } from "@/hooks/useAppSession"
import { useHash } from "@/hooks/useHash"
import { noticeTone } from "@/lib/noticeTone"
import AdminApp from "@/screens/admin/AdminApp"
import ClientLoginScreen from "@/screens/auth/ClientLoginScreen"
import InvalidClinicLink from "@/screens/auth/InvalidClinicLink"
import LoginScreen from "@/screens/auth/LoginScreen"
import ClientApp from "@/screens/client/ClientApp"
import LegalPage from "@/screens/LegalPage"

/**
 * Orquestra o roteamento entre os fluxos público, administrativo, da cliente e páginas legais.
 * O fluxo é escolhido apenas pela URL (veja useAppSession).
 */
export default function App() {
  // 'legal' = parte da URL depois do # (ex.: #termos). Abre as páginas legais.
  const legal = useHash()
  // useAppSession concentra o estado global: qual tela mostrar (mode),
  // dados da empresa, catálogo de serviços e as funções de login/cadastro.
  const state = useAppSession()
  const {
    mode,
    setMode,
    notice,
    noticeToneOverride,
    setNotice,
    notify,
    clinicSlug,
    clinicCompany,
    clinicNotFound,
    company,
    serviceCatalog,
    serviceCategories,
    categoryCovers,
    updateCompany,
    saveService,
    setServiceActive,
    addCategory,
    setCategoryCover,
    removeCategory,
    loginManager,
    registerCompany,
    loginClient,
    registerClient,
    clientView,
    idleSecondsLeft,
    stayConnected,
    endSessionNow,
  } = state
  // Favicon e título da aba: Prontto no fluxo da gestora; logo da clínica no link da cliente.
  const tabCompany = clinicSlug ? clinicCompany : null
  useEffect(() => {
    const icon =
      tabCompany?.favicon ||
      tabCompany?.logoImage ||
      `${import.meta.env.BASE_URL}favicom.svg`
    // Recria o <link> (alguns navegadores ignoram a troca de href no mesmo elemento).
    document
      .querySelectorAll("link[rel~='icon']")
      .forEach((element) => element.remove())
    const link = document.createElement("link")
    link.rel = "icon"
    link.href = icon
    if (icon.endsWith(".svg")) link.type = "image/svg+xml"
    else if (icon.endsWith(".png")) link.type = "image/png"
    document.head.appendChild(link)
    document.title = tabCompany ? tabCompany.name : "Prontto"
  }, [tabCompany])
  // Toast = aviso flutuante (ex.: 'Salvo com sucesso'). Só aparece se houver mensagem.
  // Cor: sucesso (azul-marinho) ou erro/validação (vermelho), pelo texto ou pelo
  // tipo passado em notify(msg, tipo). O LOGIN DA GESTORA está finalizado
  // (docs/TELAS-FINALIZADAS.md) e mantém o aviso como era: sempre o padrão.
  const isFinalizedManagerLogin = mode === "login" && !clinicSlug
  const toast = notice && (
    <Toast
      message={notice}
      tone={
        isFinalizedManagerLogin
          ? "success"
          : noticeToneOverride || noticeTone(notice)
      }
      onClose={() => setNotice("")}
    />
  )
  // Páginas legais (termos de uso, privacidade e contato), abertas pelo # da URL.
  // A tela de baixo continua MONTADA (só fica escondida): ao voltar, a aba, o
  // agendamento e o que já foi digitado continuam lá (antes tudo recomeçava).
  const legalCompany = clinicCompany ?? company
  const legalOpen =
    (legal === "termos" || legal === "privacidade" || legal === "contato") &&
    Boolean(legalCompany)
  // A página legal abre no topo; ao fechar, a tela de baixo volta para a
  // mesma posição de rolagem em que estava.
  const scrollBeforeLegal = useRef(null) // null = página legal fechada
  useEffect(() => {
    if (legalOpen) {
      // Só guarda ao ABRIR (de #termos para #contato continua o valor antigo).
      if (scrollBeforeLegal.current === null) scrollBeforeLegal.current = window.scrollY
      window.scrollTo(0, 0)
    } else if (scrollBeforeLegal.current !== null) {
      window.scrollTo(0, scrollBeforeLegal.current)
      scrollBeforeLegal.current = null
    }
  }, [legalOpen, legal])
  // Tela de entrar do cliente (fora da vitrine): ganha uma entrada no
  // histórico, e a seta "voltar" do navegador volta para a vitrine.
  const clientLoginOpen = Boolean(clinicSlug) && !clinicNotFound && mode === "login"
  useEffect(() => {
    if (!clientLoginOpen) return
    if (window.history.state?.prontoView !== "login")
      window.history.pushState({ prontoView: "login" }, "")
    const onPop = (event) => {
      if (event.state?.prontoView !== "login") setMode("guest")
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [clientLoginOpen, setMode])
  // 1) Enquanto verifica se já existe sessão salva, mostra 'Carregando…'.
  if (mode === "loading")
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#475569",
        }}
        aria-live="polite"
      >
        Carregando…
      </main>
    )
  // 2) O link da cliente aponta para uma clínica que não existe.
  if (clinicSlug && clinicNotFound) return <InvalidClinicLink />
  return (
    <>
      {legalOpen && (
        <LegalPage
          kind={legal}
          company={legalCompany}
          onBack={() => {
            window.location.hash = ""
          }}
        />
      )}
    {/* As cores da vitrine não são personalizáveis: vale sempre a paleta padrão
        definida em src/styles/base.css (decisão do projeto). */}
    <div className="app-shell" hidden={legalOpen}>
      {/* 4) Escolhe a tela principal conforme o 'mode':
          login → tela de login (da cliente se o link tem ?clinica=, senão da gestora)
          admin → painel da gestora | client/preview → vitrine da clínica */}
      {mode === "login" ? (
        clinicSlug ? (
          clinicCompany && (
            <ClientLoginScreen
              company={clinicCompany}
              notify={notify}
              onLogin={loginClient}
              onRegister={registerClient}
              onBack={() => setMode("guest")}
            />
          )
        ) : (
          <LoginScreen
            notify={notify}
            onManagerLogin={loginManager}
            onRegisterCompany={registerCompany}
          />
        )
      ) : mode === "admin" ? (
        <AdminApp
          setMode={setMode}
          notify={notify}
          serviceCatalog={serviceCatalog}
          serviceCategories={serviceCategories}
          categoryCovers={categoryCovers}
          onSaveService={saveService}
          onSetServiceActive={setServiceActive}
          onAddCategory={addCategory}
          onSetCategoryCover={setCategoryCover}
          onRemoveCategory={removeCategory}
          company={company}
          setCompany={updateCompany}
        />
      ) : (
        <ClientApp
          setMode={setMode}
          notify={notify}
          serviceCatalog={clientView.services}
          serviceCategories={clientView.categories}
          categoryCovers={clientView.categoryCovers}
          company={clientView.company}
          preview={mode === "preview"}
          guest={mode === "guest"}
        />
      )}
    </div>
      {/* Fora do bloco escondido: valem também com a página legal aberta. */}
      {toast}
      {/* Último minuto antes de encerrar a sessão por inatividade (WCAG 2.2.1). */}
      <SessionTimeoutWarning
        secondsLeft={idleSecondsLeft}
        onStay={stayConnected}
        onLeave={endSessionNow}
      />
    </>
  )
}
