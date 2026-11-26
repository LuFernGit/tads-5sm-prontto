/*
 * Textos oficiais do Prontto (plataforma): Termos e Condições Gerais de Uso e
 * Política de Privacidade. Usados por LegalText (screens/LegalPage.jsx) quando
 * a clínica não publicou o próprio documento, e no aceite do cadastro do
 * cliente ("Termos do Prontto").
 *
 * Formato de cada seção:
 *   h:      título da seção (h2)
 *   blocks: lista de blocos, cada um é
 *     { p: "texto" } ou { p: ["Rótulo:", "texto"] }  → parágrafo (rótulo em negrito)
 *     { list: ["texto", ["Rótulo:", "texto"], ...] } → lista com marcadores
 */

export const PRONTTO_TERMS = {
  title: "Termos e Condições Gerais de Uso — Prontto",
  version: "1.0",
  updated: "Novembro de 2026",
  intro: [
    "Bem-vindo(a) ao Prontto! Estes Termos e Condições Gerais de Uso regulam o acesso e a utilização da plataforma web Prontto, desenvolvida pela SDM.",
    "Ao criar uma conta, acessar a vitrine de serviços ou utilizar qualquer funcionalidade da Plataforma, você declara ter lido, compreendido e concordado integralmente com estes Termos. Caso não concorde com qualquer condição aqui prevista, você não deverá utilizar o sistema.",
  ],
  sections: [
    {
      h: "1. Sobre o Prontto e seu Funcionamento",
      blocks: [
        { p: "1.1. O Prontto é uma plataforma online de agendamento e organização de atendimentos que conecta empreendedores e prestadores de serviços (\"Gestores\") a pessoas interessadas em agendar procedimentos (\"Clientes\")." },
        { p: ["1.2. Papel da Plataforma:", "O Prontto disponibiliza a infraestrutura digital para divulgação de serviços, consulta de horários disponíveis, realização de agendamentos, preenchimento de fichas de anamnese/saúde e processamento de taxas de reserva (sinais) quando configuradas pelo estabelecimento. O Prontto não é o prestador dos serviços anunciados, não executa atendimentos presenciais e não integra a relação material de prestação de serviço técnico estabelecida diretamente entre o Gestor e o Cliente."] },
        { p: ["1.3. Pagamentos e Taxa de Sinal:", "Quando o Gestor habilita a exigência de sinal financeiro e define o respectivo valor para um serviço, o pagamento da taxa de reserva é processado por meio da Plataforma como condição para confirmação do agendamento, sendo o valor destinado ao estabelecimento responsável pelo atendimento. A definição da exigência, do percentual ou valor do sinal, da isenção para clientes recorrentes e das regras de estorno ou reembolso cabe exclusivamente ao Gestor."] },
      ],
    },
    {
      h: "2. Elegibilidade, Idade Mínima e Cadastro",
      blocks: [
        { p: ["2.1. Requisitos de Idade:", ""] },
        {
          list: [
            ["Para Gestores (Empreendedores / Prestadores de Serviço):", "O cadastro e a administração de um estabelecimento na Plataforma são permitidos apenas a pessoas com 16 (dezesseis) anos completos ou mais, desde que possuam plena capacidade civil (maiores de 18 anos) ou sejam legalmente emancipadas nos termos da legislação civil brasileira para exercer atividade econômica própria."],
            ["Para Clientes:", "O cadastro para realização de agendamentos é permitido a pessoas com 15 (quinze) anos completos ou mais. Usuários com idade entre 15 e 17 anos declaram utilizar a Plataforma com o conhecimento e a assistência de seus pais ou responsáveis legais, sujeitando-se ainda às restrições de idade definidas por cada estabelecimento para procedimentos específicos."],
          ],
        },
        { p: ["2.2. Conta Única e Veracidade dos Dados:", ""] },
        {
          list: [
            "Cada usuário deve manter uma única conta pessoal, vinculada a um endereço de e-mail e número de telefone válidos. É proibido criar cadastros duplicados ou utilizar dados de terceiros sem autorização.",
            "O usuário compromete-se a fornecer informações verdadeiras, exatas e atualizadas no momento do cadastro e durante todo o uso da Plataforma.",
          ],
        },
        { p: ["2.3. Segurança da Conta e Senha:", ""] },
        {
          list: [
            "O usuário deve cadastrar uma senha pessoal que atenda aos critérios mínimos de segurança exigidos pelo sistema e mantê-la em sigilo.",
            "Todas as senhas são armazenadas de forma criptografada, e o acesso às áreas restritas é controlado por perfil de usuário. O titular da conta é responsável por todas as ações realizadas por meio de suas credenciais de acesso.",
          ],
        },
      ],
    },
    {
      h: "3. Regras e Responsabilidades do Gestor (Prestador de Serviços)",
      blocks: [
        { p: "3.1. Ao cadastrar e gerenciar um estabelecimento no Prontto, o Gestor declara e compromete-se a:" },
        {
          list: [
            ["Informações Verdadeiras do Negócio:", "Fornecer dados reais, completos e atualizados sobre o estabelecimento (incluindo nome comercial, CPF ou CNPJ, endereço, canais oficiais de atendimento e horários de funcionamento)."],
            ["Clareza na Oferta:", "Informar de maneira clara e precisa o nome, a descrição, a duração estimada e o valor de cada serviço oferecido, mantendo sua agenda sempre atualizada para refletir a disponibilidade real de horários."],
            ["Políticas Próprias do Estabelecimento:", "Estabelecer e divulgar visivelmente suas próprias regras de atendimento, prazos para cancelamento ou remarcação, tolerância de atrasos, condições de cobrança, isenção ou reembolso de taxa de sinal e eventuais contraindicações dos procedimentos."],
            ["Habilitação Legal e Execução do Serviço:", "Possuir todas as qualificações profissionais, licenças, alvarás e autorizações sanitárias ou fiscais exigidas para o exercício de sua atividade, responsabilizando-se integralmente pela segurança, qualidade e execução dos atendimentos prestados."],
            ["Respeito aos Dados dos Clientes:", "Utilizar os dados pessoais e as fichas de anamnese/saúde dos Clientes exclusivamente para a realização segura dos atendimentos e gestão da agenda, mantendo absoluto sigilo e cumprindo a legislação de proteção de dados vigente."],
          ],
        },
      ],
    },
    {
      h: "4. Regras e Responsabilidades do Cliente",
      blocks: [
        { p: "4.1. Ao utilizar o Prontto para agendar serviços, o Cliente declara e compromete-se a:" },
        {
          list: [
            ["Veracidade Cadastral e de Saúde:", "Preencher seus dados pessoais e a ficha de anamnese/saúde com total honestidade e precisão, informando alergias, condições médicas ou restrições relevantes antes do atendimento."],
            ["Leitura Prévia das Condições:", "Verificar atentamente os detalhes do procedimento, o preço, a duração, eventual exigência de sinal e as políticas de cancelamento definidas pelo estabelecimento antes de confirmar o agendamento."],
            ["Compromisso com o Horário:", "Comparecer na data e horário marcados ou solicitar a alteração ou o cancelamento através da Plataforma dentro do prazo estipulado pelo estabelecimento."],
            ["Uso Adequado:", "Não utilizar a Plataforma para realizar reservas fictícias, abusivas ou com a finalidade de prejudicar a agenda de terceiros, nem tentar acessar informações ou áreas restritas a outros usuários."],
          ],
        },
      ],
    },
    {
      h: "5. Compromissos e Deveres do Prontto",
      blocks: [
        { p: "5.1. O Prontto compromete-se a:" },
        {
          list: [
            ["Transparência e Confirmação:", "Exibir de forma clara as condições informadas pelo estabelecimento antes da conclusão do agendamento, emitir confirmação imediata contendo os detalhes da reserva e disponibilizar os canais de contato e suporte informados pelo prestador de serviços."],
            ["Segurança e Registro de Atividades:", "Empregar boas práticas de segurança da informação para proteger as contas e os dados armazenados, mantendo o isolamento entre o painel administrativo de cada estabelecimento e a conta de cada Cliente, além de conservar os registros de acesso e operações pelos prazos exigidos pela legislação brasileira."],
            ["Acessibilidade:", "Buscar continuamente a melhoria da experiência digital para que a Plataforma seja acessível, clara e utilizável de forma autônoma por todas as pessoas, incluindo pessoas com deficiência."],
          ],
        },
      ],
    },
    {
      h: "6. Isenção e Limitação de Responsabilidade",
      blocks: [
        { p: "6.1. Nos limites permitidos pela legislação aplicável, o Prontto não se responsabiliza por:" },
        {
          list: [
            ["Políticas e Acordos Comerciais:", "Regras de cancelamento, remarcação, exigência ou isenção de sinal, reembolsos, atrasos ou condições comerciais definidas pelos Gestores ou acordadas diretamente entre Gestor e Cliente."],
            ["Qualidade e Resultado dos Atendimentos:", "Execução presencial dos procedimentos, falhas na prestação do serviço técnico, resultados estéticos ou eventuais danos decorrentes do atendimento realizado pelo estabelecimento."],
            ["Conteúdo Inserido pelos Usuários:", "Eventuais erros, omissões ou informações inverídicas cadastradas por Gestores na vitrine de serviços ou por Clientes em seus perfis e fichas de saúde."],
            ["Serviços Externos:", "Funcionamento, disponibilidade ou políticas de plataformas de terceiros acessadas por meio de links externos disponibilizados no sistema, como aplicativos de mensagens (WhatsApp) ou serviços de mapas."],
            ["Indisponibilidades Técnicas:", "Interrupções temporárias decorrentes de manutenções programadas, falhas na conexão de internet do usuário ou eventos fora do controle razoável da Plataforma."],
          ],
        },
      ],
    },
    {
      h: "7. Atualizações e Disposições Finais",
      blocks: [
        { p: "7.1. Estes Termos poderão ser atualizados a qualquer momento para refletir melhorias na Plataforma ou alterações legais. Quando houver mudanças relevantes, os usuários serão informados e poderá ser solicitado um novo aceite para continuidade do uso." },
        { p: "7.2. Estes Termos são regidos pelas leis da República Federativa do Brasil. Para a resolução de eventuais controvérsias, aplica-se o foro previsto na legislação brasileira aplicável, respeitado o foro do domicílio do consumidor quando cabível." },
      ],
    },
  ],
}

export const PRONTTO_PRIVACY = {
  title: "Política de Privacidade — Prontto",
  version: "1.0",
  updated: "Novembro de 2026",
  intro: [
    "A sua privacidade e a proteção dos seus dados pessoais são prioridades para o Prontto, desenvolvido pela SDM. Esta Política de Privacidade explica de forma clara e transparente como coletamos, utilizamos, armazenamos, protegemos e eliminamos os dados pessoais de nossos usuários, abrangendo tanto Gestores (empreendedores e prestadores de serviços) quanto Clientes (pessoas que realizam agendamentos), em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014) e demais normas aplicáveis.",
    "Ao utilizar a Plataforma e aceitar esta Política, você declara estar ciente das condições aqui descritas.",
  ],
  sections: [
    {
      h: "1. Papéis no Tratamento de Dados",
      blocks: [
        { p: ["1.1. Prontto (Plataforma):", "Atua na operação da infraestrutura tecnológica de agendamento, sendo responsável pela segurança do ambiente digital, pelo controle de acesso às contas, pela guarda dos registros de acesso e pela execução das medidas técnicas de proteção e anonimização descritas nesta Política."] },
        { p: ["1.2. Gestor (Estabelecimento / Prestador de Serviços):", "Ao cadastrar seu estabelecimento e receber agendamentos pela Plataforma, o Gestor atua como responsável pelo uso adequado dos dados pessoais e das fichas de anamnese de seus Clientes para fins de atendimento presencial, gestão de agenda e cumprimento de suas próprias obrigações legais e fiscais."] },
      ],
    },
    {
      h: "2. Quais Dados Coletamos e Para Quê",
      blocks: [
        { p: "Em respeito ao princípio da minimização de dados, o Prontto coleta apenas as informações estritamente necessárias para o funcionamento seguro da Plataforma:" },
        { p: ["2.1. Dados de Clientes:", ""] },
        {
          list: [
            ["Dados cadastrais e de identificação:", "Nome completo, data de nascimento (para verificação da idade mínima exigida), endereço de e-mail e número de telefone/WhatsApp, utilizados para criação da conta, identificação única, envio de confirmações e contato relacionado aos agendamentos."],
            ["Dados de saúde (Ficha de Anamnese):", "Informações sobre alergias, condições médicas e observações relevantes preenchidas antes do agendamento. Por serem dados pessoais sensíveis, são coletados exclusivamente para garantir a segurança e a personalização do procedimento solicitado, com acesso restrito ao próprio Cliente e ao Gestor responsável pelo atendimento."],
            ["Dados de agendamento e sinal:", "Histórico de procedimentos agendados, datas, horários, status do atendimento e comprovantes ou registros de pagamento de taxa de sinal quando exigida pelo estabelecimento."],
          ],
        },
        { p: ["2.2. Dados de Gestores (Empreendedores / Prestadores de Serviços):", ""] },
        {
          list: [
            ["Dados cadastrais e comerciais:", "Nome do responsável, nome comercial do estabelecimento, CPF ou CNPJ, endereço físico, e-mail, telefone/WhatsApp de atendimento, horários de funcionamento, catálogo de serviços e políticas comerciais, utilizados para habilitar a vitrine digital, validar a elegibilidade legal do negócio e cumprir as exigências de transparência ao consumidor."],
          ],
        },
        { p: ["2.3. Dados de Navegação, Segurança e Auditoria:", ""] },
        {
          list: [
            ["Registros de acesso e aceite:", "Data e hora de acesso, endereço IP de origem, registro eletrônico de aceite dos Termos de Uso e desta Política e histórico de ações críticas realizadas na conta (como alterações cadastrais, agendamentos e pedidos de exclusão), coletados para garantir a segurança da Plataforma, prevenir fraudes e cumprir obrigações legais."],
          ],
        },
      ],
    },
    {
      h: "3. Bases Legais para o Tratamento",
      blocks: [
        { p: "O tratamento de dados pessoais no Prontto fundamenta-se nas seguintes hipóteses previstas na LGPD:" },
        {
          list: [
            ["Execução de contrato ou de procedimentos preliminares (Art. 7º, V):", "Para viabilizar o cadastro, a gestão da agenda, a confirmação de reservas e a comunicação entre Cliente e Gestor."],
            ["Cumprimento de obrigação legal ou regulatória (Art. 7º, II e Art. 11, II, \"a\"):", "Para guarda de registros de acesso, comprovação de aceite de documentos, defesa em processos judiciais ou administrativos e manutenção de registros fiscais e de prestação de serviços pelos prazos exigidos por lei."],
            ["Consentimento do titular (Art. 7º, I e Art. 11, I):", "Quando aplicável ao fornecimento voluntário de informações de saúde na ficha de anamnese para a realização segura dos procedimentos."],
            ["Proteção da vida ou da incolumidade física (Art. 11, II, \"e\"):", "Como reforço de segurança na triagem prévia de alergias e restrições de saúde antes de procedimentos estéticos ou de bem-estar."],
          ],
        },
      ],
    },
    {
      h: "4. Compartilhamento de Dados",
      blocks: [
        { p: "4.1. O Prontto não vende, aluga nem comercializa dados pessoais de seus usuários para terceiros ou para fins publicitários." },
        { p: "4.2. O compartilhamento ocorre apenas nas seguintes situações estritamente necessárias:" },
        {
          list: [
            ["Entre Cliente e Gestor:", "Quando o Cliente realiza um agendamento, seus dados de identificação, contato e ficha de anamnese são disponibilizados ao Gestor do estabelecimento escolhido para viabilizar o atendimento. Da mesma forma, os dados institucionais e canais de contato do Gestor são exibidos ao Cliente."],
            ["Autoridades Públicas:", "Mediante requisição legal, judicial ou administrativa de autoridade competente, nos termos da lei."],
          ],
        },
      ],
    },
    {
      h: "5. Segurança da Informação e Controle de Acesso",
      blocks: [
        { p: "5.1. O Prontto adota medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acessos não autorizados, perda, alteração ou divulgação indevida, incluindo:" },
        {
          list: [
            ["Senhas criptografadas:", "As senhas dos usuários são armazenadas exclusivamente de forma criptografada, sendo impossível sua leitura em texto aberto pela Plataforma ou por terceiros."],
            ["Segregação de perfis:", "Cada usuário possui credenciais únicas e acessa apenas as funcionalidades e informações compatíveis com seu perfil (o Cliente visualiza apenas seus próprios dados e agendamentos; o Gestor acessa apenas o painel de seu próprio estabelecimento)."],
            ["Rastreabilidade:", "Ações relevantes de autenticação, alteração de dados sensíveis e solicitações de privacidade são registradas em trilhas internas de auditoria."],
          ],
        },
      ],
    },
    {
      h: "6. Retenção de Dados, Exclusão de Conta e Anonimização",
      blocks: [
        { p: ["6.1. Prazos Legais de Conservação:", "Os dados pessoais são mantidos apenas pelo tempo necessário para cumprir as finalidades para as quais foram coletados ou para atender a exigências legais e regulatórias brasileiras, destacando-se:"] },
        {
          list: [
            ["Registros de acesso à aplicação (data, hora e endereço IP):", "Conservados sob sigilo pelo prazo mínimo obrigatório de 6 (seis) meses, conforme o Marco Civil da Internet."],
            ["Histórico de atendimentos e registros financeiros/fiscais:", "Conservados pelos prazos legais aplicáveis à defesa de direitos e obrigações tributárias e civis (de 3 a 5 anos, conforme o Código Civil, o Código de Defesa do Consumidor e o Código Tributário Nacional)."],
          ],
        },
        { p: ["6.2. Solicitação de Exclusão de Conta e Anonimização:", ""] },
        {
          list: [
            "O usuário pode solicitar o encerramento de sua conta e a exclusão de seus dados pessoais diretamente nas configurações de seu perfil na Plataforma.",
            "Confirmada a solicitação, o acesso à conta é imediatamente bloqueado e os dados identificáveis do usuário deixam de ser exibidos nas áreas operacionais comuns do sistema.",
            "Quando houver obrigação legal de conservar o histórico de atendimentos realizados ou registros exigidos por lei, os dados pessoais identificáveis (como nome, e-mail, telefone e credenciais) são anonimizados, substituindo-se a identificação civil por um identificador técnico genérico sem vínculo pessoal direto, de modo a preservar a integridade dos registros históricos e fiscais sem expor a identidade do titular.",
            "Caso seja necessário o acesso excepcional a registros vinculados a uma conta encerrada por força de obrigação legal, fiscal ou exercício regular de direitos, o acesso será restrito a pessoas autorizadas, limitado à finalidade específica e devidamente registrado para auditoria.",
          ],
        },
      ],
    },
    {
      h: "7. Direitos do Titular dos Dados",
      blocks: [
        { p: "Em conformidade com a LGPD, você pode exercer a qualquer momento os seguintes direitos em relação aos seus dados pessoais:" },
        {
          list: [
            ["Confirmação e acesso:", "Confirmar a existência de tratamento e consultar os dados pessoais mantidos em sua conta."],
            ["Correção:", "Atualizar ou corrigir dados pessoais incompletos, inexatos ou desatualizados diretamente pelo painel do usuário ou mediante solicitação."],
            ["Anonimização, bloqueio ou eliminação:", "Solicitar a exclusão da conta ou a anonimização de dados desnecessários, excessivos ou tratados em desconformidade com a lei, ressalvadas as hipóteses legais de conservação."],
            ["Informação sobre compartilhamento e revogação:", "Obter esclarecimentos sobre com quem seus dados são compartilhados e revogar consentimentos previamente fornecidos, ciente de que a revogação pode inviabilizar a realização de novos agendamentos que exijam triagem prévia."],
          ],
        },
      ],
    },
    {
      h: "8. Canal de Atendimento de Privacidade e Atualizações",
      blocks: [
        { p: "8.1. Para esclarecer dúvidas sobre esta Política ou exercer seus direitos como titular de dados, o usuário pode utilizar o canal de atendimento e suporte disponibilizado na própria Plataforma." },
        { p: "8.2. Esta Política de Privacidade poderá ser atualizada periodicamente para refletir aprimoramentos no sistema ou alterações na legislação. Em caso de alterações relevantes, os usuários serão comunicados por meio da Plataforma, com indicação da nova versão e data de vigência." },
      ],
    },
  ],
}

/**
 * Termos de atendimento PADRÃO de uma clínica, usados quando ela ainda não
 * publicou o próprio documento (termos de uso ou termo da clínica). Seguem as
 * regras que o sistema já aplica: cancelamento com 24h, sinal e confirmação de
 * presença. Assim que a clínica publica o dela, este texto deixa de aparecer.
 */
export function clinicDefaultTerms(company) {
  const name = company?.name || "clínica"
  const contacts = [
    company?.phone && `WhatsApp ${company.phone}`,
    company?.email && `e-mail ${company.email}`,
  ].filter(Boolean)
  return {
    title: `Termos de atendimento — ${name}`,
    version: "1.0",
    updated: "Novembro de 2026",
    intro: [
      `Estas são as condições gerais de atendimento da ${name} para agendamentos feitos pelo Prontto. Valem enquanto a clínica não publicar um documento próprio.`,
    ],
    sections: [
      {
        h: "1. Agendamento",
        blocks: [
          { p: "O serviço, a data e o horário são escolhidos na vitrine da clínica. Preço, duração e eventual exigência de sinal aparecem antes da confirmação." },
          { p: "Quando o agendamento pedir, confirme sua presença em “Meu perfil” dentro do prazo indicado." },
        ],
      },
      {
        h: "2. Sinal",
        blocks: [
          { p: "Quando a clínica exige sinal para o serviço, o agendamento só é confirmado após o pagamento. O valor do sinal e a isenção para clientes recorrentes são definidos pela clínica." },
        ],
      },
      {
        h: "3. Cancelamento e remarcação",
        blocks: [
          {
            list: [
              ["Com 24 horas ou mais de antecedência:", "cancele ou remarque em “Meu perfil”. Se pagou sinal, você pode pedir o reembolso."],
              ["Com menos de 24 horas:", "o sinal não é devolvido, exceto em caso de força maior."],
            ],
          },
        ],
      },
      {
        h: "4. Atrasos e faltas",
        blocks: [
          { p: "Chegue no horário marcado. Atrasos podem reduzir o tempo do procedimento ou exigir remarcação, conforme orientação da clínica. Faltas sem aviso seguem a regra de cancelamento com menos de 24 horas." },
        ],
      },
      {
        h: "5. Ficha de saúde",
        blocks: [
          { p: "Preencha a ficha de saúde com informações verdadeiras, incluindo alergias, condições médicas e medicamentos. A clínica pode adiar ou recusar o procedimento se houver contraindicação." },
        ],
      },
      {
        h: "6. Contato",
        blocks: [
          {
            p: contacts.length
              ? `Dúvidas sobre o atendimento: fale com a ${name} pelo ${contacts.join(" ou pelo ")}.`
              : `Dúvidas sobre o atendimento: fale com a ${name} pelos canais informados na vitrine.`,
          },
        ],
      },
    ],
  }
}
