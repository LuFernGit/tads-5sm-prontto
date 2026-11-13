package prontto_api.dto;

/** Criar/editar documento: { titulo, tipo, conteudo }. O PDF é anexado à parte. */
public record DocumentoRequest(
        String titulo,
        String tipo,
        String conteudo
) {}
