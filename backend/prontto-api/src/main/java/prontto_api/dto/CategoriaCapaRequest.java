package prontto_api.dto;

/**
 * Troca da foto de capa de uma categoria.
 * capa = data URL base64 da nova foto (obrigatória; vazia → 400).
 */
public record CategoriaCapaRequest(String capa) {}
