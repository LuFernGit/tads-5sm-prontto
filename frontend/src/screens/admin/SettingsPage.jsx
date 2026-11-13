import { useEffect, useState } from "react"
import Action from "@/components/ui/Action"
import Icon from "@/components/ui/Icon"
import Modal from "@/components/ui/Modal"
import { api } from "@/api"
import {
  PLACEHOLDER,
  maskCep,
  maskCpfCnpj,
  maskPhone,
  onlyDigits,
} from "@/lib/masks"
import { cpfCnpjError, emailError } from "@/lib/validators"
import "./SettingsPage.css"

/** Siglas dos estados (CLINICA.uf). */
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

const DEFAULT_CANCELLATION =
  "Cancelamentos e reagendamentos devem ser solicitados com no mínimo 24 horas de antecedência."

/** "09:00" → "09h", "09:30" → "09h30". */
const hourLabel = (hhmm = "") => {
  const [h, m] = hhmm.split(":")
  return m && m !== "00" ? `${h}h${m}` : `${h}h`
}

/**
 * Resume o horário cadastrado na Agenda num texto:
 * "Segunda a sábado, das 09h às 19h (intervalo das 12h às 13h)".
 * rules = regras da Agenda (fromHorarioRows): { label, ativo, inicio, fim, almocoIni, almocoFim }.
 */
const summarizeHours = (rules = []) => {
  const groups = []
  rules.forEach((r) => {
    const key = r.ativo ? `${r.inicio}|${r.fim}|${r.almocoIni}|${r.almocoFim}` : "fechado"
    const last = groups[groups.length - 1]
    const day = String(r.label).replace("-feira", "") // "Segunda-feira" → "Segunda"
    if (last && last.key === key) last.days.push(day)
    else groups.push({ key, rule: r, days: [day] })
  })
  const parts = groups
    .filter((g) => g.key !== "fechado")
    .map(({ rule, days }) => {
      const label =
        days.length === 1 ? days[0] : `${days[0]} a ${days[days.length - 1].toLowerCase()}`
      const lunch =
        rule.almocoIni && rule.almocoFim
          ? ` (intervalo das ${hourLabel(rule.almocoIni)} às ${hourLabel(rule.almocoFim)})`
          : ""
      return `${label}, das ${hourLabel(rule.inicio)} às ${hourLabel(rule.fim)}${lunch}`
    })
  return parts.join("; ")
}

/**
 * Edita dados cadastrais, contatos, localização e políticas da empresa.
 * Tudo é salvo no backend (PUT /gestora/empresa): endereço em partes,
 * horário de atendimento (texto) e política de cancelamento (tabela CLINICA).
 */
function SettingsPage({
  notify,
  categories,
  company,
  setCompany,
  onRequestClinicDeletion,
}) {
  // Cópia editável dos dados da empresa. Só vai para o backend ao clicar em 'Salvar alterações'.
  const [profile, setProfile] = useState({
    clinicName: company.name,
    responsible: company.ownerName,
    document: maskCpfCnpj(company.cpfCnpj ?? ""), // CLINICA.cpf_cnpj
    phone: company.phone,
    whatsapp: company.phone,
    email: company.email,
    instagram: company.instagram,
    // Endereço em partes (CLINICA.cep, logradouro...). Cadastros antigos só
    // têm o texto completo: ele vai para o campo "Endereço".
    cep: company.cep ? maskCep(company.cep) : "",
    address: company.street || company.address || "",
    number: company.number ?? "",
    complement: company.complement ?? "",
    neighborhood: company.neighborhood ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    presentation: company.description,
    hours: company.hoursText ?? "",
    cancellation: company.cancellationPolicy || DEFAULT_CANCELLATION,
  })
  const [confirmSave, setConfirmSave] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sem texto salvo: sugere o horário real cadastrado na Agenda.
  useEffect(() => {
    if (company.hoursText) return undefined
    let active = true
    api.schedule
      .getBusinessHours()
      .then((rules) => {
        const text = summarizeHours(rules)
        if (active && text)
          setProfile((current) => (current.hours ? current : { ...current, hours: text }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [company.hoursText])
  /** Atualiza um campo do formulário sem apagar os outros. */
  const updateProfile = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }))
  /** Valida CPF/CNPJ e e-mail e pede confirmação antes de salvar. */
  const askSave = () => {
    const documentError = cpfCnpjError(profile.document)
    if (documentError) {
      notify(documentError, "error")
      return
    }
    if (emailError(profile.email ?? "")) {
      notify(emailError(profile.email ?? ""), "error")
      return
    }
    if (profile.cep && onlyDigits(profile.cep).length !== 8) {
      notify("O CEP precisa ter 8 números. Exemplo: 01310-100.", "error")
      return
    }
    setConfirmSave(true)
  }
  /** Junta o endereço em um texto só (vitrine) e salva tudo (setCompany → PUT /gestora/empresa). */
  const saveProfile = async () => {
    // O backend confere se o e-mail de contato é diferente do e-mail de acesso.
    const formattedAddress = profile.number
      ? `${profile.address}, ${profile.number}${
          profile.complement ? ` — ${profile.complement}` : ""
        }${profile.neighborhood ? ` · ${profile.neighborhood}` : ""}${
          profile.city ? `, ${profile.city}` : ""
        }${profile.state ? ` — ${profile.state}` : ""}`
      : profile.address
    setSaving(true)
    const ok = await setCompany((current) => ({
      ...current,
      name: profile.clinicName,
      ownerName: profile.responsible,
      cpfCnpj: onlyDigits(profile.document),
      phone: profile.whatsapp || profile.phone,
      email: profile.email,
      instagram: profile.instagram,
      address: formattedAddress,
      cep: onlyDigits(profile.cep),
      street: profile.address,
      number: profile.number,
      complement: profile.complement,
      neighborhood: profile.neighborhood,
      city: profile.city,
      state: profile.state.trim().toUpperCase(),
      description: profile.presentation,
      hoursText: profile.hours.trim(),
      cancellationPolicy: profile.cancellation.trim(),
    }))
    setSaving(false)
    setConfirmSave(false)
    if (ok) notify("Perfil da empresa salvo e vitrine atualizada.", "success")
  }
  return (
    <section className="settings-grid">
      <div className="page-card onboarding">
        <span className="section-kicker">CONFIGURAÇÕES DA CLÍNICA</span>
        <div className="section-title">Gerencie sua clínica</div>
        <p>
          Atualize os dados cadastrais, de contato e de atendimento da sua
          clínica.
        </p>
        <div className="settings-section">
          {/* Bloco 1: nome, responsável, CPF/CNPJ e e-mail de contato. */}
          <strong>Identificação</strong>
          <div className="form-grid">
            <label htmlFor="cfg-nome-do-estabelecimento">
              <span>NOME DO ESTABELECIMENTO</span>
              <input id="cfg-nome-do-estabelecimento"
                value={profile.clinicName}
                onChange={(event) =>
                  updateProfile("clinicName", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-responsavel">
              <span>RESPONSÁVEL</span>
              <input id="cfg-responsavel"
                value={profile.responsible}
                onChange={(event) =>
                  updateProfile("responsible", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-cpf-cnpj">
              <span>CPF / CNPJ</span>
              <input id="cfg-cpf-cnpj"
                inputMode="numeric"
                value={profile.document}
                onChange={(event) =>
                  updateProfile("document", maskCpfCnpj(event.target.value))
                }
                placeholder={PLACEHOLDER.cpfCnpj}
              />
            </label>
            <label htmlFor="cfg-e-mail-de-contato">
              <span>E-MAIL DE CONTATO DA CLÍNICA</span>
              <input id="cfg-e-mail-de-contato"
                type="email"
                value={profile.email}
                onChange={(event) => updateProfile("email", event.target.value)}
              />
              <small className="field-hint">
                Aparece na vitrine. Precisa ser diferente do seu e-mail de
                acesso.
              </small>
            </label>
          </div>
        </div>
        <div className="settings-section">
          {/* Bloco 2: telefone, WhatsApp e Instagram. */}
          <strong>Contato</strong>
          <div className="form-grid">
            <label htmlFor="cfg-telefone">
              <span>TELEFONE</span>
              <input id="cfg-telefone"
                inputMode="tel"
                value={profile.phone}
                onChange={(event) =>
                  updateProfile("phone", maskPhone(event.target.value))
                }
                placeholder={PLACEHOLDER.phone}
              />
            </label>
            <label htmlFor="cfg-whatsapp">
              <span>WHATSAPP</span>
              <input id="cfg-whatsapp"
                inputMode="tel"
                value={profile.whatsapp}
                onChange={(event) =>
                  updateProfile("whatsapp", maskPhone(event.target.value))
                }
                placeholder={PLACEHOLDER.phone}
              />
            </label>
            <label htmlFor="cfg-instagram" className="wide">
              <span>INSTAGRAM</span>
              <input id="cfg-instagram"
                value={profile.instagram}
                onChange={(event) =>
                  updateProfile("instagram", event.target.value)
                }
              />
            </label>
          </div>
        </div>
        <div className="settings-section">
          {/* Bloco 3: endereço completo. */}
          <strong>Localização</strong>
          <div className="form-grid address-grid">
            <label htmlFor="cfg-cep">
              <span>CEP</span>
              <input id="cfg-cep"
                value={profile.cep}
                inputMode="numeric"
                onChange={(event) =>
                  updateProfile("cep", maskCep(event.target.value))
                }
                placeholder={PLACEHOLDER.cep}
              />
            </label>
            <label htmlFor="cfg-endereco">
              <span>RUA</span>
              <input id="cfg-endereco"
                value={profile.address}
                onChange={(event) =>
                  updateProfile("address", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-numero">
              <span>NÚMERO</span>
              <input id="cfg-numero"
                value={profile.number}
                onChange={(event) =>
                  updateProfile("number", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-complemento">
              <span>COMPLEMENTO</span>
              <input id="cfg-complemento"
                value={profile.complement}
                onChange={(event) =>
                  updateProfile("complement", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-bairro">
              <span>BAIRRO</span>
              <input id="cfg-bairro"
                value={profile.neighborhood}
                onChange={(event) =>
                  updateProfile("neighborhood", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-cidade">
              <span>CIDADE</span>
              <input id="cfg-cidade"
                value={profile.city}
                onChange={(event) => updateProfile("city", event.target.value)}
              />
            </label>
            <label htmlFor="cfg-estado">
              <span>ESTADO</span>
              <select
                id="cfg-estado"
                value={profile.state.toUpperCase()}
                onChange={(event) => updateProfile("state", event.target.value)}
              >
                <option value="">Selecione</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="settings-section">
          {/* Bloco 4: categorias, apresentação, horário e política de cancelamento. */}
          <strong>Atendimento e vitrine</strong>
          <div className="form-grid">
            <label className="wide">
              <span>CATEGORIAS EXIBIDAS NA VITRINE</span>
              <div className="category-selector">
                {categories.map((category) => (
                  <span key={category} className="selected">
                    <Icon name="check" size={12} />
                    {category}
                  </span>
                ))}
              </div>
              <small>Novas categorias são criadas na aba Serviços.</small>
            </label>
            <label htmlFor="cfg-horario-de-funcionamento" className="wide">
              <span>HORÁRIO DE FUNCIONAMENTO</span>
              <input id="cfg-horario-de-funcionamento"
                value={profile.hours}
                onChange={(event) => updateProfile("hours", event.target.value)}
              />
            </label>
            <label htmlFor="cfg-apresentacao-da-clinica" className="wide">
              <span>APRESENTAÇÃO DA CLÍNICA</span>
              <textarea id="cfg-apresentacao-da-clinica"
                rows={3}
                maxLength={400}
                value={profile.presentation}
                onChange={(event) =>
                  updateProfile("presentation", event.target.value)
                }
              />
            </label>
            <label htmlFor="cfg-politica-de-cancelamento" className="wide">
              <span>POLÍTICA DE CANCELAMENTO</span>
              <textarea id="cfg-politica-de-cancelamento"
                rows={3}
                value={profile.cancellation}
                onChange={(event) =>
                  updateProfile("cancellation", event.target.value)
                }
              />
            </label>
          </div>
        </div>
        <div className="settings-save">
          <small>As alterações serão refletidas na vitrine pública.</small>
          <Action onClick={askSave}>Salvar alterações</Action>
        </div>
        <div className="clinic-account-danger">
          <span className="section-kicker">CONTA DA CLÍNICA</span>
          {/* Zona de perigo: abre o modal de confirmação que fica no AdminApp. */}
          <strong>Excluir conta da clínica</strong>
          <p>
            Se a clínica não quiser mais utilizar o Prontto, a gestora poderá
            solicitar o encerramento da conta. Antes da conclusão, serão
            avaliados agendamentos futuros e dados que precisem ser mantidos por
            obrigação legal.
          </p>
          <Action variant="danger" onClick={onRequestClinicDeletion}>
            Solicitar exclusão da conta
          </Action>
        </div>
      </div>
      {confirmSave && (
        <Modal
          kicker="CONFIGURAÇÕES"
          title="Salvar alterações?"
          onClose={() => !saving && setConfirmSave(false)}
        >
          <div className="confirmation-content">
            <div className="confirmation-icon success">
              <Icon name="check" />
            </div>
            <p>
              Os dados da clínica serão atualizados e as mudanças aparecem na
              vitrine pública para as clientes.
            </p>
          </div>
          <div className="modal-actions">
            <Action variant="secondary" onClick={() => setConfirmSave(false)}>
              Não, continuar editando
            </Action>
            <Action
              className={saving ? "disabled" : ""}
              onClick={() => !saving && saveProfile()}
            >
              {saving ? "Salvando…" : "Sim, salvar alterações"}
            </Action>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default SettingsPage
