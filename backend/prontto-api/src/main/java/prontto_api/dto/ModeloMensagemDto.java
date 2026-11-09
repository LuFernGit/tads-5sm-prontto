package prontto_api.dto;

public record ModeloMensagemDto(
        String id,
        String nome,
        String finalidade,
        Boolean ativo,
        String texto
) {}