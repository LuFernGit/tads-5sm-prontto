/** MOCK — catálogo inicial de serviços da CA Beauty Clinic.
 *  price em reais e duration em minutos, como números (iguais a SERVICO.preco e SERVICO.duracao). */

// Foto de cada serviço: public/images/servicos/<id-do-serviço>.jpg
// Para trocar a foto de um serviço, substitua o arquivo com o mesmo nome.
// BASE_URL é o endereço base do site ("/" no npm run dev; outro se publicado em subpasta).
const IMG = `${import.meta.env.BASE_URL}images/servicos/`

const services = [
  {
    id: "nail-fibra",
    name: "Fibra de Vidro",
    category: "Nail Design",
    duration: 120, // minutos
    price: 180, // reais
    active: true,
    description:
      "Alongamento em fibra de vidro com estrutura personalizada e acabamento natural.",
    image:
      `${IMG}nail-fibra.jpg`,
  },
  {
    id: "nail-banho",
    name: "Banho de Gel",
    category: "Nail Design",
    duration: 90, // minutos
    price: 120, // reais
    active: true,
    description:
      "Camada de gel sobre as unhas naturais para reforço, nivelamento e maior durabilidade.",
    image:
      `${IMG}nail-banho.jpg`,
  },
  {
    id: "nail-blindagem",
    name: "Blindagem (Esmaltação em Gel)",
    category: "Nail Design",
    duration: 60, // minutos
    price: 100, // reais
    active: true,
    description:
      "Proteção das unhas naturais combinada com esmaltação em gel de longa duração.",
    image:
      `${IMG}nail-blindagem.jpg`,
  },
  {
    id: "lash-brasileiro",
    name: "Volume Brasileiro",
    category: "Lash Design",
    duration: 120, // minutos
    price: 170, // reais
    active: true,
    description: "Extensão de cílios com volume equilibrado e efeito marcante.",
    image:
      `${IMG}lash-brasileiro.jpg`,
  },
  {
    id: "lash-marrom",
    name: "Volume Marrom",
    category: "Lash Design",
    duration: 120, // minutos
    price: 170, // reais
    active: true,
    description: "Volume em tonalidade marrom para um olhar suave e natural.",
    image:
      `${IMG}lash-marrom.jpg`,
  },
  {
    id: "lash-hollywood",
    name: "Volume Hollywood",
    category: "Lash Design",
    duration: 150, // minutos
    price: 200, // reais
    active: true,
    description: "Volume intenso e glamouroso para maior destaque do olhar.",
    image:
      `${IMG}lash-hollywood.jpg`,
  },
  {
    id: "lash-ingles",
    name: "Volume Inglês",
    category: "Lash Design",
    duration: 120, // minutos
    price: 180, // reais
    active: true,
    description:
      "Técnica de volume com acabamento elegante e definição uniforme.",
    image:
      `${IMG}lash-ingles.jpg`,
  },
  {
    id: "lash-fox",
    name: "Fox Eyes",
    category: "Lash Design",
    duration: 150, // minutos
    price: 200, // reais
    active: true,
    description:
      "Mapeamento alongado que cria um efeito lifting no canto externo dos olhos.",
    image:
      `${IMG}lash-fox.jpg`,
  },
  {
    id: "lash-sirena",
    name: "Sirena",
    category: "Lash Design",
    duration: 150, // minutos
    price: 190, // reais
    active: true,
    description:
      "Efeito de cílios texturizado e delicado, personalizado para o formato dos olhos.",
    image:
      `${IMG}lash-sirena.jpg`,
  },
  {
    id: "lash-delineado",
    name: "Efeito Delineado",
    category: "Lash Design",
    duration: 120, // minutos
    price: 180, // reais
    active: true,
    description:
      "Extensão com mapeamento que simula o acabamento de um delineado.",
    image:
      `${IMG}lash-delineado.jpg`,
  },
  {
    id: "lash-lifting",
    name: "Lash Lifting",
    category: "Lash Design",
    duration: 60, // minutos
    price: 140, // reais
    active: true,
    description:
      "Curvatura e alinhamento dos cílios naturais para um olhar mais aberto.",
    image:
      `${IMG}lash-lifting.jpg`,
  },
  {
    id: "combo-lash",
    name: "Combo: Brow Lamination + Lash Lifting",
    category: "Lash Design",
    duration: 90, // minutos
    price: 220, // reais
    active: true,
    description:
      "Combo de alinhamento das sobrancelhas e curvatura dos cílios naturais.",
    image:
      `${IMG}combo-lash.jpg`,
  },
  {
    id: "brow-lamination",
    name: "Brow Lamination",
    category: "Sobrancelhas",
    duration: 60, // minutos
    price: 120, // reais
    active: true,
    description:
      "Alinhamento dos fios para sobrancelhas mais definidas e volumosas.",
    image:
      `${IMG}brow-lamination.jpg`,
  },
  {
    id: "brow-design",
    name: "Design Personalizado",
    category: "Sobrancelhas",
    duration: 40, // minutos
    price: 60, // reais
    active: true,
    description:
      "Design desenvolvido de acordo com o formato do rosto e o crescimento dos fios.",
    image:
      `${IMG}brow-design.jpg`,
  },
  {
    id: "brow-tintura",
    name: "Design Personalizado com Tintura",
    category: "Sobrancelhas",
    duration: 50, // minutos
    price: 80, // reais
    active: true,
    description:
      "Design personalizado com aplicação de tintura para mais definição.",
    image:
      `${IMG}brow-tintura.jpg`,
  },
  {
    id: "combo-brow",
    name: "Combo: Brow Lamination + Lash Lifting",
    category: "Sobrancelhas",
    duration: 90, // minutos
    price: 220, // reais
    active: true,
    description:
      "Combo de alinhamento das sobrancelhas e curvatura dos cílios naturais.",
    image:
      `${IMG}combo-brow.jpg`,
  },
  {
    id: "labial-hidra",
    name: "Hidra Gloss",
    category: "Estética Labial",
    duration: 60, // minutos
    price: 130, // reais
    active: true,
    description:
      "Tratamento de hidratação profunda para devolver maciez e brilho aos lábios.",
    image:
      `${IMG}labial-hidra.jpg`,
  },
]

export { services }
