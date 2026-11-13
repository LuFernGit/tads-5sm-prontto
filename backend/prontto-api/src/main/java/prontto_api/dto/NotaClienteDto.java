package prontto_api.dto;

/** Nota interna da gestora: { id, texto, criadaEm, atualizadaEm } (datas ISO). */
public record NotaClienteDto(
        Long id,
        String texto,
        String criadaEm,
        String atualizadaEm
) {}
