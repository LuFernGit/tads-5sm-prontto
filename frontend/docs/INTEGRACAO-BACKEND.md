# Integração do front com o backend Spring Boot

Este documento é o contrato entre o front (React + Vite) e o backend (Spring Boot).
A implementação de referência de cada rota está em `src/mocks/handlers.js`: ela
mostra exatamente o que o front envia e espera receber.

## 1. Como o front chama a API

```
Tela  →  api.<domínio>.<ação>()  →  src/api/http.js  →  Spring Boot
                                            ↘ (VITE_USE_MOCKS=true) src/mocks
```

- `src/api/services/*.js`: uma função por endpoint, com o contrato no JSDoc.
- `src/api/http.js`: `fetch` com JSON, token JWT, timeout e tratamento de erro.
- `src/api/session.js`: guarda o token no `localStorage`, um por fluxo
  (`gestora` ou `cliente:<slug>`).
- Telas carregam dados com `useApiQuery` e mostram carregando/erro com `<AsyncState>`.

### Variáveis de ambiente (`.env.local`, a partir do `.env.example`)

| Variável              | Padrão                  | Uso                                      |
| --------------------- | ----------------------- | ---------------------------------------- |
| `VITE_USE_MOCKS`      | `true`                  | `false` para chamar o Spring             |
| `VITE_API_URL`        | `/api`                  | Prefixo de todas as rotas                |
| `VITE_BACKEND_URL`    | `http://localhost:8080` | Destino do proxy do `npm run dev`        |
| `VITE_API_TIMEOUT_MS` | `15000`                 | Timeout por requisição                   |

Em desenvolvimento, o Vite repassa `/api/*` para `VITE_BACKEND_URL` **mantendo o
prefixo `/api`**. Então mapeie os controllers com `@RequestMapping("/api/...")`
ou use `server.servlet.context-path=/api`. Com o proxy, não é preciso CORS em dev.
Em produção, se front e back ficarem em domínios diferentes, libere CORS para a
origem do front e os headers `Authorization` e `Content-Type`.

## 2. Autenticação

- JWT stateless. O front envia `Authorization: Bearer <token>` em todas as chamadas.
- Login e cadastro devolvem:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": {
    "id": "1",
    "nome": "Camille Oli",
    "email": "camile@cabeauty.com.br",
    "perfil": "GESTORA",
    "clinicaSlug": "ca-beauty-clinic"
  }
}
```

- `perfil` é `GESTORA` ou `CLIENTE`. Rotas `/gestora/**` exigem GESTORA e rotas
  `/cliente/**` exigem CLIENTE; o backend descobre a clínica pelo token.
- Ao abrir a página, o front chama `GET /auth/me` para restaurar a sessão.
- **401** em qualquer rota faz o front descartar o token. No link do Prontto
  (gestora) a pessoa volta ao login; no link da clínica (`?clinica=<slug>`) ela
  volta para a **vitrine como visitante**. Use **403** para "logado, mas sem permissão".

### Visitante na vitrine (sem login)

No link da clínica, quem não está logado entra direto na vitrine e pode ver
**Início, Serviços e Agendar** (calendário e horários livres). Para isso o front
usa só as rotas públicas `/clinicas/{slug}/**`, que **não exigem token**.

- A aba **Meu perfil** só aparece depois do login.
- Na agenda, a visitante escolhe dia e horário, mas o botão vira
  "Entrar para confirmar": **criar o agendamento exige login** (`POST /cliente/agendamentos`
  continua exigindo perfil CLIENTE).
- **Sair** (logout) e **excluir a conta** levam de volta para a vitrine como visitante.

## 3. Formato de erro

O front lê, nesta ordem, `message`, `detail` (ProblemDetail do Spring 6) e `title`,
e mostra esse texto direto para a usuária. Então **escreva a mensagem em português,
pronta para a tela**. Erros de validação por campo podem vir em `errors`:

```json
{
  "status": 400,
  "message": "Confira os dados informados.",
  "errors": [{ "field": "email", "message": "E-mail inválido." }]
}
```

(O formato padrão do `MethodArgumentNotValidException`, com `defaultMessage`,
também é aceito.)

| Status | Quando usar                                             |
| ------ | ------------------------------------------------------- |
| 400    | Validação                                               |
| 401    | Sem token, token inválido/expirado, login errado        |
| 403    | Perfil errado (ex.: gestora tentando entrar como cliente) |
| 404    | Recurso ou slug de clínica inexistente                  |
| 409    | Conflito (e-mail já cadastrado, categoria com serviços…) |

## 4. Endpoints

Todos os caminhos são relativos a `/api`. Datas em `YYYY-MM-DD`, horas em `HH:mm`,
valores em reais como **número** (`150.00`) e durações em **minutos** como número
inteiro (`60`). Quem formata para a tela ("R$ 150,00", "1h30", "13 de maio") é o
front (`src/lib/format.js` e `src/api/adapters.js`).

### Autenticação (`src/api/services/auth.js`)

| Método | Rota                          | Corpo                                          | Resposta          |
| ------ | ----------------------------- | ---------------------------------------------- | ----------------- |
| POST   | `/auth/gestora/login`         | `{ email, senha }`                             | `{ token, usuario }` |
| POST   | `/auth/gestora/cadastro`      | `{ empresa, gestora, servicos[], categorias[], aceites }` (abaixo) | `{ token, usuario }` |
| POST   | `/clinicas/{slug}/auth/login` | `{ email, senha }` (403 se for e-mail de gestora) | `{ token, usuario }` |
| POST   | `/clinicas/{slug}/clientes`   | `{ usuario, ficha, aceite }` (abaixo)           | `{ token, usuario }` |
| GET    | `/auth/me`                    | —                                              | `usuario`         |
| POST   | `/auth/recuperar-senha`       | `{ email }`                                    | vazio             |
| POST   | `/auth/logout`                | — (opcional)                                   | vazio             |

Cadastro da empresa (montado em `src/screens/auth/CompanyRegistrationPage.jsx`):

```jsonc
{
  "empresa": { "name": "...", "cpfCnpj": "11222333000181", "phone": "(11) 99988-7766",
               "email": "contato@clinica.com",   // e-mail de CONTATO → CLINICA.email_contato
               "instagram": "...", "address": "...", "tagline": "...", "heroTitle": "...",
               "description": "...", "logoImage": "...", "heroImage": "...",
               "termsOfUse": "...", "privacyPolicy": "...",
               "clinicTermsDocument": "...", "clinicTermsFileName": "..." },
  "gestora": { "nome": "...", "email": "acesso@...",   // e-mail de ACESSO → USUARIO.email
               "senha": "...", "dataNascimento": "1994-03-18", "whatsapp": "11999887766" },
  "servicos": [{ "name": "...", "category": "...", "duration": 60, "price": 150, "description": "...", "image": "..." }],
  "categorias": ["..."],
  "aceites": { "termosUso": true, "politicaPrivacidade": true, "termosClinica": true, "dataHora": "ISO" }
}
```

Cadastro da cliente (montado em `src/screens/client/ClientRegisterPage.jsx`):

```jsonc
{
  "usuario": { "nome": "...", "data_nascimento": "YYYY-MM-DD", "whatsapp": "11999990000",
               "email": "...", "senha": "...", "tipo": "CLIENTE", "recorrente": false },
  "ficha":   { "alergias": "Látex",                      // ≤ 255, "Nenhuma" se não houver
               "observacoes_medicas": "Medicamentos: ...", // resumo ≤ 500 (src/lib/anamnesis.js)
               "respostas": { /* as ~30 perguntas */ } },  // → FICHA_ANAMNESE.respostas (JSON)
  "aceite":  { "termos": true, "privacidade": true, "termosClinica": true, "data_hora": "ISO" }
}
```

### Vitrine pública, sem login (`clinic.js`)

| Método | Rota                                              | Resposta |
| ------ | ------------------------------------------------- | -------- |
| GET    | `/clinicas/{slug}`                                | `{ empresa (só campos públicos, abaixo), servicos (só ativos), categorias }`; 404 se o slug não existir ou a clínica estiver ENCERRADA |
| GET    | `/clinicas/{slug}/calendario?mes=YYYY-MM`         | `{ diasLotados: number[], diasSemanaFechados: number[], diasBloqueados: number[] }` (0 = domingo; `diasBloqueados` = bloqueio do dia inteiro → "Fechado"). Usada pela agenda da cliente **e** pelo calendário do mês da gestora |
| GET    | `/clinicas/{slug}/horarios?data=&servicoId=`      | `[{ label: "MANHÃ", slots: [{ time: "09:00", occupied: false }] }]` |

**Campos públicos da empresa** (o que a vitrine sem login pode receber):
`slug`, `name`, `initials`, `logoImage`, `heroImage`, `favicon`, `tagline`,
`heroTitle`, `description`, `phone`, `email` (contato), `instagram`, `address`,
`termsOfUse`, `privacyPolicy`, `clinicTermsDocument`, `clinicTermsFileName`.
**Não devolver** `cpfCnpj` (pode ser o CPF pessoal da profissional autônoma),
`ownerName` nem `status`: a vitrine não usa esses dados (LGPD, art. 6º, III —
princípio da necessidade). Referência: `publicCompanyOut` em `src/mocks/handlers.js`.

As rotas de calendário e horários devolvem **só disponibilidade**: nenhum nome
de cliente, serviço agendado ou contato. Como são abertas, recomenda-se limitar
o número de requisições por IP (*rate limit*) no backend real.

O `slug` é o nome da empresa em minúsculas, sem acento e com hífens
(`CA Beauty Clinic` → `ca-beauty-clinic`), igual a `toSlug` em `src/lib/format.js`.
O link da cliente é `https://<front>/?clinica=<slug>`.

### Gestora: empresa e catálogo (`company.js`, `catalog.js`)

| Método | Rota                                | Corpo        | Resposta     |
| ------ | ----------------------------------- | ------------ | ------------ |
| GET    | `/gestora/empresa`                  | —            | `Empresa` (com `slug` e `status`) |
| PUT    | `/gestora/empresa`                  | `Empresa`    | `Empresa`    |
| POST   | `/gestora/empresa/encerramento`     | —            | vazio        |
| GET    | `/gestora/servicos`                 | —            | `Servico[]`  |
| POST   | `/gestora/servicos`                 | `Servico` sem id | `Servico` |
| PUT    | `/gestora/servicos/{id}`            | `Servico`    | `Servico`    |
| PATCH  | `/gestora/servicos/{id}/status`     | `{ active }` | `Servico`    |
| GET    | `/gestora/categorias`               | —            | `string[]`   |
| POST   | `/gestora/categorias`               | `{ nome }`   | `string[]` (409 se já existir) |
| DELETE | `/gestora/categorias/{nome}`        | —            | `string[]` (409 se tiver serviços) |

### Gestora: clientes, agenda e agendamentos

| Método | Rota                                         | Corpo / Resposta |
| ------ | -------------------------------------------- | ---------------- |
| GET    | `/gestora/clientes`                          | → `ClienteGestora[]` |
| PUT    | `/gestora/clientes/{id}/notas`               | `{ notasGestora }` (máx. 500) |
| GET    | `/gestora/agendamentos`                      | → `AgendamentoGestora[]` |
| POST   | `/gestora/agendamentos/{id}/cancelamento`    | `{ motivo }` (obrigatório) → `AgendamentoGestora` |
| GET    | `/gestora/painel?semana=YYYY-MM-DD`          | → `{ dias, datas, horarios: Slot[][], proximos }` (calculado; `semana` = qualquer dia da semana desejada, opcional — sem ele, semana atual) |
| GET    | `/gestora/horarios-funcionamento`            | → linhas da tabela HORARIO |
| PUT    | `/gestora/horarios-funcionamento`            | `[{ dia_semana: "SEGUNDA", hora_inicio: "09:00:00", hora_fim: "12:00:00", ativo }]` |
| GET    | `/gestora/bloqueios`                         | → `[{ id, data, inicio, fim, motivo }]` |
| POST   | `/gestora/bloqueios`                         | `{ data, inicio, fim, motivo }` (inicio/fim `null` = dia inteiro) → bloqueio + `agendamentosNoPeriodo` |
| DELETE | `/gestora/bloqueios/{id}`                    | — |

Horário com almoço vira **duas linhas** no mesmo dia (manhã e tarde). A conversão
fica em `toHorarioRows` e `fromHorarioRows` (`src/lib/schedule.js`).

`proximos` (painel): até 6 atendimentos **a partir de agora** (não depende da
semana pedida), sem cancelados, em ordem de data e hora. O 1º vira o cartão
"Próxima cliente"; os demais, a lista "Próximos atendimentos".

```jsonc
{ "id": "12", "time": "14:00", "end": "15:30", "name": "Jamily Souza", "initial": "J",
  "alt": false, "service": "Lash Design", "detail": "Lash Design",
  "status": "CONFIRMADO",                 // CONFIRMADO | PENDENTE
  "signal": "Sinal pago · R$ 51,00",      // ou "Isenta de sinal" / "Sem sinal registrado"
  "data": "2026-11-12", "duracao": 90, "whatsapp": "11999887766", "recorrente": false }
```

As métricas do topo do painel (agendamentos hoje, confirmados, horários livres,
total de clientes) são **calculadas no front** com `/gestora/agendamentos`,
`/gestora/painel` e `/gestora/clientes`. Não há histórico para comparações
(ex.: "+2 em relação a ontem").

### Gestora: documentos, mensagens e auditoria

| Método | Rota                                              | Corpo / Resposta |
| ------ | ------------------------------------------------- | ---------------- |
| GET    | `/gestora/documentos`                             | → `Documento[]` |
| POST   | `/gestora/documentos/{id}/versoes`                | → `Documento` (novo RASCUNHO) |
| POST   | `/gestora/documentos/{id}/publicacao`             | → `Documento[]` (a versão publicada anterior vira INATIVO) |
| POST   | `/gestora/documentos/{id}/inativacao`             | → `Documento` |
| POST   | `/gestora/documentos/{id}/arquivo`                | multipart, campo `arquivo` (PDF) → `Documento` |
| GET    | `/gestora/mensagens/modelos`                      | → `Modelo[]` (tabela MODELO_MENSAGEM). Os 6 padrão são criados **uma vez**, no cadastro da clínica; excluídos não voltam sozinhos |
| PUT    | `/gestora/mensagens/modelos`                      | `Modelo[]` (lista inteira) → `Modelo[]` — legado; a tela usa os endpoints abaixo. Só aceita modelos da própria clínica |
| POST   | `/gestora/mensagens/modelos`                      | `Modelo` (sem id) → 201 `Modelo`. 400: nome/texto vazio, texto > 1000, finalidade inválida |
| PUT    | `/gestora/mensagens/modelos/{id}`                 | `Modelo` → `Modelo` (edita nome, finalidade, texto, ativo). 404 se não for da clínica |
| DELETE | `/gestora/mensagens/modelos/{id}`                 | → 204. Qualquer modelo pode ser excluído, inclusive os padrão |
| POST   | `/gestora/mensagens/modelos/padrao`               | → `Modelo[]`. Recria só os modelos padrão cujas finalidades não existem mais |
| POST   | `/gestora/mensagens/modelos/{id}/restaurar`       | → `Modelo` com nome e texto padrão da finalidade. 400 para PERSONALIZADA |
| GET    | `/gestora/mensagens/destinatarios`                | → `[{ nome, whatsapp, servico, ultimo, data, horario, agendamentoId, status }]` |
| GET    | `/gestora/auditoria`                              | → `[{ id, user, acao, ip, dh }]` |

Não existe mais rota de "pedidos LGPD": a exclusão de conta é imediata (seção 6).

### Cliente logada (`me.js`)

| Método | Rota                                       | Corpo / Resposta |
| ------ | ------------------------------------------ | ---------------- |
| GET    | `/cliente/perfil`                          | → `{ name, email, whatsapp, birthDate, recurring }` |
| PUT    | `/cliente/perfil`                          | mesmo formato |
| GET    | `/cliente/ficha-saude`                     | → `{ respostas, atualizadaEm }` (ISO) |
| PUT    | `/cliente/ficha-saude`                     | `{ respostas, alergias, observacoes_medicas }` |
| GET    | `/cliente/agendamentos`                    | → `AgendamentoCliente[]` |
| POST   | `/cliente/agendamentos`                    | `{ servicoId, data, hora, valorSinal }` → `AgendamentoCliente` (400 se a data/hora já passou; **400 se cliente nova sem sinal pago**) |
| POST   | `/cliente/agendamentos/{id}/confirmacao`   | — → `AgendamentoCliente` (cliente confirma a presença; só PENDENTE e até 24h antes) |
| POST   | `/cliente/agendamentos/{id}/cancelamento`  | `{ motivo }` → `AgendamentoCliente` |

**Regras de sinal e confirmação** (`RegrasAgendamento.java`):

- **Cliente nova:** só agenda com o sinal pago → nasce `CONFIRMADO`. Não existe agendamento com sinal pendente.
- **Cliente recorrente** (isenta de sinal): nasce `PENDENTE` e confirma a presença na área dela até **24h antes** (`confirmarAte` na resposta). Se agendar já dentro das 24h, nasce `CONFIRMADO`.
- Sem confirmação até o prazo, um job do backend (a cada 5 min) cancela: `status CANCELADO`, `canceladoPor "SISTEMA"`, motivo "Presença não confirmada até 24 horas antes do horário.".
- `AgendamentoCliente` traz também `canceladoPor`, `motivoCancelamento` e `confirmarAte`.
- **Lembrete:** aviso "Confirme sua presença" no perfil da cliente; no painel, a gestora tem o botão "Lembrar de confirmar" (WhatsApp com mensagem pronta).
- **Visitante:** ao clicar em "Entrar para confirmar", a escolha (serviço, dia, horário) fica em `sessionStorage` (`src/lib/pendingBooking.js`) e é recuperada depois do login/cadastro.
| POST   | `/cliente/conta/exclusao`                  | — (exclusão imediata) |

## 5. Formatos (DTOs)

Os nomes de campo seguem o que as telas já usam (entre parênteses, a coluna do
banco). No Spring, basta o DTO ter esses nomes ou usar `@JsonProperty`.
Exemplos completos estão em `src/mocks/data/`.

```jsonc
// Empresa → CLINICA (cores NÃO existem: a vitrine usa sempre a paleta padrão)
{ "slug": "ca-beauty-clinic", "status": "ATIVA | ENCERRAMENTO_SOLICITADO | ENCERRADA",
  "name": "CA Beauty Clinic",            // nome
  "cpfCnpj": "11222333000181",           // cpf_cnpj (só números, único)
  "phone": "(11) 99988-7766",            // whatsapp
  "email": "contato@cabeauty.com.br",    // email_contato (≠ e-mail de acesso)
  "address": "...", "description": "...",
  "instagram": "@...", "tagline": "...", "heroTitle": "...",
  "logoImage": "URL", "heroImage": "URL", "favicon": "URL (opcional)",
  "ownerName": "Camille Oli",            // USUARIO.nome da gestora
  "initials": "CA",                      // calculado no front, pode ser ignorado
  "termsOfUse": "...", "privacyPolicy": "...", "clinicTermsDocument": "...", "clinicTermsFileName": "..." }

// Servico → SERVICO
{ "id": "nail-fibra", "name": "Fibra de Vidro",
  "category": "Nail Design",             // nome; o backend resolve id_categoria
  "duration": 120,                       // duracao (minutos)
  "price": 180,                          // preco (reais)
  "active": true, "description": "...", "image": "URL" }

// AgendamentoGestora → AGENDAMENTO + USUARIO (nome, whatsapp)
{ "id": "ag-1", "cliente": "Jamily Souza", "whatsapp": "5511999881111",
  "nomeProcedimento": "Volume Brasileiro", "data": "2026-11-03", "hora": "09:00",
  "duracao": 120, "status": "PENDENTE | CONFIRMADO | CONCLUIDO | CANCELADO | ARQUIVADO",
  "canceladoPor": "GESTORA | CLIENTE", "motivoCancelamento": "...", "dataCancelamento": "ISO" }

// AgendamentoCliente → AGENDAMENTO
{ "id": "a1", "servicoId": "lash-brasileiro", "nomeProcedimento": "Volume Brasileiro",
  "data": "2026-11-10", "hora": "09:00", "duracao": 120,
  "valorServico": 170, "valorSinal": 51,  // snapshot do preço e sinal
  "status": "PENDENTE | CONFIRMADO | CONCLUIDO | CANCELADO | ARQUIVADO" }
// (o front converte para "Agendado/Realizado/Cancelado" em src/api/adapters.js;
//  não existe mais protocolo de agendamento)

// Slot (painel da gestora, calculado)
{ "time": "09:00", "end": "10:00", "status": "free | busy | blocked",
  "agendamentoId": "ag-1", "client": "Jamily", "whatsapp": "...", "service": "...",  // se busy
  "bloqueio": { "id": 1, "inicio": "09:00", "fim": "10:00" } }                     // se blocked
```

## 6. O que o backend faz (regras de negócio)

Resumo das decisões do projeto. Cada rota também tem um comentário **BACKEND:**
explicando o passo a passo em `src/mocks/handlers.js` e em `src/api/services/*.js`.

**Cadastros e idade mínima**
- Gestora precisa ter **16 anos** e cliente **15 anos**. O front avisa e valida,
  mas o backend valida de novo: o MySQL não aceita a data de hoje dentro de um
  `CHECK`, então a regra não fica no banco.
- **CPF/CNPJ** da clínica é obrigatório, validado (dígitos verificadores) e único.
  O front envia só os números.
- **Dois e-mails:** o e-mail de **acesso** da gestora (`USUARIO.email`, login) e o
  e-mail de **contato** da clínica (`CLINICA.email_contato`, aparece na vitrine)
  precisam ser **diferentes**, por segurança. Validar no cadastro e na edição.
- Cadastro da empresa numa transação: USUARIO (gestora, senha com BCrypt) →
  CLINICA (status ATIVA) → CATEGORIA → SERVICO → HORARIO padrão →
  ACEITE_DOCUMENTO (Termos de Uso e Política de Privacidade do Prontto, papel
  `GESTORA`) → LOG_AUDITORIA.
- Cadastro da cliente: USUARIO com **`id_clinica`** da clínica do link (é o que
  liga a cliente à clínica no MVP) → FICHA_ANAMNESE → ACEITE_DOCUMENTO (papel
  `CLIENTE`).

**Catálogo**
- Preço (`DECIMAL`) e duração (`INT`, minutos) chegam como número; recusar texto.
- Categorias ficam na tabela CATEGORIA (`UNIQUE (id_clinica, nome)`); o serviço
  envia o nome e o backend grava `SERVICO.id_categoria`. Não apagar categoria com
  serviços (409).
- Desativar serviço é exclusão lógica (`ativo = 0`), nunca DELETE.

**Agenda (opção A: sem horários avulsos)**
- Horários livres = faixas de HORARIO − BLOQUEIO_HORARIO − AGENDAMENTO não
  cancelados, respeitando a duração do serviço. O painel (`/gestora/painel`)
  usa a mesma conta, em blocos de 60 minutos.
- Bloqueio: `hora_inicio`/`hora_fim` `NULL` = dia inteiro. Se houver agendamentos
  no período, o bloqueio **é criado mesmo assim** e a resposta traz
  `agendamentosNoPeriodo` para alertar a gestora; os agendamentos **não** são
  cancelados. Novos agendamentos no período passam a ser recusados.
- Agendamento novo: recusar data/hora no passado (**400**, "Essa data ou horário
  já passou. Escolha um horário futuro."), conferir disponibilidade (409 se
  ocupado/bloqueado) e copiar `nome_procedimento` e `valor_servico` do SERVICO
  (snapshot). O front também bloqueia o passado, mas a regra precisa valer no backend.
- **Agenda aberta só para 2 meses**: o mês atual e o seguinte. Data depois do último
  dia do mês seguinte → **400** ("A agenda está aberta só para este mês e o próximo.").
  O front trava a seta de "próximo mês" no segundo mês (`BOOKING_MONTHS` em `src/constants`).
- **Fechamento às 19h**: um horário só é oferecido se o serviço **terminar** até 19h
  (ex.: serviço de 2h → último horário 17:00).
- Cancelamento (gestora ou cliente): `status = 'CANCELADO'`, `cancelado_por`,
  `motivo_cancelamento`, `data_cancelamento`, e LOG_AUDITORIA.

**Estados da agenda (o que a cliente vê no calendário)**

| Estado | Onde aparece | Regra |
| ------ | ------------ | ----- |
| **Livre** | dia | Tem pelo menos um horário em que o serviço escolhido cabe inteiro (HORARIO − BLOQUEIO_HORARIO − AGENDAMENTO não cancelados). |
| **Lotado** | dia | Dia de expediente sem nenhum horário livre para o serviço escolhido, por agendamentos e/ou bloqueios parciais. Vem em `diasLotados`. |
| **Fechado** | dia | Dia da semana sem expediente em HORARIO (`diasSemanaFechados`) **ou** dia inteiro bloqueado pela gestora (BLOQUEIO_HORARIO com `hora_inicio`/`hora_fim` `NULL`). |
| **Passado** | dia | Data anterior a hoje, **ou hoje** quando não cabe mais nenhum horário do serviço antes das 19h. Calculado no front; o backend recusa agendar no passado. A seleção pula sozinha para o próximo dia livre. |
| **Indisponível** | horário | Horário ocupado por agendamento **ou** bloqueado (`occupied: true`). A cliente não vê o motivo, por privacidade. Horários de hoje que já passaram também aparecem como indisponíveis ("Já passou"). |

No painel da gestora os mesmos dados aparecem com mais detalhe (`free`, `busy` com
o nome da cliente, `blocked` com o bloqueio), porque ela está logada.

> No backend falso (`src/mocks`), `diasLotados` ainda é uma lista fixa de
> demonstração; no Spring ele deve ser calculado pela regra acima.

**Ficha de anamnese**
- `respostas` (JSON) guarda todas as perguntas; `alergias` (≤ 255) e
  `observacoes_medicas` (≤ 500) guardam o resumo gerado pelo front.
- A cada alteração, gravar HISTORICO_ANAMNESE por campo alterado.
- Os campos `localData`, `nomeCliente` e `assinatura` **não aparecem mais** na
  tela (nem no cadastro, nem na edição da ficha). Eles continuam existindo dentro
  de `respostas`, normalmente vazios; `nomeCliente` é preenchido com o nome do
  cadastro. O backend não deve exigi-los.

**Exclusão de conta da cliente (LGPD) — imediata, sem fila de pedidos**
1. Anonimizar o USUARIO: `nome = 'CLIENTE_ANONIMIZADO'`,
   `email = 'anon-<id>@removido.invalid'`, `whatsapp = 'ANON-<id>'` (são UNIQUE e
   NOT NULL), senha com hash aleatório, `status = 'ANONIMIZADO_LGPD'`,
   `solicitou_exclusao = 1`, `data_nascimento = '1900-01-01'` (data genérica;
   `'0000-00-00'` não é usada porque o MySQL 8 a recusa no modo padrão).
2. **Manter** os AGENDAMENTOs (comprovação fiscal e prestação de contas).
3. **Manter** a FICHA_ANAMNESE, com acesso só da gestora (defesa em processo); o
   motivo deve constar na política de privacidade.
4. LOG_AUDITORIA `EXCLUSAO_CONTA_LGPD` e invalidar o token.

Acesso e correção dos dados (outros direitos da LGPD) a cliente faz sozinha em
"Meu perfil".

**Encerramento da clínica:** `CLINICA.status = 'ENCERRAMENTO_SOLICITADO'` +
LOG_AUDITORIA. Dados com obrigação legal de guarda não são apagados.

**Continua simulado no front (mesmo depois da integração):** pagamento do sinal
(Pix/cartão em `DepositStep.jsx`); só o valor vai para `AGENDAMENTO.valor_sinal`.
As cores da vitrine também não são personalizáveis.

**Imagens** que a gestora envia (logo, capa, favicon, foto do serviço) vão como
data URL dentro do JSON. Se preferirem upload separado, criem uma rota multipart
e usem `http.upload` no front.

As imagens da **clínica de demonstração** ficam no próprio projeto, como arquivos:

- capa de cada categoria: `public/images/categorias/<nome-da-categoria>.jpg`
  (ex.: `nail-design.jpg`), definidas em `storefrontCategories` (`src/constants/index.js`);
- foto de cada serviço: `public/images/servicos/<id-do-serviço>.jpg`
  (ex.: `lash-fox.jpg`), referenciada no campo `image` de `src/mocks/data/services.js`.

Para trocar uma foto, basta substituir o arquivo mantendo o mesmo nome. Os caminhos
usam `import.meta.env.BASE_URL`, então funcionam no `npm run dev` e com o site
publicado em subpasta. Categoria criada pela gestora sem imagem própria usa a capa
padrão (`DEFAULT_CATEGORY_COVER`). O campo `image` aceita tanto um caminho/URL
quanto uma data URL.

## 7. Checklist da integração

1. Subir o Spring em `http://localhost:8080` com as rotas acima sob `/api`.
2. Criar `.env.local` com `VITE_USE_MOCKS=false`.
3. `npm run dev` e testar os dois fluxos:
   - Gestora: `http://localhost:5173/`
   - Cliente: `http://localhost:5173/?clinica=<slug>`
4. Quando tudo funcionar, apagar a pasta `src/mocks` (veja `src/mocks/README.md`).
