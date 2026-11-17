package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import prontto_api.domain.Notificacao;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    /** As 30 mais recentes da clínica (o sino mostra essas). */
    List<Notificacao> findTop30ByClinicaIdOrderByCriadaEmDescIdDesc(Long clinicaId);

    long countByClinicaIdAndLidaEmIsNull(Long clinicaId);

    @Modifying
    @Query("UPDATE Notificacao n SET n.lidaEm = :agora WHERE n.clinica.id = :clinicaId AND n.lidaEm IS NULL")
    int marcarTodasComoLidas(@Param("clinicaId") Long clinicaId, @Param("agora") LocalDateTime agora);
}
