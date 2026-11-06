import ExternalLink from "@/components/ui/ExternalLink"

/**
 * Exibe termos de uso, política de privacidade ou canais de contato da empresa.
 */
// kind = 'termos' | 'privacidade' | 'contato' (vem do # da URL, veja App.jsx).
function LegalPage({ kind, company, onBack }) {
  const wa = `https://wa.me/55${company.phone.replace(/\D/g, "")}`
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`
  return (
    <main className="ff-page">
      <header className="ff-header">
        <strong>prontto</strong>
        <button type="button" onClick={onBack}>
          ← Voltar
        </button>
      </header>
      <article className="ff-card legal" aria-labelledby="lg-title">
        {/* Termos de uso */}
        {kind === "termos" &&
          (company.termsOfUse?.trim() ? (
            <>
              <h1 id="lg-title">Termos de uso — {company.name}</h1>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                {company.termsOfUse}
              </div>
            </>
          ) : (
            <>
              <h1 id="lg-title">Termos de uso</h1>
              <h2>1. Sobre o serviço</h2>
              <p>
                O Prontto é a plataforma de agendamento usada pela{" "}
                {company.name}. Pelo link da clínica você vê os serviços,
                escolhe data e horário e confirma o agendamento.
              </p>
              <h2>2. Cadastro</h2>
              <p>
                Para agendar, informe nome completo, data de nascimento,
                WhatsApp, e-mail e senha. É preciso ter 15 anos ou mais. Você é
                responsável por manter a senha em segredo e por informar dados
                verdadeiros.
              </p>
              <h2>3. Ficha de saúde</h2>
              <p>
                A ficha de saúde ajuda a clínica a realizar o procedimento com
                segurança. Mantenha-a atualizada. Alterações ficam registradas
                em histórico.
              </p>
              <h2>4. Preços, horários e sinal</h2>
              <p>
                Preço, duração e horários disponíveis aparecem antes da
                confirmação. Para clientes novas, o sistema mostra uma simulação
                de sinal. Nesta versão, nenhum pagamento real é feito. Clientes
                recorrentes ficam isentas do sinal.
              </p>
              <h2>5. Cancelamento e alteração</h2>
              <p>
                Cancelamentos e reagendamentos devem ser pedidos com no mínimo
                24 horas de antecedência. Quando aplicável, vale o direito de
                arrependimento do Código de Defesa do Consumidor (art. 49).
              </p>
              <h2>6. Contato</h2>
              <p>
                Dúvidas e reclamações: veja a página{" "}
                <a href="#contato">Fale com a clínica</a>.
              </p>
            </>
          ))}

        {/* Política de privacidade */}
        {kind === "privacidade" &&
          (company.privacyPolicy?.trim() ? (
            <>
              <h1 id="lg-title">Política de privacidade — {company.name}</h1>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                {company.privacyPolicy}
              </div>
            </>
          ) : (
            <>
              <h1 id="lg-title">Política de privacidade</h1>
              <h2>Quais dados usamos e para quê</h2>
              <p>
                Usamos nome, data de nascimento, WhatsApp e e-mail para
                cadastro, agendamento e comunicação sobre o serviço. A senha é
                guardada de forma criptografada. A ficha de saúde (alergias e
                observações médicas) serve só para a segurança do procedimento e
                é vista por você e pela gestora da clínica.
              </p>
              <h2>Quem pode ver seus dados</h2>
              <p>
                Você vê apenas os seus dados e agendamentos. A gestora vê os
                dados das clientes da própria clínica. Ninguém mais tem acesso.
              </p>
              <h2>Por quanto tempo guardamos</h2>
              <ul>
                <li>
                  Registros de acesso (data e hora): 6 meses, em ambiente
                  seguro.
                </li>
                <li>
                  Histórico de prestação de serviços: no mínimo 3 anos, para
                  defesa em eventuais ações de reparação.
                </li>
                <li>
                  Registros de atendimentos e valores cobrados: 5 anos, para
                  fins de defesa do consumidor e auditoria fiscal.
                </li>
              </ul>
              <h2>Seus direitos (LGPD, art. 18)</h2>
              <p>
                Você pode pedir acesso, correção e exclusão dos seus dados em
                Meu perfil. Na exclusão, seus dados pessoais são anonimizados.
                Os registros de atendimento e valores continuam guardados, sem
                identificar você, durante os prazos acima.
              </p>
              <h2>Fale com a gente</h2>
              <p>
                Pedidos e dúvidas sobre privacidade:{" "}
                <a href={`mailto:${company.email}`}>{company.email}</a>.
              </p>
            </>
          ))}

        {/* Canais de contato */}
        {kind === "contato" && (
          <>
            <h1 id="lg-title">Fale com a clínica</h1>
            <dl className="ff-summary">
              <div>
                <dt>Empresa</dt>
                <dd>{company.name}</dd>
              </div>
              <div>
                <dt>Endereço</dt>
                <dd>{company.address}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{company.phone}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
              </div>
              <div>
                <dt>Instagram</dt>
                <dd>{company.instagram}</dd>
              </div>
            </dl>
            <p>
              Use este canal para dúvidas, reclamações e solicitações sobre seus
              agendamentos.
            </p>
            <div className="ff-actions ff-wrap">
              <ExternalLink href={wa}>Chamar no WhatsApp</ExternalLink>
              <ExternalLink href={maps}>
                Ver localização no Google Maps
              </ExternalLink>
            </div>
          </>
        )}
      </article>
    </main>
  )
}

export default LegalPage
