package prontto_api.dto;

import java.util.List;
import java.util.Map;

/**
 * capasCategorias = { nome da categoria: foto de capa (data URL) }, só das
 * categorias que têm foto própria; as outras usam a capa padrão da vitrine.
 */
public record ClinicaVitrineResponse(
        EmpresaPublicaResponse empresa,
        List<ServicoResponse> servicos,
        List<String> categorias,
        Map<String, String> capasCategorias
) {
    public record EmpresaPublicaResponse(
            String slug,
            String name,
            String initials,
            String logoImage,
            String heroImage,
            String favicon,
            String tagline,
            String heroTitle,
            String description,
            String phone,
            String email,
            String instagram,
            String address,
            String termsOfUse,
            String privacyPolicy,
            String hoursText,
            String cancellationPolicy,
            // Documentos PUBLICADOS da clínica e do Prontto (texto e/ou PDF).
            // O PDF não vem aqui (pesava a vitrine): é baixado à parte em
            // GET /clinicas/{slug}/documentos/{id}/pdf quando temPdf = true.
            List<DocumentoPublicoResponse> documents
    ) {}

    public record DocumentoPublicoResponse(
            Long id,
            String tipo,           // TERMOS_USO, POLITICA_PRIVACIDADE, TERMO_CLINICA, TERMO_EXCLUSAO
            boolean plataforma,   // true = documento do Prontto (id_clinica NULL)
            String titulo,
            String versao,
            String conteudo,      // texto (pode ser vazio quando só há PDF)
            boolean temPdf,
            String nomeArquivo
    ) {}
}