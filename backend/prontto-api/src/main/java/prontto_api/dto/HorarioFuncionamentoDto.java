package prontto_api.dto;

public record HorarioFuncionamentoDto(
        String dia_semana,
        String hora_inicio,
        String hora_fim,
        Boolean ativo
) {}