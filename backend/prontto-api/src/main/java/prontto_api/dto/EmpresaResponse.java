package prontto_api.dto;

public record EmpresaResponse(
        String slug,
        String status,
        String name,
        String cpfCnpj,
        String phone,
        String email,
        String address,
        String description,
        String instagram,
        String tagline,
        String heroTitle,
        String logoImage,
        String heroImage,
        String favicon,
        String ownerName,
        String initials,
        String termsOfUse,
        String privacyPolicy,
        String clinicTermsDocument,
        String clinicTermsFileName
) {}