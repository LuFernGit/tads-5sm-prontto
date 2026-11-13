package prontto_api.dto;

public record DocumentoResponse(
        Long id,
        String titulo,
        String tipo,
        String versao,
        String arquivo,
        String status,
        String publicadoEm,
        Boolean plataforma,
        Integer aceites,
        String excluidoEm      // data da exclusão lógica (null = não excluído)
) {}
