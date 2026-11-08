/** MOCK — dados demonstrativos da empresa inicialmente carregada no sistema. */

const defaultCompany = {
  name: "CA Beauty Clinic",
  ownerName: "Camille Oli",
  initials: "CA",
  tagline: "Estética Premium em São Paulo",
  heroTitle: "Realçando sua beleza com excelência e naturalidade.",
  description:
    "Atendimentos exclusivos, técnicas atuais e todo o cuidado que você merece.",
  cpfCnpj: "11222333000181", // CLINICA.cpf_cnpj, só números (CNPJ fictício, mas válido)
  phone: "(11) 99988-7766", // CLINICA.whatsapp
  email: "contato@cabeauty.com.br", // CLINICA.email_contato (diferente do e-mail de acesso da gestora)
  instagram: "@cabeautyclinic",
  address: "Avenida Guarapiranga, 92 - Parque Guarapiranga",
  logoImage: `${import.meta.env.BASE_URL}brands/logo-ca-beauty.png`,
  favicon: `${import.meta.env.BASE_URL}brands/logo-ca-beauty.png`,
  heroImage:
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=88",
}

export { defaultCompany }
