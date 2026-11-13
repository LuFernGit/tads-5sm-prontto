package prontto_api.domain;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Separa o endereço em texto único (CLINICA.endereco) nas partes
 * (cep, logradouro, número, complemento, bairro, cidade, UF).
 *
 * Formatos montados pelo front:
 *  - cadastro da empresa: "Rua X, 92 — Sala 2 · Bairro, Cidade — SP · CEP 01310-100"
 *  - Configurações:       "Rua X, 92 — Sala 2 · Bairro, Cidade — SP"
 * Complemento, bairro, cidade, UF e CEP são opcionais. Se o texto não seguir
 * o formato, devolve null (quem chama mantém o texto inteiro como logradouro).
 */
public final class EnderecoParser {

    public record Partes(String cep, String logradouro, String numero, String complemento,
                         String bairro, String cidade, String uf) {}

    private static final Pattern FORMATO = Pattern.compile(
            "^\\s*(?<rua>[^,·]+?)\\s*,\\s*(?<num>[^,·—]+?)"
                    + "(?:\\s*—\\s*(?<compl>[^·]+?))?"
                    + "\\s*(?:·\\s*(?<bairro>[^,·]+?))?"
                    + "\\s*(?:,\\s*(?<cidade>[^—·]+?))?"
                    + "\\s*(?:—\\s*(?<uf>[A-Za-z]{2}))?"
                    + "\\s*(?:·\\s*CEP\\s*(?<cep>[\\d.\\-\\s]+?))?\\s*$");

    private EnderecoParser() {}

    public static Partes separar(String endereco) {
        if (endereco == null || endereco.isBlank()) return null;
        Matcher m = FORMATO.matcher(endereco.trim());
        if (!m.matches()) return null;
        String cep = m.group("cep") != null ? m.group("cep").replaceAll("\\D", "") : null;
        return new Partes(
                cep != null && cep.length() == 8 ? cep : null,
                m.group("rua").trim(),
                m.group("num").trim(),
                limpo(m.group("compl")),
                limpo(m.group("bairro")),
                limpo(m.group("cidade")),
                m.group("uf") != null ? m.group("uf").toUpperCase() : null);
    }

    private static String limpo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
