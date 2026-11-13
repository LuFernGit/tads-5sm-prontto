package prontto_api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Criação de categoria.
 * capa = foto de capa na vitrine (data URL base64), obrigatória.
 */
public record CategoriaRequest(
        @NotBlank(message = "O nome da categoria é obrigatório")
        String nome,
        @NotBlank(message = "A foto de capa da categoria é obrigatória")
        String capa
) {}
