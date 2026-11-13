package prontto_api.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Política de cancelamento/reembolso de 24 horas (RegrasAgendamento).
 * Teste de unidade puro: não sobe o Spring nem o banco.
 */
class RegrasAgendamentoReembolsoTest {

    /** Agendamento em 20/11/2026 às 14:00. */
    private static Agendamento agendamento(BigDecimal sinal) {
        Agendamento a = new Agendamento();
        a.setData(LocalDate.of(2026, 11, 20));
        a.setHora(LocalTime.of(14, 0));
        a.setValorSinal(sinal);
        return a;
    }

    @Test
    void exatamente24HorasAntesAindaEstaNoPrazo() {
        Agendamento a = agendamento(new BigDecimal("50.00"));
        assertTrue(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 19, 14, 0)));
    }

    @Test
    void umMinutoDepoisDo24hFicaForaDoPrazo() {
        Agendamento a = agendamento(new BigDecimal("50.00"));
        assertFalse(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 19, 14, 1)));
    }

    @Test
    void consideraOHorarioEnaoSoAData() {
        Agendamento a = agendamento(new BigDecimal("50.00"));
        // Dia anterior, mas às 15h: faltam só 23h → fora do prazo.
        assertFalse(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 19, 15, 0)));
        // Dia anterior às 9h: faltam 29h → no prazo.
        assertTrue(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 19, 9, 0)));
        // Mesmo dia, de manhã: fora do prazo.
        assertFalse(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 20, 8, 0)));
    }

    @Test
    void viradaDeMesConta24HorasCorretamente() {
        Agendamento a = new Agendamento();
        a.setData(LocalDate.of(2026, 12, 1));
        a.setHora(LocalTime.of(9, 0));
        assertTrue(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 30, 9, 0)));
        assertFalse(RegrasAgendamento.noPrazoDeReembolso(a, LocalDateTime.of(2026, 11, 30, 9, 30)));
        assertEquals(LocalDateTime.of(2026, 11, 30, 9, 0), RegrasAgendamento.prazoReembolso(a));
    }

    @Test
    void clienteRecorrenteSemSinalNaoTemOQueReembolsar() {
        assertFalse(RegrasAgendamento.temSinalRegistrado(agendamento(null)));
        assertFalse(RegrasAgendamento.temSinalRegistrado(agendamento(BigDecimal.ZERO)));
        assertTrue(RegrasAgendamento.temSinalRegistrado(agendamento(new BigDecimal("30.00"))));
    }
}
