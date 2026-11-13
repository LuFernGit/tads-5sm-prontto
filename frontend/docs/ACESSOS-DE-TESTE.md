# Acessos de teste

Contas da **CA Beauty Clinic** para testar o sistema sem precisar cadastrar nada.

| Perfil | Link | E-mail | Senha |
| --- | --- | --- | --- |
| **Gestora** (Camille Oli) | <http://localhost:5173/> | `camile@cabeauty.com.br` | `Prontto@123` |
| **Cliente** (Jamily Souza) | <http://localhost:5173/?clinica=ca-beauty-clinic> | `jamily@email.com` | `Prontto@123` |
| **Cliente** (Luana Ferreira) | <http://localhost:5173/?clinica=ca-beauty-clinic> | `luana@email.com` | `Prontto@123` |
| **Cliente** (Beatriz Lima) | <http://localhost:5173/?clinica=ca-beauty-clinic> | `beatriz@email.com` | `Prontto@123` |

Luana e Beatriz existem só no **backend real** (não no mock).

Os mesmos acessos funcionam com o backend real (`VITE_USE_MOCKS=false`) e com o
mock (`VITE_USE_MOCKS=true`).

## De onde vêm

- **Backend real:** o script
  `backend/prontto-api/src/main/resources/seed-dev.sql` cria esses dados no
  MySQL quando o Spring sobe (precisa subir pelo menos uma vez). Ele não
  duplica nem apaga nada que já exista.
- **Mock:** os dados de demonstração ficam em `src/mocks/data`.

## O que já vem cadastrado (backend real)

- Clínica **CA Beauty Clinic** (slug `ca-beauty-clinic`), com logo, capa e textos
  da vitrine. CNPJ de teste: `45.723.174/0001-10`.
- 4 categorias e 16 serviços, com fotos.
- Horário: segunda a sábado, 9h–12h e 13h–19h; domingo fechado.
- Ficha de saúde da Jamily preenchida.
- 3 agendamentos da Jamily: um concluído (histórico), um **confirmado** com sinal
  pago e um **pendente**. As datas são calculadas no dia em que o banco é populado;
  para gerar de novo, apague os agendamentos da Jamily e reinicie o Spring.
- **Luana Ferreira** — cliente **nova** (paga sinal): 2 agendamentos futuros
  **confirmados** com sinal pago (Fibra de Vidro e Banho de Gel).
- **Beatriz Lima** — cliente **recorrente** (isenta de sinal), com alergia na ficha:
  - concluído há ~50 dias → aparece com **"Alerta de manutenção"** em Clientes;
  - cancelado **automaticamente** há ~10 dias (não confirmou até 24h antes);
  - **aguardando confirmação** daqui a 2 dias (testa o "Pedido de confirmação");
  - **confirmado** daqui a 4 dias (testa o "Lembrete").

## WhatsApp

Todos os números de teste são da equipe, para nenhuma mensagem ir para um estranho:

| Quem | WhatsApp |
| --- | --- |
| Clínica (recebe as mensagens da cliente) | (11) 98504-8943 |
| Cliente Jamily (recebe as mensagens da gestora) | (11) 98504-8943 |
| Gestora Camille | (11) 94982-3270 |
| Clientes Luana e Beatriz | (11) 90000-0101 e (11) 90000-0102 — **fictícios** (o WhatsApp é único no banco e os números da equipe já estão em uso) |

> ⚠️ Antes de publicar em produção, remova a linha
> `data-locations: classpath:seed-dev.sql` do `application.yaml` do backend.
