import { useRef, useState } from "react"
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
import { useFieldErrors } from "@/hooks/useFieldErrors"
import ImageFramer from "@/components/ui/ImageFramer"
import { DEFAULT_FRAMING, cropImage, isDefaultFraming } from "@/lib/imageCrop"
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
  // Enquadramento da foto (posição e zoom); aplicado como recorte ao salvar.
  const [framing, setFraming] = useState(DEFAULT_FRAMING)
  const fileInputRef = useRef(null)
  // Erros mostrados embaixo de cada campo (borda vermelha + orientação).
  const { a11y, errorFor, showErrors, clearOnInput, clearError, setErrors } =
    useFieldErrors(notify)
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
      // Cada campo errado mostra embaixo dele o que fazer (WCAG 3.3.3).
      if (
        showErrors({
          "srv-foto-do-servico":
            !formImage &&
            "Adicione uma foto do serviço: clique no quadro e escolha uma imagem JPG, PNG ou WEBP de até 5 MB.",
          "srv-nome-do-servico":
            !formName.trim() &&
            "Informe o nome do serviço. Exemplo: Volume Brasileiro.",
          "srv-preco-em-reais-r":
            (!Number.isFinite(numericPrice) || numericPrice <= 0) &&
            "Informe o preço em reais, só com números. Exemplo: 150,00.",
          "srv-duracao-em-minutos":
            (!Number.isInteger(minutes) || minutes <= 0) &&
            "Informe a duração em minutos, com número inteiro. Exemplo: 90.",
          "srv-descricao-do-servico":
            !formDescription.trim() &&
            "Escreva uma descrição curta do serviço para a vitrine.",
        })
      )
        return
      // Foto enquadrada: recorta no navegador antes de enviar.
      let image = formImage
      if (!isDefaultFraming(framing)) {
        try {
          image = await cropImage(formImage, framing)
        } catch {
          notify(
            "Não foi possível ajustar o enquadramento desta foto. Ela foi salva como estava.",
            "error",
          )
        }
      }
      const serviceData = {
        name: formName.trim(),
        category: formCategory,
        duration: minutes,
        price: numericPrice,
        active: editingService?.active ?? true,
        description: formDescription.trim(),
        image,
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
      showErrors({
        "srv-foto-do-servico":
          "Esse arquivo não é uma imagem. Escolha uma foto JPG, PNG ou WEBP.",
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrors({
        "srv-foto-do-servico":
          "A imagem tem mais de 5 MB. Escolha uma foto menor ou reduza o tamanho dela.",
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      clearError("srv-foto-do-servico")
      setFraming(DEFAULT_FRAMING)
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
    setErrors({})
    setFraming(DEFAULT_FRAMING)
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
      showErrors({
        "srv-nova-categoria":
          "Digite o nome da categoria e clique em “Adicionar categoria”. Exemplo: Pilates.",
      })
      return
    }
    if (
      serviceCategories.some(
        (item) =>
          normalizeCategoryName(item) === normalizeCategoryName(category),
      )
    ) {
      showErrors({
        "srv-nova-categoria": `A categoria “${category}” já existe. Use outro nome ou escolha a categoria existente.`,
      })
      return
    }
    try {
      await onAddCategory(category)
    } catch (error) {
      showErrors({ "srv-nova-categoria": error.message })
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
        {isServices ? (
          // Filtro de status com as 3 opções visíveis (antes era um botão que
          // alternava sozinho e não mostrava que havia outras opções).
          <div className="status-filter">
            <span id="srv-filtro-label">Mostrar:</span>
            <div
              className="segmented"
              role="group"
              aria-labelledby="srv-filtro-label"
            >
              {["Todos", "Ativos", "Inativos"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={filter === option ? "selected" : ""}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Action variant="secondary" onClick={cycleFilter}>
            {filter} <Icon name="chevron" size={14} />
          </Action>
        )}
      </div>
      {isServices ? (
        <div className="data-table services-table">
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
              {/* Mesmo botão "⋯" da tela Clientes (quadrado com borda, ícone navy) */}
              <span className="client-row-actions">
                <button
                  type="button"
                  className="icon-button details-icon"
                  onClick={() => setDetails(service.id)}
                  aria-label={`Ver ficha completa de ${service.name}`}
                  title="Ver ficha completa do serviço"
                >
                  <Icon name="more" size={18} />
                </button>
              </span>
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
          kicker={isServices ? "SERVIÇO" : "CLIENTE"}
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
            <div className="modal-form service-form" onInput={clearOnInput}>
              <div className="service-media">
              <label htmlFor="srv-foto-do-servico" className="service-upload">
                <span>FOTO DO SERVIÇO</span>
                <input
                  {...a11y("srv-foto-do-servico")}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  // Com foto, quem abre o seletor é o botão "Trocar foto"
                  tabIndex={formImage ? -1 : undefined}
                />
                {!formImage && (
                  <div>
                    <Icon name="plus" />
                    <strong>Adicionar foto</strong>
                    <small>JPG, PNG ou WEBP · até 5 MB</small>
                  </div>
                )}
                {!formImage && errorFor("srv-foto-do-servico")}
              </label>
              {/* Com foto: arrastar dentro do quadro para enquadrar (como na
                  foto de perfil do WhatsApp/Instagram) + botão para trocar. */}
              {formImage && (
                <>
                  <ImageFramer
                    src={formImage}
                    alt="Pré-visualização do serviço"
                    framing={framing}
                    onChange={setFraming}
                    canReset={!isDefaultFraming(framing)}
                    onReset={() => setFraming(DEFAULT_FRAMING)}
                  />
                  <div className="service-photo-file">
                    {formImageName && (
                      <small className="file-name">{formImageName}</small>
                    )}
                    <button
                      type="button"
                      className="service-change-photo"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Icon name="edit" size={14} /> Trocar foto
                    </button>
                  </div>
                  {errorFor("srv-foto-do-servico")}
                </>
              )}
              </div>
              <div className="service-form-fields">
                <label htmlFor="srv-nome-do-servico" className="wide">
                  <span>NOME DO SERVIÇO</span>
                  <input {...a11y("srv-nome-do-servico")}
                    autoFocus
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="Ex.: Alongamento em gel"
                  />
                  {errorFor("srv-nome-do-servico")}
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
                    <input {...a11y("srv-preco-em-reais-r", "srv-preco-hint")}
                      inputMode="numeric"
                      value={formPrice}
                      onChange={(event) =>
                        setFormPrice(priceMask(event.target.value))
                      }
                      placeholder="__,__"
                    />
                  </div>
                  {errorFor("srv-preco-em-reais-r")}
                  <small id="srv-preco-hint" className="field-hint">
                    Valor em reais. Digite só os números.
                  </small>
                </label>
                <label htmlFor="srv-duracao-em-minutos">
                  <span>DURAÇÃO (EM MINUTOS)</span>
                  <div className="input-suffix">
                    <input {...a11y("srv-duracao-em-minutos", "srv-duracao-hint")}
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
                  {errorFor("srv-duracao-em-minutos")}
                  <small id="srv-duracao-hint" className="field-hint">
                    Considerado em minutos. Ex.: 90 = 1h30.
                  </small>
                </label>
                <label htmlFor="srv-descricao-do-servico" className="wide">
                  <span>DESCRIÇÃO DO SERVIÇO</span>
                  <textarea {...a11y("srv-descricao-do-servico")}
                    rows={4}
                    maxLength={280}
                    value={formDescription}
                    onChange={(event) => setFormDescription(event.target.value)}
                    placeholder="Descreva a técnica, o resultado esperado e os principais diferenciais..."
                  />
                  {errorFor("srv-descricao-do-servico")}
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
              Sair sem salvar
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
          kicker={selectedService ? "SERVIÇO" : "CLIENTE"}
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
            <Action variant="secondary" onClick={() => setDetails(null)}>
              Fechar
            </Action>
            {selectedService && (
              <Action
                onClick={() => {
                  setDetails(null)
                  openServiceForm(selectedService)
                }}
              >
                Editar serviço
              </Action>
            )}
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
          kicker="SERVIÇO"
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
              {statusChange.active
                ? "Não, manter ativo"
                : "Não, manter inativo"}
            </Action>
            <Action
              variant={statusChange.active ? "danger" : "primary"}
              onClick={confirmStatusChange}
            >
              {statusChange.active
                ? "Sim, desativar serviço"
                : "Sim, reativar serviço"}
            </Action>
          </div>
        </Modal>
      )}{" "}
      {/* Modal: gerenciar categorias. */}
      {managingCategories && (
        <Modal
          kicker="CATEGORIAS"
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
          <div onInput={clearOnInput}>
            <label htmlFor="srv-nova-categoria" className="sr-only">
              Nome da nova categoria
            </label>
            <div className="category-create">
              <input
                {...a11y("srv-nova-categoria")}
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
            {errorFor("srv-nova-categoria")}
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
                    aria-label={`Excluir a categoria ${category}`}
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
