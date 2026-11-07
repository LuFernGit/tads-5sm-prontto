# src/mocks: backend falso (apagar depois da integração)

Esta pasta simula o backend Spring Boot para o protótipo funcionar sozinho.
Nenhuma tela importa nada daqui: o único ponto de contato é o
`import.meta.glob("../mocks/index.js")` em `src/api/http.js`.

| Arquivo        | O que faz                                                      |
| -------------- | -------------------------------------------------------------- |
| `index.js`     | Recebe a requisição, simula 250 ms de latência e chama a rota. |
| `handlers.js`  | Uma função por rota da API (é o contrato que o Spring segue).  |
| `router.js`    | Casa `MÉTODO /caminho/:param` com o handler.                   |
| `db.js`        | "Banco" em memória, salvo no localStorage.                     |
| `data/`        | Dados fictícios iniciais (CA Beauty Clinic, clientes etc.).    |

## Acessos de demonstração

- Gestora: `http://localhost:8443/`, usuário `camile@cabeauty.com.br`, senha `Prontto@123`
- Cliente: `http://localhost:8443/?clinica=ca-beauty-clinic`, usuário `jamily@email.com`, senha `Prontto@123`

Para zerar os dados, abra qualquer URL com `?resetMocks`
(ex.: `/?resetMocks` ou `/?clinica=ca-beauty-clinic&resetMocks`).

## Como remover

1. No `.env.local`, coloque `VITE_USE_MOCKS=false` e teste com o Spring rodando.
2. Quando estiver tudo certo, apague a pasta `src/mocks` inteira.

O projeto continua compilando sem ela. Se `VITE_USE_MOCKS` ficar `true` sem a
pasta, o front avisa no console e usa o backend real.
