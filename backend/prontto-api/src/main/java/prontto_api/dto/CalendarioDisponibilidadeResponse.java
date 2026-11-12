package prontto_api.dto;

import java.util.List;

/**
 * Disponibilidade do mês (só números do dia, nenhum dado de cliente — rota pública).
 *   diasLotados        → dias abertos sem nenhum horário livre (agendamentos/bloqueios)
 *   diasSemanaFechados → dias da semana sem expediente (0 = domingo … 6 = sábado)
 *   diasBloqueados     → dias com bloqueio do dia inteiro (a clínica não abre)
 */
public record CalendarioDisponibilidadeResponse(
        List<Integer> diasLotados,
        List<Integer> diasSemanaFechados,
        List<Integer> diasBloqueados
) {}