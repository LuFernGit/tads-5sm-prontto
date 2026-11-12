# Telas finalizadas

Lista das telas do front e do status de cada uma. **Tela finalizada não pode ser
alterada**, nem diretamente nem por mudança em um arquivo compartilhado que ela
usa (CSS global, componente, hook, lib), sem autorização explícita da equipe.

## Como usar

- Para **finalizar** uma tela: troque o status para `✅ Finalizada` e preencha a
  data e quem aprovou.
- Para **reabrir** uma tela finalizada: troque de volta para `🚧 Em andamento` e
  anote o motivo em "Observações".
- Antes de qualquer alteração (de pessoa ou do Claude), confira a seção
  [Arquivos compartilhados](#arquivos-compartilhados): mudar um deles afeta várias telas.

Status: `✅ Finalizada` · `🚧 Em andamento` · `⏸️ Não iniciada`

## Telas

### Acesso (login e cadastros)

| Tela | Arquivos próprios | Status | Finalizada em / por | Observações |
| --- | --- | --- | --- | --- |
| Login da gestora (acesso da empresa) | `screens/auth/LoginScreen.jsx`, `styles/auth.css` | ✅ Finalizada | 11/11/2026 · GBsouza9 | Visual dos campos é o padrão do sistema. Inclui erros embaixo dos campos (e-mail vazio → "Digite o seu e-mail para entrar.") |
| Cadastro da empresa (6 etapas) | `screens/auth/CompanyRegistrationPage.jsx` + `.css` | ✅ Finalizada | | |
| Login da cliente (link da clínica) | `screens/auth/ClientLoginScreen.jsx` + `.css`, `styles/auth.css` | 🚧 Em andamento | | |
| Cadastro da cliente (3 etapas) | `screens/client/ClientRegisterPage.jsx` + `.css` | 🚧 Em andamento | | |
| Link de clínica inválido | `screens/auth/InvalidClinicLink.jsx` | 🚧 Em andamento | | |

### Painel da gestora

| Tela | Arquivos próprios | Status | Finalizada em / por | Observações |
| --- | --- | --- | --- | --- |
| Estrutura do painel (menu lateral e topo) | `screens/admin/AdminApp.jsx` + `.css`, `components/layout/Sidebar.*`, `components/layout/Topbar.*` | ✅ Finalizada | | |
| Painel / agenda semanal | `screens/admin/DashboardPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Integrado ao backend; mensagens de WhatsApp usam os modelos da clínica (`lib/messageTemplates.js`) |
| Horários de funcionamento e bloqueios | `screens/admin/SchedulePage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Agenda: lista com "Ver detalhes"; cancelamento pede motivo |
| Serviços e categorias | `screens/admin/ServicesPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Inclui enquadramento da foto (`components/ui/ImageFramer`) |
| Clientes | `screens/admin/ClientsPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | |
| Fichas de saúde | `screens/admin/HealthPage.jsx` + `.css` | 🚧 Em andamento | | |
| Mensagens (WhatsApp) | `screens/admin/MessagesPage.jsx` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Abas "Enviar mensagem" e "Modelos da clínica" (CRUD). Cancelamento é feito no Painel/Agenda, não aqui |
| Documentos e termos | `screens/admin/DocumentsPage.jsx` + `.css` | 🚧 Em andamento | | |
| Personalização da marca | `screens/admin/CustomizationPage.jsx` + `.css` | 🚧 Em andamento | | |
| Configurações da conta | `screens/admin/SettingsPage.jsx` + `.css` | 🚧 Em andamento | | |
| Auditoria | `screens/admin/AuditPage.jsx` + `.css` | 🚧 Em andamento | | |

### Área da cliente (vitrine)

| Tela | Arquivos próprios | Status | Finalizada em / por | Observações |
| --- | --- | --- | --- | --- |
| Vitrine: início, serviços e rodapé | `screens/client/ClientApp.jsx` (abas Início/Serviços) + `.css`, `components/layout/StorefrontFooter.*`, `styles/storefront.css` | 🚧 Em andamento | | |
| Agendar (calendário e horários) | `screens/client/ClientApp.jsx` (aba Agendar) + `.css` | 🚧 Em andamento | | |
| Meu perfil e ficha de saúde | `screens/client/ClientApp.jsx` (aba Meu perfil) + `.css`, `components/forms/AnamnesisFields.*` | 🚧 Em andamento | | |
| Pagamento do sinal (Pix/cartão simulado) | `screens/client/DepositStep.jsx` + `.css`, `lib/pix.js` | 🚧 Em andamento | | Pagamento continua simulado no front |
| Confirmação do agendamento | `screens/client/BookingConfirmation.jsx` + `.css`, `BookingFlowLayout.*` | 🚧 Em andamento | | |
| Páginas legais (termos e privacidade) | `screens/LegalPage.jsx` | 🚧 Em andamento | | |

## Arquivos compartilhados

Mudar um destes arquivos **muda várias telas ao mesmo tempo**. Se alguma tela
afetada estiver finalizada, a mudança precisa de autorização antes.

| Arquivo | Afeta |
| --- | --- |
| `index.css`, `styles/base.css` (cores, fontes, foco do Tab) | **Todas as telas** |
| `styles/overrides.css` (visual dos campos, erros, contraste) | **Todas as telas** |
| `styles/ui.css`, `components/ui/Action.*` (botões) | **Todas as telas** |
| `styles/forms.css` (`ff-*`, `af-*`) | Cadastro da cliente, área da cliente, pagamento, mensagens, documentos, páginas legais |
| `styles/admin.css` | Todo o painel da gestora |
| `styles/auth.css` | Login da gestora, login da cliente, cadastro da empresa |
| `styles/storefront.css` | Vitrine da cliente |
| `components/ui/Field.jsx` | Cadastro da cliente, área da cliente, mensagens, agenda, auditoria |
| `components/ui/Toast.*`, `lib/noticeTone.js` (aviso flutuante: sucesso azul-marinho / erro vermelho) | Todas as telas, **exceto o login da gestora** (mantido como era em `App.jsx`) |
| `components/ui/Modal.*` (prop `kicker`) e `.modal-actions` em `styles/overrides.css` (botões dos modais) | Todas as telas com modal (o login não tem modal) |
| `styles/overrides.css` — seta dos selects e barra de rolagem | Todas as telas; a barra de rolagem **não** vale no login (`html:not(:has(.login-page))`) |
| `lib/imageCrop.js` (enquadramento de foto), `components/ui/ImageFramer.*` (enquadrar arrastando a foto no quadro 4:3) — 🚧 Em andamento | Serviços |
| `lib/format.js` → `brDateTime` (data com hora: "11/11/2026 às 18:07") | Fichas de saúde |
| `components/ui/Modal.*` → `.modal-body` (só o conteúdo rola; barra de rolagem fina igual à do menu lateral) | Todas as telas com modal, **inclusive os modais do Painel** (só a rolagem muda) |
| `styles/forms.css` → `.af-status.completed` (selo "Concluído" azul-marinho) | Clientes (histórico), Agenda (lista de agendamentos) |
| `lib/clients.js` (última aplicação, manutenção) | Clientes, Mensagens |
| `lib/messageTemplates.js` (mensagens de WhatsApp a partir dos modelos da clínica, com texto padrão de reserva) | Painel, Agenda, Mensagens (e `AdminApp`, que carrega os modelos) |
| `lib/pendingBooking.js` (escolha da visitante guardada até o login) | Vitrine/agendar, login da cliente, cadastro da cliente |
| `constants/index.js` (`apptLabel`, `badgeClass`: textos e cores dos status) | Área da cliente, clientes (painel) |
| `components/ui/Modal.*`, `ConfirmModal.jsx` | Painel, serviços, clientes, agenda, área da cliente |
| `components/ui/Icon.jsx`, `Brand.*`, `Toast.*`, `NewTabHint.jsx`, `ExternalLink.*` | Várias telas (praticamente todas) |
| `components/forms/AnamnesisFields.*` | Cadastro da cliente e Meu perfil |
| `hooks/useFieldErrors.jsx` (erros embaixo dos campos) | Logins, cadastro da empresa, serviços, painel, mensagens, personalização |
| `hooks/useApiQuery.js`, `hooks/useAppSession.js` | Todas as telas que carregam dados |
| `lib/validators.js` (mensagens de validação) | Logins, cadastros, personalização, configurações, área da cliente |
| `lib/whatsapp.js` (abrir conversa no WhatsApp; número obrigatório) | Painel, mensagens, clientes, serviços, área da cliente |
| `lib/masks.js`, `lib/format.js` | Cadastros, serviços, personalização, configurações, área da cliente |
| `api/**` (chamadas ao backend) | Comportamento de todas as telas (não o visual) |
