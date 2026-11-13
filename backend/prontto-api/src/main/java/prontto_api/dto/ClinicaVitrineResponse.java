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
            String clinicTermsDocument,
            String clinicTermsFileName,
            String hoursText,
            String cancellationPolicy
    ) {}
}