package prontto_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CriarAgendamentoClienteRequest(
        @NotBlank(message = "O ID do serviço é obrigatório")
        String servicoId,

        @NotBlank(message = "A data é obrigatória")
        String data,

        @NotBlank(message = "O horário é obrigatório")
        String hora,

        BigDecimal valorSinal
) {}