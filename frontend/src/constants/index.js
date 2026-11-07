/**
 * Constantes da interface e regras de negócio do front.
 * Nada aqui é dado de demonstração: tudo continua válido depois da integração.
 * (Os dados fictícios ficam em src/mocks.)
 */

/** Imagem lateral das telas de login e cadastro da gestora (visual neutro do Prontto). */
export const neutralLoginImage =
  "https://images.unsplash.com/photo-1652803723541-ffc5a8783329?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBuZXV0cmFsJTIwd2VsbG5lc3MlMjBjbGluaWMlMjByZWNlcHRpb24lMjBwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGludGVyaW9yfGVufDF8fHx8MTc5MjA2NzQ4M3ww&ixlib=rb-4.1.0&q=80&w=1600"

/** Menu lateral do painel da gestora. */
// label = texto do menu, icon = nome do ícone (components/ui/Icon.jsx),
// key = identificador da página aberta no AdminApp.
export const navigation = [
  { label: "Painel", icon: "grid", key: "dashboard" },
  { label: "Agenda", icon: "calendar", key: "schedule" },
  { label: "Clientes", icon: "users", key: "clients" },
  { label: "Serviços", icon: "sparkle", key: "services" },
  { label: "Mensagens WhatsApp", icon: "whatsapp", key: "messages" },
  { label: "Ficha de Saúde", icon: "heart", key: "health" },
  { label: "Personalização", icon: "sparkle", key: "customization" },
  { label: "Termos", icon: "file-text", key: "documents" },
  { label: "Configurações", icon: "settings", key: "settings" },
]

/** Percentual do sinal cobrado de clientes não recorrentes. */
export const SIGNAL_PERCENT = 30
/** Validade do Pix gerado, em segundos. */
export const PIX_TTL = 15 * 60
/** Rótulo de exibição para os status de AGENDAMENTO.status do banco. */
export const apptLabel = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  ARQUIVADO: "Arquivado",
}

/** Classe CSS de cada selo de agendamento na área da cliente. */
export const badgeClass = {
  Pendente: "pending",
  Confirmado: "confirmed",
  Concluído: "done",
  Cancelado: "cancelled",
}

/** Serviço exibido enquanto o catálogo ainda não tem nenhum serviço ativo. */
export const EMPTY_SERVICE = {
  id: "",
  name: "Serviço",
  category: "",
  duration: 0, // minutos
  price: 0, // reais
  active: false,
  description: "",
  image: "",
}

/** Cliente fictícia mostrada quando a gestora abre a vitrine em modo de visualização. */
export const PREVIEW_CLIENT = {
  name: "Cliente",
  recurring: false,
  email: "",
  whatsapp: "",
  birthDate: "",
}

/** Estrutura vazia da ficha de anamnese (formulário). */
export const emptyAnamnesis = {
  alergia: "",
  alergiaDetalhe: "",
  reacaoProduto: "",
  reacaoProdutoDetalhe: "",
  sensibilidade: "",
  sensibilidadeDetalhe: "",
  condicaoTratamento: "",
  condicaoTratamentoDetalhe: "",
  medicamentos: "",
  medicamentosDetalhe: "",
  gravidezAmamentacao: "",
  alteracaoAtual: "",
  alteracaoAtualDetalhe: "",
  sinaisAtuais: [],
  lentesContato: "",
  condicaoOcular: "",
  condicaoOcularDetalhe: "",
  herpesLabial: "",
  complicacaoAnterior: "",
  complicacaoAnteriorDetalhe: "",
  procedimentosAnteriores: "",
  procedimentos: [],
  outroProcedimento: "",
  problemaProcedimento: "",
  problemaProcedimentoDetalhe: "",
  informacaoAdicional: "",
  informacaoAdicionalDetalhe: "",
  cienciaInformacoes: false,
  localData: "",
  nomeCliente: "",
  assinatura: "",
}

/**
 * Imagens e textos padrão da vitrine por categoria (identidade visual do front).
 * Quando o backend passar a devolver imagem/descrição por categoria, basta
 * preferir esses campos em getCategoryMeta (src/lib/booking.js).
 */
// Capa de cada categoria: public/images/categorias/<nome-da-categoria>.jpg
// Para trocar a capa de uma categoria, substitua o arquivo com o mesmo nome.
// BASE_URL é o endereço base do site ("/" no npm run dev; outro se publicado em subpasta).
const COVER = `${import.meta.env.BASE_URL}images/categorias/`

/** Capa usada quando uma categoria nova (criada pela gestora) ainda não tem imagem própria. */
export const DEFAULT_CATEGORY_COVER = `${COVER}nail-design.jpg`

/** Texto e imagem padrão de cada categoria na vitrine da clínica. */
export const storefrontCategories = [
  {
    name: "Nail Design",
    copy: "Estrutura, proteção e acabamento impecável para suas unhas.",
    image: `${COVER}nail-design.jpg`,
  },
  {
    name: "Lash Design",
    copy: "Técnicas personalizadas para valorizar cada formato de olhar.",
    image: `${COVER}lash-design.jpg`,
  },
  {
    name: "Sobrancelhas",
    copy: "Design e alinhamento que respeitam a sua expressão.",
    image: `${COVER}sobrancelhas.jpg`,
  },
  {
    name: "Estética Labial",
    copy: "Hidratação, cuidado e brilho para lábios saudáveis.",
    image: `${COVER}estetica-labial.jpg`,
  },
]
