package prontto_api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

public record CadastroClinicaRequest(
        @NotNull(message = "Dados da empresa são obrigatórios")
        EmpresaCadastroDto empresa,

        @NotNull(message = "Dados da gestora são obrigatórios")
        GestoraCadastroDto gestora,

        List<ServicoRequest> servicos,
        List<String> categorias,
        Map<String, Object> aceites,
        // { nome da categoria: foto de capa (data URL) }; opcional, por categoria.
        Map<String, String> capasCategorias
) {
    public record EmpresaCadastroDto(
            String name,
            String cpfCnpj,
            String phone,
            String email,
            String instagram,
            String address,
            String tagline,
            String heroTitle,
            String description,
            String logoImage,
            String heroImage,
            String termsOfUse,
            String privacyPolicy,
            String clinicTermsDocument,
            String clinicTermsFileName
    ) {}

    public record GestoraCadastroDto(
            String nome,
            String email,
            String senha,
            String dataNascimento,
            String whatsapp
    ) {}
}