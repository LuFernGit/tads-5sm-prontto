import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/api"
import { useLiveRefresh, useVersionRefresh } from "@/hooks/useLiveRefresh"
import {
  SESSION_IDLE_MINUTES,
  clearToken,
  getToken,
  isIdleExpired,
  onSessionExpired,
  setSessionScope,
  touchActivity,
} from "@/api/session"

/** Aviso mostrado quando a sessão é encerrada por inatividade. */
const IDLE_MESSAGE = `Sua sessão foi encerrada após ${SESSION_IDLE_MINUTES} minutos sem atividade. Entre novamente para continuar.`
// Eventos que contam como "a pessoa está usando o sistema".
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"]

/**
 * Estado global da aplicação: fluxo ativo (definido pela URL), sessão e
 * dados da empresa da gestora. Todos os dados vêm do backend via src/api.
 *
 *   /                           → fluxo da gestora (Prontto)
 *   /?clinica=ca-beauty-clinic  → fluxo da cliente da clínica
 */
export function useAppSession() {
  // Lê ?clinica=<slug> da URL uma única vez. Se existir, é o fluxo da cliente.
  const [clinicSlug] = useState(() => {
    const slug = new URLSearchParams(window.location.search).get("clinica")
    setSessionScope(slug ? `cliente:${slug}` : "gestora")
    return slug
  })
  /**
   * Modos: loading | login | admin (gestora) | client (cliente logada) |
   * guest (visitante na vitrine, sem login) | preview (gestora vendo a vitrine)
   * @type {["loading"|"login"|"admin"|"client"|"guest"|"preview", Function]}
   */
  const [mode, setModeState] = useState("loading")
  // Sem login: no link da clínica a pessoa vê a vitrine (guest); no link do Prontto, o login.
  const visitorMode = clinicSlug ? "guest" : "login"
  // notice = texto do aviso (Toast). notify(msg) é o atalho para mostrar um aviso.
  // noticeToneOverride: tipo forçado ("success" | "error"); sem ele, o tipo é
  // deduzido pelo texto (lib/noticeTone.js).
  const [notice, setNotice] = useState("")
  const [noticeToneOverride, setNoticeToneOverride] = useState(null)
  const notify = useCallback((message, tone = null) => {
    setNoticeToneOverride(tone)
    setNotice(message)
  }, [])

  // Fluxo da cliente: dados públicos da clínica do link.
  const [clinic, setClinic] = useState(null) // { empresa, servicos, categorias, capasCategorias }
  const [clinicNotFound, setClinicNotFound] = useState(false)

  // Fluxo da gestora: empresa e catálogo.
  const [company, setCompany] = useState(null)
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [serviceCategories, setServiceCategories] = useState([])
  // Fotos de capa das categorias: { [nome]: capa } (só as que têm foto própria).
  const [categoryCovers, setCategoryCovers] = useState({})
  // Ref com o valor mais recente da empresa, usada para desfazer se o salvamento falhar.
  const companyRef = useRef(company)
  companyRef.current = company

  /** Depois do login da gestora: busca empresa, serviços e categorias ao mesmo tempo. */
  const loadManagerWorkspace = useCallback(async () => {
    const [empresa, servicos, categorias, capas] = await Promise.all([
      api.company.get(),
      api.catalog.listServices(),
      api.catalog.listCategories(),
      api.catalog.listCategoryCovers(),
    ])
    setCompany(empresa)
    setServiceCatalog(servicos)
    setServiceCategories(categorias)
    setCategoryCovers(capas || {})
  }, [])

  /** Fluxo da cliente: busca os dados públicos da clínica do link. 404 = clínica não existe. */
  const loadClinic = useCallback(async () => {
    try {
      setClinic(await api.clinic.getPublic(clinicSlug))
      return true
    } catch (error) {
      if (error.status === 404) setClinicNotFound(true)
      else notify(error.message)
      return false
    }
  }, [clinicSlug, notify])

  // Inicialização: carrega a clínica do link e restaura a sessão salva.
  useEffect(() => {
    // 'cancelled' evita atualizar o estado se o componente sair da tela antes de terminar.
    let cancelled = false
    ;(async () => {
      if (clinicSlug && !(await loadClinic())) {
        if (!cancelled) setModeState("login")
        return
      }
      if (!getToken()) {
        if (!cancelled) setModeState(visitorMode)
        return
      }
      // Recarregou depois de muito tempo parada: a sessão já venceu por inatividade.
      if (isIdleExpired()) {
        clearToken()
        notify(IDLE_MESSAGE)
        if (!cancelled) setModeState(visitorMode)
        return
      }
      try {
        // Já existe token salvo: pergunta ao backend quem é o usuário e qual o perfil dele.
        // O perfil precisa combinar com o link (cliente no link da clínica, gestora no link do Prontto).
        const usuario = await api.auth.me()
        if (clinicSlug && usuario.perfil === "CLIENTE") {
          if (!cancelled) setModeState("client")
        } else if (!clinicSlug && usuario.perfil === "GESTORA") {
          await loadManagerWorkspace()
          if (!cancelled) setModeState("admin")
        } else {
          clearToken()
          if (!cancelled) setModeState(visitorMode)
        }
      } catch (error) {
        // Só descarta o login se o backend disser que o token não vale (401/403).
        // Falha passageira (backend reiniciando, timeout, erro 500) não desloga:
        // ao recarregar de novo, a sessão volta.
        if (error?.status === 401 || error?.status === 403) clearToken()
        else notify("Não foi possível restaurar sua sessão agora. Recarregue a página em instantes.", "error")
        if (!cancelled) setModeState(visitorMode)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clinicSlug, loadClinic, loadManagerWorkspace, notify, visitorMode])

  // INATIVIDADE: logada (gestora, cliente ou visualização da vitrine), cada
  // clique, tecla, toque ou rolagem renova o prazo; sem atividade por
  // SESSION_IDLE_MINUTES, a sessão é encerrada e volta para o login/vitrine.
  const loggedIn = mode === "admin" || mode === "client" || mode === "preview"
  useEffect(() => {
    if (!loggedIn) return undefined
    touchActivity()
    let lastTouch = Date.now()
    // No máximo 1 gravação a cada 15s (o mouse dispara muitos eventos).
    const onActivity = () => {
      if (Date.now() - lastTouch < 15000) return
      lastTouch = Date.now()
      touchActivity()
    }
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, onActivity, { passive: true }),
    )
    const timer = window.setInterval(() => {
      if (!getToken() || !isIdleExpired()) return
      api.auth.logout()
      setModeState(visitorMode)
      notify(IDLE_MESSAGE)
    }, 30000)
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity))
      window.clearInterval(timer)
    }
  }, [loggedIn, notify, visitorMode])

  useEffect(
    () =>
      // Se o backend responder 401 em qualquer tela, volta para o login com um aviso.
      onSessionExpired(() => {
        setModeState(visitorMode)
        notify("Sua sessão expirou. Entre novamente.")
      }),
    [notify, visitorMode],
  )

  // VITRINE AO VIVO: enquanto a cliente (ou visitante) está na vitrine, consulta
  // a versão leve da clínica e recarrega os dados se a gestora mudou algo
  // (ex.: serviço desativado some na hora e não pode mais ser agendado).
  useVersionRefresh(
    () => api.clinic.getVersion(clinicSlug),
    async () => setClinic(await api.clinic.getPublic(clinicSlug)),
    { enabled: Boolean(clinicSlug) && (mode === "client" || mode === "guest"), interval: 15000 },
  )

  // PAINEL AO VIVO: empresa, serviços e categorias da gestora (usados em
  // Serviços, Personalização e Configurações) se atualizam sem recarregar,
  // ex.: alteração feita em outra aba ou outro aparelho. Só troca o que mudou.
  useLiveRefresh(
    async () => {
      const [empresa, servicos, categorias, capas] = await Promise.all([
        api.company.get(),
        api.catalog.listServices(),
        api.catalog.listCategories(),
        api.catalog.listCategoryCovers(),
      ])
      const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b)
      setCompany((current) => (changed(current, empresa) ? empresa : current))
      setServiceCatalog((current) => (changed(current, servicos) ? servicos : current))
      setServiceCategories((current) => (changed(current, categorias) ? categorias : current))
      setCategoryCovers((current) => (changed(current, capas || {}) ? capas || {} : current))
    },
    { enabled: mode === "admin", interval: 20000 },
  )

  /** Ir para "login" ou voltar para a vitrine ("guest") encerra a sessão (logout). */
  const setMode = useCallback((next) => {
    if (next === "login" || next === "guest") api.auth.logout()
    setModeState(next)
  }, [])

  /* ---------- autenticação ---------- */

  /** Login da gestora: valida no backend, carrega os dados da empresa e abre o painel. */
  const loginManager = async (email, senha) => {
    await api.auth.loginManager(email, senha)
    await loadManagerWorkspace()
    setModeState("admin")
  }

  /** payload = { empresa, gestora, servicos, categorias, aceites } (veja api.auth.registerCompany) */
  const registerCompany = async (payload) => {
    await api.auth.registerCompany(payload)
    await loadManagerWorkspace()
    setModeState("admin")
  }

  /** Login da cliente na clínica do link. */
  const loginClient = async (email, senha) => {
    await api.auth.loginClient(clinicSlug, email, senha)
    setModeState("client")
  }

  /** Cadastro da cliente (dados pessoais + ficha de anamnese + aceite dos termos). */
  const registerClient = async (payload) => {
    await api.auth.registerClient(clinicSlug, payload)
    setModeState("client")
  }

  /* ---------- empresa e catálogo (gestora) ---------- */

  /** Aceita um objeto ou uma função (current) => next, como o setState. */
  const updateCompany = async (value) => {
    const previous = companyRef.current
    const next = typeof value === "function" ? value(previous) : value
    // Atualização 'otimista': mostra a mudança na hora e só desfaz se o backend recusar.
    setCompany(next)
    try {
      setCompany(await api.company.update(next))
      return true // quem chamou avisa o sucesso (ex.: Configurações, Personalização)
    } catch (error) {
      setCompany(previous)
      notify(`Não foi possível salvar: ${error.message}`, "error")
      return false
    }
  }

  /** Cria (sem id) ou atualiza (com id) um serviço. Lança ApiError em caso de falha. */
  const saveService = async (service, id) => {
    const saved = id
      ? await api.catalog.updateService(id, service)
      : await api.catalog.createService(service)
    setServiceCatalog((current) =>
      id
        ? current.map((item) => (item.id === id ? saved : item))
        : [...current, saved],
    )
    return saved
  }

  /** Ativa ou desativa um serviço (desativado não aparece na vitrine). */
  const setServiceActive = async (id, active) => {
    const saved = await api.catalog.setServiceActive(id, active)
    setServiceCatalog((current) =>
      current.map((item) => (item.id === id ? saved : item)),
    )
  }

  // Categorias: o backend devolve a lista completa já atualizada.
  // capa = foto de capa obrigatória (data URL), já reduzida no navegador.
  const addCategory = async (nome, capa) => {
    setServiceCategories(await api.catalog.createCategory(nome, capa))
    setCategoryCovers((current) => ({ ...current, [nome]: capa }))
  }

  /** Troca a foto de capa da categoria. */
  const setCategoryCover = async (nome, capa) =>
    setCategoryCovers((await api.catalog.setCategoryCover(nome, capa)) || {})

  /** Exclui a categoria; com "moverPara", os serviços dela vão para a outra categoria. */
  const removeCategory = async (nome, moverPara) => {
    setServiceCategories(await api.catalog.deleteCategory(nome, moverPara))
    setCategoryCovers((current) => {
      const next = { ...current }
      delete next[nome]
      return next
    })
    if (moverPara) setServiceCatalog(await api.catalog.listServices())
  }

  /* ---------- o que cada tela enxerga ---------- */

  const clinicCompany = clinic?.empresa ?? null
  // Na área da cliente usa os dados públicos da clínica; na pré-visualização da
  // gestora (mode 'preview') usa os dados da própria empresa dela.
  const clientView =
    (mode === "client" || mode === "guest") && clinic
      ? {
          company: clinic.empresa,
          services: clinic.servicos,
          categories: clinic.categorias,
          categoryCovers: clinic.capasCategorias || {},
        }
      : {
          company,
          services: serviceCatalog,
          categories: serviceCategories,
          categoryCovers,
        }

  return {
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
  }
}
