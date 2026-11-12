import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/api"
import {
  clearToken,
  getToken,
  onSessionExpired,
  setSessionScope,
} from "@/api/session"

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
  const [clinic, setClinic] = useState(null) // { empresa, servicos, categorias }
  const [clinicNotFound, setClinicNotFound] = useState(false)

  // Fluxo da gestora: empresa e catálogo.
  const [company, setCompany] = useState(null)
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [serviceCategories, setServiceCategories] = useState([])
  // Ref com o valor mais recente da empresa, usada para desfazer se o salvamento falhar.
  const companyRef = useRef(company)
  companyRef.current = company

  /** Depois do login da gestora: busca empresa, serviços e categorias ao mesmo tempo. */
  const loadManagerWorkspace = useCallback(async () => {
    const [empresa, servicos, categorias] = await Promise.all([
      api.company.get(),
      api.catalog.listServices(),
      api.catalog.listCategories(),
    ])
    setCompany(empresa)
    setServiceCatalog(servicos)
    setServiceCategories(categorias)
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
      } catch {
        clearToken()
        if (!cancelled) setModeState(visitorMode)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clinicSlug, loadClinic, loadManagerWorkspace, visitorMode])

  useEffect(
    () =>
      // Se o backend responder 401 em qualquer tela, volta para o login com um aviso.
      onSessionExpired(() => {
        setModeState(visitorMode)
        notify("Sua sessão expirou. Entre novamente.")
      }),
    [notify, visitorMode],
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
    } catch (error) {
      setCompany(previous)
      notify(`Não foi possível salvar: ${error.message}`)
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
  const addCategory = async (nome) =>
    setServiceCategories(await api.catalog.createCategory(nome))

  const removeCategory = async (nome) =>
    setServiceCategories(await api.catalog.deleteCategory(nome))

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
        }
      : {
          company,
          services: serviceCatalog,
          categories: serviceCategories,
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
    updateCompany,
    saveService,
    setServiceActive,
    addCategory,
    removeCategory,
    loginManager,
    registerCompany,
    loginClient,
    registerClient,
    clientView,
  }
}
