package prontto_api.repository;

import prontto_api.domain.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, Long> {

    @Query("SELECT l FROM LogAuditoria l WHERE l.usuario.clinica.id = :clinicaId OR l.usuario.id IN (SELECT c.gestora.id FROM Clinica c WHERE c.id = :clinicaId)")
    List<LogAuditoria> findByClinicaId(@Param("clinicaId") Long clinicaId);

    List<LogAuditoria> findByUsuarioId(Long usuarioId);
}