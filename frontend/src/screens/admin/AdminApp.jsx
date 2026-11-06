import { useState } from "react"
import { api } from "@/api"
import Action from "@/components/ui/Action"
import ConfirmModal from "@/components/ui/ConfirmModal"
import Icon from "@/components/ui/Icon"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import DashboardPage from "./DashboardPage"
import SchedulePage from "./SchedulePage"
import ClientsPage from "./ClientsPage"
import CustomizationPage from "./CustomizationPage"
import DocumentsPage from "./DocumentsPage"
import HealthPage from "./HealthPage"
import MessagesPage from "./MessagesPage"
import ServicesPage from "./ServicesPage"
import SettingsPage from "./SettingsPage"
import { useApiQuery } from "@/hooks/useApiQuery"
import { openWhatsApp } from "@/lib/whatsapp"
import "./AdminApp.css"

/* ---------- Painel da GESTORA (área administrativa) ---------- */
/**
 * Compõe o painel da gestora e alterna entre as páginas administrativas.
 */
function AdminApp({
  setMode,
  notify,
  serviceCatalog,
  serviceCategories,
  onSaveService,
  onSetServiceActive,
  onAddCategory,
  onRemoveCategory,
  company,
  setCompany,
}) {
  // Página aberta no painel. Começa no 'dashboard' e muda pelos botões do Sidebar.
  const [page, setPage] = useState("dashboard")
  // Busca os agendamentos uma vez aqui, porque várias páginas usam a mesma lista.
  const appointmentsQuery = useApiQuery(() => api.appointments.list(), [], {
    initialData: [],
  })
  const managerAppointments = appointmentsQuery.data ?? []
  // true = mostra o modal de confirmação para excluir a conta da clínica.
  const [confirmClinicDeletion, setConfirmClinicDeletion] = useState(false)
  /**
   * Cancela o agendamento no backend. Retorna o agendamento atualizado
   * (ou null em caso de erro, já avisado com notify).
   */
  const cancelAppointmentOnServer = async (id, motivo) => {
    try {
      const updated = await api.appointments.cancel(id, motivo)
      appointmentsQuery.setData((current) =>
        (current ?? []).map((item) => (item.id === id ? updated : item)),
      )
      return updated
    } catch (error) {
      notify(error.message)
      return null
    }
  }
  /** Cancelamento feito pela Agenda: cancela no backend e abre o WhatsApp com aviso pronto para a cliente. */
  const cancelManagerAppointment = async (id) => {
    const appointment = managerAppointments.find((item) => item.id === id)
    if (!appointment || appointment.status === "CANCELADO") return
    const updated = await cancelAppointmentOnServer(id, "Cancelado pela gestora")
    if (!updated) return
    openWhatsApp(
      `Olá, ${appointment.cliente}! Informamos que seu agendamento de ${appointment.servico}, marcado para ${appointment.data} às ${appointment.horario}, foi cancelado pela clínica. Entre em contato para combinarmos um novo horário.`,
      appointment.whatsapp,
    )
    notify(
      "Agendamento cancelado. O WhatsApp foi aberto com uma mensagem pronta para a cliente.",
    )
  }
  // Título mostrado no Topbar para cada página.
  const titles = {
    dashboard: "Visão geral",
    clients: "Clientes",
    services: "Serviços",
    health: "Ficha de Saúde",
    customization: "Personalização",
    settings: "Configurações",
    schedule: "Agenda",
    messages: "Mensagens WhatsApp",
    documents: "Termos",
  }
  /** Confirmou a exclusão: registra o pedido no backend e faz logout. */
  const confirmClinicDeletionRequest = async () => {
    setConfirmClinicDeletion(false)
    try {
      await api.company.requestDeletion()
    } catch (error) {
      notify(error.message)
      return
    }
    notify(
      "Solicitação de encerramento da conta da clínica registrada. Os dados sujeitos à retenção legal serão preservados.",
    )
    setMode("login")
  }
  return (
    <div className="admin-app">
      <Sidebar
        page={page}
        setPage={setPage}
        setMode={setMode}
        notify={notify}
        company={company}
      />
      {/* Menu lateral à esquerda; conteúdo da página à direita. */}
      <main className="admin-main" id="conteudo">
        <Topbar title={titles[page]} setMode={setMode} />
        <div className="admin-content">
          {/* Só a página escolhida é mostrada: cada linha testa page === '<nome>'. */}
          {page === "dashboard" && <DashboardPage notify={notify} />}
          {page === "clients" && <ClientsPage notify={notify} />}
          {page === "services" && (
            <ServicesPage
              type="services"
              notify={notify}
              serviceRows={serviceCatalog}
              serviceCategories={serviceCategories}
              onSaveService={onSaveService}
              onSetServiceActive={onSetServiceActive}
              onAddCategory={onAddCategory}
              onRemoveCategory={onRemoveCategory}
            />
          )}
          {page === "health" && <HealthPage notify={notify} />}
          {page === "schedule" && (
            <SchedulePage
              notify={notify}
              appointments={managerAppointments}
              onCancelAppointment={cancelManagerAppointment}
              // Horários já ocupados, com a data convertida de DD/MM/AAAA para AAAA-MM-DD.
              booked={managerAppointments
                .filter((a) => a.status !== "CANCELADO")
                .map((a) => ({
                  data: a.data.split("/").reverse().join("-"),
                  hora: a.horario,
                  cliente: a.cliente,
                }))}
            />
          )}
          {page === "messages" && (
            <MessagesPage
              notify={notify}
              company={company}
              appointments={managerAppointments}
              onCancelAppointment={cancelAppointmentOnServer}
            />
          )}
          {page === "documents" && <DocumentsPage notify={notify} />}
          {page === "customization" && (
            <CustomizationPage
              company={company}
              setCompany={setCompany}
              notify={notify}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              notify={notify}
              categories={serviceCategories}
              company={company}
              setCompany={setCompany}
              onRequestClinicDeletion={() => setConfirmClinicDeletion(true)}
            />
          )}
        </div>
      </main>
      {confirmClinicDeletion && (
        <ConfirmModal
          title="Solicitar exclusão da conta da clínica?"
          onClose={() => setConfirmClinicDeletion(false)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon warning">
              <Icon name="lock" />
            </div>
            <p>
              Ao confirmar, a sessão da gestora será encerrada e a solicitação
              de encerramento será registrada neste protótipo. Agendamentos
              futuros deverão ser tratados e dados que precisem ser mantidos por
              obrigação legal não serão apagados automaticamente.
            </p>
            <div className="modal-actions">
              <Action
                variant="secondary"
                onClick={() => setConfirmClinicDeletion(false)}
              >
                Voltar
              </Action>
              <Action variant="danger" onClick={confirmClinicDeletionRequest}>
                Confirmar solicitação
              </Action>
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}

export default AdminApp
