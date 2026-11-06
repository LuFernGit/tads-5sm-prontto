/**
 * Configuração da comunicação com o backend (Spring Boot).
 *
 * Variáveis lidas do arquivo .env (veja .env.example):
 *   VITE_API_URL    → prefixo das rotas. Padrão "/api" (o Vite faz proxy para o Spring).
 *   VITE_USE_MOCKS  → "true" usa o backend falso de src/mocks; "false" chama o Spring.
 *   VITE_API_TIMEOUT_MS → tempo máximo de espera de uma requisição (padrão 15000).
 */
const env = import.meta.env

// Remove a barra final para evitar URLs como '/api//servicos'.
export const API_URL = (env.VITE_API_URL || "/api").replace(/\/$/, "")

// Por padrão usa os mocks (backend falso), para o protótipo funcionar sem o Spring.
export const USE_MOCKS = String(env.VITE_USE_MOCKS ?? "true") === "true"

export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS) || 15000
