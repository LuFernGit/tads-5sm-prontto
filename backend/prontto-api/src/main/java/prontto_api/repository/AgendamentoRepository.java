package prontto_api.repository;

import prontto_api.domain.Agendamento;
import prontto_api.domain.enums.StatusAgendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    List<Agendamento> findByServicoClinicaIdAndData(Long clinicaId, LocalDate data);
    List<Agendamento> findByServicoClinicaIdAndDataBetween(Long clinicaId, LocalDate inicio, LocalDate fim);
    List<Agendamento> findByClienteId(Long clienteId);
    List<Agendamento> findByServicoClinicaIdAndStatusNot(Long clinicaId, StatusAgendamento status);
}