/**
 * Configuração da comunicação com o backend (Spring Boot).
 *
 * Funciona SEM arquivo .env: por padrão as chamadas vão para "/api", que o
 * `npm run dev` repassa ao Spring em http://localhost:8080 (vite.config.js).
 * Variáveis opcionais (veja .env.example):
 *   VITE_API_URL        → prefixo das rotas. Padrão "/api".
 *   VITE_API_TIMEOUT_MS → tempo máximo de espera de uma requisição (padrão 15000).
 */
const env = import.meta.env

// Remove a barra final para evitar URLs como '/api//servicos'.
export const API_URL = (env.VITE_API_URL || "/api").replace(/\/$/, "")

/**
 * O backend falso (src/mocks) foi removido: o front sempre usa o Spring Boot.
 * Fica como `false` só para as telas que ainda consultam a flag (ex.: o aviso
 * "Acesso demonstrativo" dos logins, que não aparece mais).
 */
export const USE_MOCKS = false

export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS) || 15000
