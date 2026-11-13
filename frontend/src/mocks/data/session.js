/**
 * MOCK — contas de cliente já cadastradas na CA Beauty Clinic.
 * Use para entrar pelo link da clínica sem precisar criar conta.
 */

const demoClientAccounts = [
  {
    email: "jamily@email.com",
    senha: "Prontto@123",
    profile: {
      name: "Jamily",
      email: "jamily@email.com",
      whatsapp: "(11) 99988-1111",
      birthDate: "1998-07-22",
      recurring: false,
    },
    // Ficha de saúde já respondida no cadastro (aparece ao clicar em "Editar ficha").
    respostas: {
      alergia: "Não",
      alergiaDetalhe: "",
      reacaoProduto: "Não",
      reacaoProdutoDetalhe: "",
      sensibilidade: "",
      sensibilidadeDetalhe: "",
      condicaoTratamento: "Não",
      condicaoTratamentoDetalhe: "",
      medicamentos: "Não",
      medicamentosDetalhe: "",
      gravidezAmamentacao: "Não",
      alteracaoAtual: "Não",
      alteracaoAtualDetalhe: "",
      sinaisAtuais: ["Não apresento nenhum desses sinais"],
      lentesContato: "Sim",
      condicaoOcular: "Não",
      condicaoOcularDetalhe: "",
      herpesLabial: "Não",
      complicacaoAnterior: "Não",
      complicacaoAnteriorDetalhe: "",
      procedimentosAnteriores: "Sim",
      procedimentos: ["Extensão de cílios", "Design ou tintura de sobrancelhas"],
      outroProcedimento: "",
      problemaProcedimento: "Não",
      problemaProcedimentoDetalhe: "",
      informacaoAdicional: "Não",
      informacaoAdicionalDetalhe: "",
      cienciaInformacoes: true,
      localData: "",
      nomeCliente: "Jamily",
      assinatura: "",
    },
    atualizadaEm: "2025-05-10T10:00:00.000Z",
  },
]

export { demoClientAccounts }
