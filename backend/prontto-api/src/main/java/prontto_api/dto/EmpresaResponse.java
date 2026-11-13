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
        String clinicTermsFileName,
        // V5: endereço em partes (tela Configurações). "address" = texto completo.
        String cep,
        String street,
        String number,
        String complement,
        String neighborhood,
        String city,
        String state,
        String hoursText,           // horário de atendimento (texto livre)
        String cancellationPolicy   // política de cancelamento
) {}