package prontto_api.dto;

import java.util.List;

public record ClinicaVitrineResponse(
        EmpresaPublicaResponse empresa,
        List<ServicoResponse> servicos,
        List<String> categorias
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
            String clinicTermsFileName
    ) {}
}