package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import prontto_api.domain.DocumentoTermo;

import java.util.List;

public interface DocumentoTermoRepository extends JpaRepository<DocumentoTermo, Long> {
    @Query("SELECT d FROM DocumentoTermo d WHERE d.clinica.id = :clinicaId OR d.clinica IS NULL")
    List<DocumentoTermo> findByClinicaIdOuPlataforma(@Param("clinicaId") Long clinicaId);

    List<DocumentoTermo> findByClinicaIsNull();
}