/**
 * PONTO DE ENTRADA do React.
 * O index.html tem uma <div id='root'>; aqui o React 'monta' o componente App
 * dentro dela. Tudo o que aparece na tela nasce a partir deste arquivo.
 */
import React from "react"
import ReactDOM from "react-dom/client"
// Ordem do CSS: global primeiro, depois o CSS de cada tela (importado pelos
// componentes dentro de App) e, por último, as regras que precisam vencer tudo.
import "./index.css"
import App from "./App"
import "./styles/overrides.css"

// StrictMode: modo de desenvolvimento que avisa sobre usos errados do React.
// Não aparece para o usuário e não muda nada em produção.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
