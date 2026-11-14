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
| Cadastro da empresa (6 etapas) | `screens/auth/CompanyRegistrationPage.jsx` + `.css` | ✅ Finalizada | | 13/11/2026 (pedido da equipe): etapa 4 ganhou "Foto de capa" **obrigatória** ao criar categoria; as categorias criadas viraram lista com miniatura da capa, "Trocar capa" e remover (`components/forms/CategoryCoverField`). |
| Login da cliente (link da clínica) | `screens/auth/ClientLoginScreen.jsx` + `.css`, `styles/auth.css` | 🚧 Em andamento | | |
| Cadastro da cliente (3 etapas) | `screens/client/ClientRegisterPage.jsx` + `.css` | 🚧 Em andamento | | |
| Link de clínica inválido | `screens/auth/InvalidClinicLink.jsx` | 🚧 Em andamento | | |

### Painel da gestora

| Tela | Arquivos próprios | Status | Finalizada em / por | Observações |
| --- | --- | --- | --- | --- |
| Estrutura do painel (menu lateral e topo) | `screens/admin/AdminApp.jsx` + `.css`, `components/layout/Sidebar.*`, `components/layout/Topbar.*` | ✅ Finalizada | | 12/11/2026 (pedido da equipe): botão ⋯ do perfil virou menu da conta (Configurações, Personalização, Sair). |
| Painel / agenda semanal | `screens/admin/DashboardPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Integrado ao backend; mensagens de WhatsApp usam os modelos da clínica (`lib/messageTemplates.js`) 12/11/2026 (pedido da equipe): quadro "Próxima cliente" de 270 → 300px. 13/11/2026 (pedido da equipe): código reorganizado para zerar os avisos do SonarQube (componentes `DashboardMetrics`, `SlotTooltip`, `NextClient` e funções auxiliares), sem mudança visual nem de comportamento. |
| Horários de funcionamento e bloqueios | `screens/admin/SchedulePage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Agenda: lista com "Ver detalhes"; cancelamento pede motivo. 12/11/2026 (pedido da equipe): bloqueios e horários se atualizam ao vivo; horário em edição não é sobrescrito. 13/11/2026 (pedido da equipe): política de reembolso de 24h — selo do sinal ao lado da situação ("Cliente aguardando reembolso" / "Reembolso verificado" / "Sinal retido" quando a cliente cancela com menos de 24h), bloco "Sinal e reembolso" nos detalhes e "Marcar como verificado" (com confirmação); agendamento ativo com sinal mostra "Sinal e cancelamento" com o prazo da cliente para cancelar com reembolso. |
| Serviços e categorias | `screens/admin/ServicesPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Inclui enquadramento da foto (`components/ui/ImageFramer`) 12/11/2026 (pedido da equipe): excluir categoria com serviços move os serviços para outra categoria. 12/11/2026 (pedido da equipe): descrição do serviço até 500 caracteres (antes 280). 13/11/2026 (pedido da equipe): "Gerenciar categorias" ganhou "Foto de capa" **obrigatória** ao criar e, em cada categoria, miniatura da capa + "Trocar capa" (modal com "Salvar capa"). Categorias antigas sem foto aparecem como "sem foto de capa". |
| Clientes | `screens/admin/ClientsPage.jsx` + `.css` | ✅ Finalizada | 12/11/2026 · GBsouza9 | 13/11/2026 (pedido da equipe): linhas da tabela com 16px nas laterais (`.clients-table .table-row` em `styles/admin.css`), o avatar não encosta mais na borda. |
| Fichas de saúde | `screens/admin/HealthPage.jsx` + `.css` | 🚧 Em andamento | | Histórico por versões completas da ficha ("Ver ficha completa" de cada versão) |
| Mensagens (WhatsApp) | `screens/admin/MessagesPage.jsx` | ✅ Finalizada | 12/11/2026 · GBsouza9 | Abas "Enviar mensagem" e "Modelos da clínica" (CRUD). Cancelamento é feito no Painel/Agenda, não aqui 12/11/2026 (pedido da equipe): cabeçalho no espaçamento padrão (24px). 12/11/2026 (pedido da equipe): modelos se atualizam ao vivo (`useServerSync`). |
| Documentos e termos | `screens/admin/DocumentsPage.jsx` + `.css` | 🚧 Em andamento | | Exclusão lógica: "Documentos excluídos" com "Restaurar" |
| Personalização da marca | `screens/admin/CustomizationPage.jsx` + `.css` | 🚧 Em andamento | | |
| Configurações da conta | `screens/admin/SettingsPage.jsx` + `.css` | 🚧 Em andamento | | |
| Auditoria | `screens/admin/AuditPage.jsx` + `.css` | 🚧 Em andamento | | |

### Área da cliente (vitrine)

| Tela | Arquivos próprios | Status | Finalizada em / por | Observações |
| --- | --- | --- | --- | --- |
| Vitrine: início, serviços e rodapé | `screens/client/ClientApp.jsx` (abas Início/Serviços) + `.css`, `components/layout/StorefrontFooter.*`, `styles/storefront.css` | 🚧 Em andamento | | |
| Agendar (calendário e horários) | `screens/client/ClientApp.jsx` (aba Agendar) + `.css` | 🚧 Em andamento | | O calendário só aparece com um serviço escolhido; sem serviço, a aba mostra "Primeiro, escolha o serviço" com o botão "Escolher um serviço" |
| Meu perfil e ficha de saúde | `screens/client/ClientApp.jsx` (aba Meu perfil) + `.css`, `components/forms/AnamnesisFields.*` | 🚧 Em andamento | | "Cancelar agendamento" mostra o aviso do sinal (política de 24h, calculada no backend) antes da confirmação. "Confirmar presença" abre o modal "Confirmar presença?" (todo agendamento nasce pendente) |
| Pagamento do sinal (Pix/cartão simulado) | `screens/client/DepositStep.jsx` + `.css`, `lib/pix.js` | 🚧 Em andamento | | Pagamento continua simulado no front. "Condições de cancelamento" avisam: 24h+ pode pedir reembolso do sinal; menos de 24h o sinal é perdido, exceto força maior |
| Confirmação do agendamento | `screens/client/BookingConfirmation.jsx` + `.css`, `BookingFlowLayout.*` | 🚧 Em andamento | | Agendamento pendente: kicker "AGENDAMENTO REALIZADO" e lembrete para confirmar a presença em "Meu perfil" até o prazo |
| Páginas legais (termos e privacidade) | `screens/LegalPage.jsx` + `.css` | 🚧 Em andamento | | Visual da área da cliente: logo e nome da clínica no topo, rótulo + título sem serifa, rodapé da vitrine. Instagram clicável em "Fale com a clínica" |

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
| `lib/imageCrop.js` (enquadramento de foto; `resizeImage` reduz a capa da categoria sem recortar), `components/ui/ImageFramer.*` (enquadrar arrastando a foto no quadro 4:3) — 🚧 Em andamento | Serviços, cadastro da empresa (capa da categoria) |
| `components/forms/CategoryCoverField.*` (campo "Foto de capa" da categoria) — 🚧 Em andamento | Serviços (Gerenciar categorias), cadastro da empresa (etapa 4) |
| `lib/booking.js` → `getCategoryMeta(nome, capas)` (capa da categoria: foto da gestora ou capa padrão) | Vitrine (Início, Serviços, Agendar), Serviços (miniaturas), cadastro da empresa (miniaturas) |
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
| `lib/anamnesis.js` (resumo da ficha, rótulos das perguntas e `anamnesisEntries` para mostrar uma versão completa) — 🚧 Em andamento | Cadastro da cliente, Meu perfil, Fichas de saúde |
| `hooks/useFieldErrors.jsx` (erros embaixo dos campos) | Logins, cadastro da empresa, serviços, painel, mensagens, personalização |
| `hooks/useApiQuery.js`, `hooks/useAppSession.js` | Todas as telas que carregam dados. 12/11/2026 (pedido da equipe): **tudo se atualiza ao vivo** — `useApiQuery` refaz a busca em segundo plano a cada 20s e ao voltar à aba (`live: false` desliga); `useAppSession` faz o mesmo com empresa, serviços e categorias da gestora. `useAppSession` também mantém a vitrine ao vivo (consulta `/clinicas/{slug}/versao`) e `updateCompany` devolve `true/false`. 13/11/2026 (pedido da equipe): sessão — token em `sessionStorage` (`api/session.js`): fechar a aba encerra a sessão; 30 min sem atividade encerram com aviso; ao recarregar, só 401/403 descartam o token. No último minuto aparece o aviso "Você ainda está aí?" (ver `SessionTimeoutWarning`) |
| `components/ui/SessionTimeoutWarning.jsx` (aviso de fim de sessão por inatividade, com contagem regressiva, "Continuar conectada" e "Sair agora"; WCAG 2.2.1), desenhado em `App.jsx` — 🚧 Em andamento | Todas as telas com login (painel da gestora, área da cliente e visualização da vitrine) |
| `hooks/useLiveRefresh.js` (atualizar sem recarregar: intervalo + ao voltar à aba; `useServerSync` repassa dados novos para telas com estado próprio) — 🚧 Em andamento | Todas as telas que carregam dados (via `useApiQuery`); `useServerSync` em Documentos, Mensagens e Horários |
| `lib/validators.js` (mensagens de validação) | Logins, cadastros, personalização, configurações, área da cliente |
| `lib/instagram.js` (link do Instagram a partir de "@perfil" ou do endereço) — 🚧 Em andamento | Rodapé da vitrine, páginas legais |
| `lib/whatsapp.js` (abrir conversa no WhatsApp; número obrigatório) | Painel, mensagens, clientes, serviços, área da cliente |
| `lib/masks.js`, `lib/format.js` | Cadastros, serviços, personalização, configurações, área da cliente |
| `api/**` (chamadas ao backend) | Comportamento de todas as telas (não o visual) |
