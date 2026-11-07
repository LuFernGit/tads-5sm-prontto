import { useState } from "react"
import Action from "@/components/ui/Action"
import NewTabHint from "@/components/ui/NewTabHint"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import {
  formatDuration,
  formatPrice,
  normalizeCategoryName,
} from "@/lib/format"
import { maskMoney, moneyToMask, parseMoney } from "@/lib/masks"
import { openWhatsApp } from "@/lib/whatsapp"
import "./ServicesPage.css"

/**
 * Gerencia o catálogo de serviços, categorias, preços e visibilidade na vitrine.
 */
function ServicesPage({
  type,
  notify,
  serviceRows,
  serviceCategories,
  onSaveService,
  onSetServiceActive,
  onAddCategory,
  onRemoveCategory,
}) {
  // Esta tela foi feita para listar serviços ou clientes; o painel usa só type='services'.
  const isServices = type === "services"
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("Todos")
  // A visão type="clients" desta tela não é usada pelo painel atual (veja ClientsPage).
  const [clientRows] = useState([])
  // Controle dos modais: adicionar/editar, detalhes, ativar/desativar e categorias.
  const [showAdd, setShowAdd] = useState(false)
  const [details, setDetails] = useState(null)
  const [statusChange, setStatusChange] = useState(null)
  const [editingService, setEditingService] = useState(null)
  const [managingCategories, setManagingCategories] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  // Campos do formulário de serviço (modal 'Adicionar'/'Editar').
  const [formName, setFormName] = useState("")
  const [formDetail, setFormDetail] = useState("")
  const [formCategory, setFormCategory] = useState("Nail Design")
  const [formPrice, setFormPrice] = useState("")
  const [formDuration, setFormDuration] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formImage, setFormImage] = useState("")
  const [formImageName, setFormImageName] = useState("")
  // Lista filtrada pela busca e pelo filtro (Todos / Ativos / Inativos).
  const rows = (isServices ? serviceRows : clientRows).filter((item) => {
    const matchesQuery = `${item.name} ${
      isServices ? item.category : item.service
    }`
      .toLowerCase()
      .includes(query.toLowerCase())
    if (!matchesQuery || filter === "Todos") return matchesQuery
    return isServices
      ? item.active
        ? filter === "Ativos"
        : filter === "Inativos"
      : filter === "Em dia"
        ? item.tone === "green"
        : item.tone !== "green"
  })
  /** Cada clique no botão de filtro passa para a próxima opção (volta ao início no fim). */
  const cycleFilter = () => {
    const options = isServices
      ? ["Todos", "Ativos", "Inativos"]
      : ["Todos", "Em dia", "Atenção"]
    setFilter(options[(options.indexOf(filter) + 1) % options.length])
  }
  // Máscara de dinheiro sem o 'R$' (o símbolo já aparece ao lado do campo).
  const priceMask = (value) => maskMoney(value).replace(/^R\$\s?/, "")
  /** Salva o serviço do formulário: cria um novo ou atualiza o que está sendo editado. */
  const addItem = async () => {
    if (isServices) {
      // "150,00" → 150 (SERVICO.preco, reais) e "60" → 60 (SERVICO.duracao, minutos)
      const numericPrice = parseMoney(formPrice)
      const minutes = Number(formDuration)
      // Diz qual campo falta e como preencher (WCAG 3.3.3).
      const missing = !formName.trim()
        ? "Informe o nome do serviço. Exemplo: Volume Brasileiro."
        : !formPrice
          ? "Informe o preço em reais. Exemplo: 150,00."
          : !formDuration
            ? "Informe a duração em minutos. Exemplo: 90."
            : !formDescription.trim()
              ? "Escreva uma descrição curta do serviço para a vitrine."
              : !formImage
                ? "Adicione uma foto do serviço (JPG, PNG ou WEBP de até 5 MB)."
                : ""
      if (missing) {
        notify(missing)
        return
      }
      if (
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0 ||
        !Number.isInteger(minutes) ||
        minutes <= 0
      ) {
        notify("Informe o preço em reais e a duração em minutos (número inteiro).")
        return
      }
      const serviceData = {
        name: formName.trim(),
        category: formCategory,
        duration: minutes,
        price: numericPrice,
        active: editingService?.active ?? true,
        description: formDescription.trim(),
        image: formImage,
      }
      try {
        await onSaveService(serviceData, editingService?.id)
      } catch (error) {
        notify(error.message)
        return
      }
    } else return
    setFormName("")
    setFormDetail("")
    setFormCategory("Nail Design")
    setFormPrice("")
    setFormDuration("")
    setFormDescription("")
    setFormImage("")
    setFormImageName("")
    setEditingService(null)
    setShowAdd(false)
    notify(
      editingService
        ? "Serviço atualizado com sucesso."
        : "Novo serviço adicionado.",
    )
  }
  /** Lê a foto do serviço (imagem de até 5 MB) e guarda em base64. */
  const handleImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      notify("Selecione um arquivo de imagem.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("A imagem deve ter no máximo 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFormImage(String(reader.result))
      setFormImageName(file.name)
    }
    reader.readAsDataURL(file)
  }
  const selectedService = isServices
    ? serviceRows.find((service) => service.id === details)
    : undefined
  const selectedClient = !isServices
    ? clientRows.find((client) => client.name === details)
    : undefined
  /** Confirma ativar/desativar o serviço (inativo some da vitrine, mas não é apagado). */
  const confirmStatusChange = async () => {
    if (!statusChange) return
    try {
      await onSetServiceActive(statusChange.id, !statusChange.active)
    } catch (error) {
      notify(error.message)
      return
    }
    notify(
      statusChange.active
        ? "Serviço desativado. O histórico foi mantido."
        : "Serviço reativado.",
    )
    setStatusChange(null)
  }
  /** Abre o formulário preenchido com os dados do serviço (para editar). */
  const openServiceForm = (service) => {
    setEditingService(service || null)
    setFormName(service?.name || "")
    setFormCategory(service?.category || "Nail Design")
    setFormPrice(service ? priceMask(moneyToMask(service.price)) : "")
    setFormDuration(service ? String(service.duration ?? "") : "")
    setFormDescription(service?.description || "")
    setFormImage(service?.image || "")
    setFormImageName(service?.image ? "Foto atual do serviço" : "")
    setShowAdd(true)
  }
  /** Cria uma categoria nova (sem repetir nomes). */
  const addCategory = async () => {
    const category = newCategory.trim()
    if (!category) {
      notify("Informe o nome da nova categoria.")
      return
    }
    if (
      serviceCategories.some(
        (item) =>
          normalizeCategoryName(item) === normalizeCategoryName(category),
      )
    ) {
      notify(`A categoria “${category}” já existe. Use outro nome.`)
      return
    }
    try {
      await onAddCategory(category)
    } catch (error) {
      notify(error.message)
      return
    }
    setFormCategory(category)
    setNewCategory("")
    notify("Nova categoria criada.")
  }
  /** Remove uma categoria. */
  const removeCategory = async (category) => {
    if (serviceRows.some((service) => service.category === category)) {
      notify("Não é possível remover uma categoria que possui serviços.")
      return
    }
    try {
      await onRemoveCategory(category)
    } catch (error) {
      notify(error.message)
      return
    }
    notify("Categoria removida.")
  }
  return (
    <section className="page-card">
      <div className="page-card-head">
        <div>
          <span className="section-kicker">
            {isServices ? "CATÁLOGO DA CLÍNICA" : "RELACIONAMENTO"}
          </span>
          <div className="section-title">
            {isServices ? "Serviços & procedimentos" : "Clientes & histórico"}
          </div>
          <p>
            {isServices
              ? "Gerencie categorias, preços, duração e disponibilidade na vitrine."
              : "Consulte as informações e o histórico de aplicações sincronizados com os agendamentos."}
          </p>
        </div>
        {isServices && (
          <div className="page-head-actions">
            <Action
              variant="secondary"
              onClick={() => setManagingCategories(true)}
            >
              Gerenciar categorias
            </Action>
            <Action onClick={() => openServiceForm()}>
              <Icon name="plus" /> Novo serviço
            </Action>
          </div>
        )}
      </div>
      <div className="table-toolbar">
        <label htmlFor="srv-campo" className="search-box">
          <Icon name="search" />
          <input id="srv-campo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isServices
                ? "Buscar serviço ou categoria..."
                : "Buscar cliente ou procedimento..."
            }
          />
        </label>
        <Action variant="secondary" onClick={cycleFilter}>
          {filter} <Icon name="chevron" size={14} />
        </Action>
      </div>
      {isServices ? (
        <div className="data-table">
          <div className="table-row table-header">
            <span>SERVIÇO</span>
            <span>CATEGORIA</span>
            <span>DURAÇÃO</span>
            <span>VALOR</span>
            <span>NA VITRINE</span>
            <span />
          </div>
          {rows.map((service) => (
            <div className="table-row" key={service.id}>
              <span className="main-cell">
                {service.image ? (
                  <img className="service-thumb" src={service.image} alt="" />
                ) : (
                  <i className="service-icon">
                    <Icon name="sparkle" size={16} />
                  </i>
                )}
                {service.name}
              </span>
              <span>{service.category}</span>
              <span>{formatDuration(service.duration)}</span>
              <strong>{formatPrice(service.price)}</strong>
              <button
                type="button"
                aria-label={`Alterar visibilidade de ${service.name}`}
                className={`status-control ${
                  service.active ? "published" : "hidden"
                }`}
                onClick={() => setStatusChange(service)}
              >
                <Icon name={service.active ? "check" : "lock"} size={13} />
                <span>{service.active ? "Ativo" : "Inativo"}</span>
                <Icon name="chevron" size={12} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDetails(service.id)}
                aria-label={`Ver ficha completa de ${service.name}`}
              >
                <Icon name="more" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table clients-table">
          <div className="table-row table-header">
            <span>CLIENTE</span>
            <span>ÚLTIMA APLICAÇÃO</span>
            <span>DATA DA APLICAÇÃO</span>
            <span>MANUTENÇÃO</span>
            <span>AÇÕES</span>
          </div>
          {rows.map((client) => (
            <div
              className={`table-row ${client.removed ? "removed-client" : ""}`}
              key={client.name}
            >
              <span className="main-cell">
                <i className="client-initials">{client.initials}</i>
                <span className="client-name">
                  <strong>{client.name}</strong>
                  {client.removed && <small>Identidade anonimizada</small>}
                </span>
              </span>
              <span>
                <strong className="application-model">{client.model}</strong>
                <small className="application-category">{client.service}</small>
              </span>
              <span className="application-date">
                <strong>{client.lastDate}</strong>
                <small>{client.last}</small>
              </span>
              <span className={`alert-pill ${client.tone}`}>
                {client.alert}
              </span>
              <span className="client-row-actions">
                {!client.removed && (
                  <button
                    type="button"
                    className="icon-button whatsapp-icon"
                    title="Conversar no WhatsApp (abre em nova guia)"
                    onClick={() =>
                      openWhatsApp(`Olá, ${client.name}! Tudo bem?`)
                    }
                    aria-label={`Conversar com ${client.name} no WhatsApp (abre em nova guia)`}
                  >
                    <Icon name="whatsapp" size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button details-icon"
                  title={
                    client.removed
                      ? "Ver informações sobre a remoção"
                      : "Ver detalhes da última aplicação"
                  }
                  onClick={() => setDetails(client.name)}
                  aria-label={
                    client.removed
                      ? `Ver informações do registro removido`
                      : `Ver detalhes da última aplicação de ${client.name}`
                  }
                >
                  <Icon name="more" size={18} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {!rows.length && (
        <div className="empty-state">
          Nenhum resultado encontrado para sua busca.
        </div>
      )}
      {/* Modal: adicionar ou editar serviço. */}
      {showAdd && (
        <Modal
          wide={isServices}
          title={
            isServices
              ? editingService
                ? "Editar serviço"
                : "Novo serviço"
              : "Nova cliente"
          }
          onClose={() => {
            setShowAdd(false)
            setEditingService(null)
          }}
        >
          {isServices ? (
            <div className="modal-form service-form">
              <label htmlFor="srv-foto-do-servico" className="service-upload">
                <span>FOTO DO SERVIÇO</span>
                <input id="srv-foto-do-servico" type="file" accept="image/*" onChange={handleImage} />
                <div className={formImage ? "has-preview" : ""}>
                  {formImage ? (
                    <img src={formImage} alt="Pré-visualização do serviço" />
                  ) : (
                    <>
                      <Icon name="plus" />
                      <strong>Adicionar foto</strong>
                      <small>JPG, PNG ou WEBP · até 5 MB</small>
                    </>
                  )}{" "}
                </div>
                {formImageName && (
                  <small className="file-name">{formImageName}</small>
                )}
              </label>
              <div className="service-form-fields">
                <label htmlFor="srv-nome-do-servico" className="wide">
                  <span>NOME DO SERVIÇO</span>
                  <input id="srv-nome-do-servico"
                    autoFocus
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="Ex.: Alongamento em gel"
                  />
                </label>
                <label htmlFor="srv-categoria">
                  <span>CATEGORIA</span>
                  <select id="srv-categoria"
                    value={formCategory}
                    onChange={(event) => setFormCategory(event.target.value)}
                  >
                    {serviceCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="srv-preco-em-reais-r">
                  <span>PREÇO (EM REAIS)</span>
                  <div className="input-prefix">
                    <b>R$</b>
                    <input id="srv-preco-em-reais-r"
                      inputMode="numeric"
                      value={formPrice}
                      onChange={(event) =>
                        setFormPrice(priceMask(event.target.value))
                      }
                      placeholder="__,__"
                    />
                  </div>
                  <small className="field-hint">
                    Valor em reais. Digite só os números.
                  </small>
                </label>
                <label htmlFor="srv-duracao-em-minutos">
                  <span>DURAÇÃO (EM MINUTOS)</span>
                  <div className="input-suffix">
                    <input id="srv-duracao-em-minutos"
                      type="number"
                      min="5"
                      step="5"
                      inputMode="numeric"
                      value={formDuration}
                      onChange={(event) => setFormDuration(event.target.value)}
                      placeholder="60"
                    />
                    <b>min</b>
                  </div>
                  <small className="field-hint">
                    Considerado em minutos. Ex.: 90 = 1h30.
                  </small>
                </label>
                <label htmlFor="srv-descricao-do-servico" className="wide">
                  <span>DESCRIÇÃO DO SERVIÇO</span>
                  <textarea id="srv-descricao-do-servico"
                    rows={4}
                    maxLength={280}
                    value={formDescription}
                    onChange={(event) => setFormDescription(event.target.value)}
                    placeholder="Descreva a técnica, o resultado esperado e os principais diferenciais..."
                  />
                  <small className="character-count">
                    {formDescription.length}/280
                  </small>
                </label>
              </div>
            </div>
          ) : (
            <div className="modal-form">
              <label htmlFor="srv-nome">
                <span>NOME</span>
                <input id="srv-nome"
                  autoFocus
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Nome completo"
                />
              </label>
              <label htmlFor="srv-procedimento-de-interesse">
                <span>PROCEDIMENTO DE INTERESSE</span>
                <input id="srv-procedimento-de-interesse"
                  value={formDetail}
                  onChange={(event) => setFormDetail(event.target.value)}
                  placeholder="Ex.: Lash Design"
                />
              </label>
            </div>
          )}
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => {
                setShowAdd(false)
                setEditingService(null)
              }}
            >
              Cancelar
            </Action>
            <Action onClick={addItem}>
              {isServices
                ? editingService
                  ? "Salvar alterações"
                  : "Cadastrar serviço"
                : "Adicionar"}
            </Action>
          </div>
        </Modal>
      )}
      {/* Modal: detalhes do serviço. */}
      {details && (
        <Modal
          wide={Boolean(selectedService || selectedClient)}
          title={selectedService?.name || selectedClient?.name || details}
          onClose={() => setDetails(null)}
        >
          {selectedService ? (
            <div className="service-detail">
              <div className="service-detail-hero">
                {selectedService.image ? (
                  <img src={selectedService.image} alt={selectedService.name} />
                ) : (
                  <div>
                    <Icon name="sparkle" />
                    <span>Sem foto cadastrada</span>
                  </div>
                )}
                <span
                  className={`service-visibility ${
                    selectedService.active ? "published" : "hidden"
                  }`}
                >
                  <Icon
                    name={selectedService.active ? "check" : "lock"}
                    size={12}
                  />
                  {selectedService.active
                    ? "Ativo na vitrine"
                    : "Inativo na vitrine"}
                </span>
              </div>
              <div className="modal-details service-facts">
                <span>
                  <small>CATEGORIA</small>
                  <strong>{selectedService.category}</strong>
                </span>
                <span>
                  <small>DURAÇÃO APROXIMADA</small>
                  <strong>{formatDuration(selectedService.duration)}</strong>
                </span>
                <span>
                  <small>PREÇO</small>
                  <strong>{formatPrice(selectedService.price)}</strong>
                </span>
              </div>
              <div className="service-description">
                <span className="section-kicker">DESCRIÇÃO COMPLETA</span>
                <p>
                  {selectedService.description ||
                    "Nenhuma descrição foi cadastrada para este serviço."}
                </p>
              </div>
            </div>
          ) : selectedClient ? (
            selectedClient.removed ? (
              <div className="lgpd-record">
                <div className="confirmation-icon warning">
                  <Icon name="lock" />
                </div>
                <span className="section-kicker">REGISTRO ANONIMIZADO</span>
                <p>
                  Os dados pessoais e o histórico desta cliente foram removidos
                  conforme solicitação da titular e as regras da LGPD. Nenhuma
                  informação de aplicação ou contato está disponível.
                </p>
              </div>
            ) : (
              <div className="client-application-record">
                <div className="application-record-head">
                  <div className="large-avatar">
                    {selectedClient.initials[0]}
                  </div>
                  <div>
                    <span className="section-kicker">ÚLTIMA APLICAÇÃO</span>
                    <strong>{selectedClient.model}</strong>
                    <small>
                      {selectedClient.service} · {selectedClient.lastDate}
                    </small>
                  </div>
                  <span className={`alert-pill ${selectedClient.tone}`}>
                    {selectedClient.alert}
                  </span>
                </div>
                <div className="modal-details application-facts">
                  <span>
                    <small>MODELO / TÉCNICA</small>
                    <strong>{selectedClient.model}</strong>
                  </span>
                  <span>
                    <small>TIPO DE ATENDIMENTO</small>
                    <strong>{selectedClient.applicationType}</strong>
                  </span>
                  <span>
                    <small>DATA DA APLICAÇÃO</small>
                    <strong>{selectedClient.lastDate}</strong>
                  </span>
                  <span>
                    <small>MAPPING UTILIZADO</small>
                    <strong>{selectedClient.mapping}</strong>
                  </span>
                </div>
                <div className="service-description">
                  <span className="section-kicker">
                    ANOTAÇÕES E OBSERVAÇÕES
                  </span>
                  <p>{selectedClient.notes}</p>
                </div>
                <div className="readonly-notice">
                  <Icon name="lock" size={14} />
                  Informações somente para consulta. O cadastro é atualizado
                  pelos fluxos de atendimento.
                </div>
              </div>
            )
          ) : null}
          <div className="modal-actions service-detail-actions">
            {selectedService && (
              <Action
                variant="secondary"
                onClick={() => {
                  setDetails(null)
                  setStatusChange(selectedService)
                }}
              >
                {selectedService.active
                  ? "Desativar serviço"
                  : "Reativar serviço"}
              </Action>
            )}
            <span />
            {selectedService && (
              <Action
                variant="secondary"
                onClick={() => {
                  setDetails(null)
                  openServiceForm(selectedService)
                }}
              >
                Editar serviço
              </Action>
            )}
            <Action
              variant={selectedService ? "primary" : "secondary"}
              onClick={() => setDetails(null)}
            >
              Fechar
            </Action>
            {selectedClient && !selectedClient.removed && (
              <Action
                onClick={() =>
                  openWhatsApp(`Olá, ${selectedClient.name}! Tudo bem?`)
                }
              >
                <Icon name="whatsapp" /> WhatsApp <NewTabHint compact />
              </Action>
            )}
          </div>
        </Modal>
      )}
      {/* Modal: confirmar ativar/desativar. */}
      {statusChange && (
        <Modal
          title={
            statusChange.active ? "Desativar serviço?" : "Reativar serviço?"
          }
          onClose={() => setStatusChange(null)}
        >
          <div className="confirmation-content">
            <div
              className={`confirmation-icon ${
                statusChange.active ? "warning" : "success"
              }`}
            >
              <Icon name={statusChange.active ? "lock" : "check"} />
            </div>
            <p>
              {statusChange.active ? (
                <>
                  <strong>{statusChange.name}</strong> deixará de aparecer na
                  vitrine e não poderá ser escolhido em novos agendamentos. O
                  cadastro e o histórico de agendamentos continuam guardados.
                </>
              ) : (
                <>
                  <strong>{statusChange.name}</strong> voltará a aparecer na
                  vitrine e ficará disponível para novos agendamentos.
                </>
              )}
            </p>
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setStatusChange(null)}>
              Cancelar
            </Action>
            <Action onClick={confirmStatusChange}>
              {statusChange.active
                ? "Sim, desativar serviço"
                : "Reativar serviço"}
            </Action>
          </div>
        </Modal>
      )}{" "}
      {/* Modal: gerenciar categorias. */}
      {managingCategories && (
        <Modal
          title="Gerenciar categorias"
          onClose={() => setManagingCategories(false)}
        >
          <p className="modal-copy">
            Categorias são os grupos usados para organizar os serviços na
            vitrine.
          </p>
          <div className="category-field-help">
            <strong>Digite o nome da categoria</strong>
            <small>
              Exemplos: Pilates, Consultas, Cabelo ou Massagens. Não coloque o
              nome de um serviço específico neste campo.
            </small>
          </div>
          <div className="category-create">
            <input
              autoFocus
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addCategory()}
              placeholder="Ex.: Pilates"
            />
            <Action onClick={addCategory}>
              <Icon name="plus" size={15} />
              Adicionar categoria
            </Action>
          </div>
          <div className="category-manager-list">
            {serviceCategories.map((category) => {
              const count = serviceRows.filter(
                (service) => service.category === category,
              ).length
              return (
                <div key={category}>
                  <span>
                    <strong>{category}</strong>
                    <small>
                      {count} {count === 1 ? "serviço" : "serviços"}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    disabled={count > 0}
                    title={
                      count > 0
                        ? "Remova ou mova os serviços antes de excluir a categoria"
                        : "Excluir categoria"
                    }
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
          <div className="modal-actions">
            <Action
              variant="secondary"
              onClick={() => setManagingCategories(false)}
            >
              Concluir
            </Action>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default ServicesPage
