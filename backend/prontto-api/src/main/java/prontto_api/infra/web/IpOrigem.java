package prontto_api.infra.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * IP de quem fez a requisição atual, para LOG_AUDITORIA e ACEITE_TERMO.
 *
 * - Requisição direta: usa o endereço da conexão (getRemoteAddr).
 * - Requisição repassada por um proxy NA MESMA MÁQUINA (ex.: o proxy do Vite em
 *   desenvolvimento): usa o 1º IP do cabeçalho X-Forwarded-For. O cabeçalho só
 *   é aceito vindo de localhost, para ninguém forjar o IP pela internet.
 * - Fora de uma requisição (ex.: job de cancelamento automático): "127.0.0.1",
 *   ou seja, a ação foi feita pelo próprio servidor.
 */
public final class IpOrigem {

    private static final String SERVIDOR = "127.0.0.1";
    private static final int TAMANHO_MAXIMO = 45; // coluna ip_origem VARCHAR(45)

    private IpOrigem() {}

    public static String atual() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return SERVIDOR;
        }
        HttpServletRequest request = attrs.getRequest();
        String ip = normalizar(request.getRemoteAddr());

        String encaminhado = request.getHeader("X-Forwarded-For");
        if (SERVIDOR.equals(ip) && encaminhado != null && !encaminhado.isBlank()) {
            ip = normalizar(encaminhado.split(",")[0]);
        }
        if (ip == null || ip.isBlank()) return SERVIDOR;
        return ip.length() > TAMANHO_MAXIMO ? ip.substring(0, TAMANHO_MAXIMO) : ip;
    }

    /** Localhost em IPv6 ("::1") vira "127.0.0.1" para ficar legível na Auditoria. */
    private static String normalizar(String ip) {
        if (ip == null) return null;
        String limpo = ip.trim();
        if ("::1".equals(limpo) || "0:0:0:0:0:0:0:1".equals(limpo) || "::ffff:127.0.0.1".equals(limpo)) {
            return SERVIDOR;
        }
        if (limpo.startsWith("::ffff:")) return limpo.substring(7); // IPv4 dentro de IPv6
        return limpo;
    }
}
