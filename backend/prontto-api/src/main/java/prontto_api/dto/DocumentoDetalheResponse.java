package prontto_api.dto;

/** Documento completo (para visualizar/editar): inclui o texto e o PDF (data URL). */
public record DocumentoDetalheResponse(
        Long id,
        String titulo,
        String tipo,
        String versao,
        String status,
        String conteudo,
        String arquivo,       // nome do PDF
        String arquivoUrl,    // PDF em data URL (null se não houver)
        String publicadoEm,
        Boolean plataforma,
        Integer aceites,
        String excluidoEm     // data da exclusão lógica (null = não excluído)
) {}
