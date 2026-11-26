# Acessos de teste

Contas da **CA Beauty Clinic** para testar o sistema sem precisar cadastrar nada.

| Perfil | Link | E-mail | Senha |
| --- | --- | --- | --- |
| **Gestora** (Camille Oli) | <http://localhost:5173/> | `camile@cabeauty.com.br` | `Prontto@123` |
| **Cliente** (Jamily Souza) | <http://localhost:5173/?clinica=ca-beauty-clinic> | `jamily@email.com` | `Prontto@123` |

O front sempre usa o backend Spring Boot (não precisa de `.env`); basta o MySQL e
o Spring estarem rodando.

## ⚠️ O banco é apagado a cada start

Na fase de testes, o `schema.sql` do backend faz `DROP DATABASE prontto` e recria
tudo **toda vez que o Spring sobe**. Em seguida, o `seed-dev.sql` cadastra só os
dados abaixo. Ou seja: **tudo o que for cadastrado nos testes some ao reiniciar o
backend** — é proposital, para sempre testar com dados limpos.

## O que já vem cadastrado

- Gestora **Camille Oli** e a clínica **CA Beauty Clinic** (slug
  `ca-beauty-clinic`), com logo, capa e textos da vitrine. CNPJ de teste:
  `45.723.174/0001-10`.
- 4 categorias e 16 serviços, com fotos.
- Horário: segunda a sábado, 9h–12h e 13h–19h; domingo fechado.
- Termos de uso e política de privacidade da clínica (versão 1.0, publicados).
- Cliente **Jamily Souza** — cliente **nova** (paga sinal de 30%), com ficha de
  saúde preenchida e **nenhum agendamento**.

Nada de agendamentos, notas ou outras clientes: crie o que precisar durante o teste.

## WhatsApp

Todos os números de teste são da equipe, para nenhuma mensagem ir para um estranho:

| Quem | WhatsApp |
| --- | --- |
| Clínica (recebe as mensagens da cliente) | (11) 98504-8943 |
| Cliente Jamily (recebe as mensagens da gestora) | (11) 98504-8943 |
| Gestora Camille | (11) 94982-3270 |

> ⚠️ Antes de publicar em produção: remova o `DROP DATABASE IF EXISTS prontto;`
> do `schema.sql` e a linha `data-locations: classpath:seed-dev.sql` do
> `application.yaml` do backend.
