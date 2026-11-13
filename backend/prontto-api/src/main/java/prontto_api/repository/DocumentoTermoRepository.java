package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import prontto_api.domain.DocumentoTermo;

import java.util.List;

public interface DocumentoTermoRepository extends JpaRepository<DocumentoTermo, Long> {
    /** Documentos da clínica e do Prontto, sem os excluídos (exclusão lógica). */
    @Query("SELECT d FROM DocumentoTermo d WHERE (d.clinica.id = :clinicaId OR d.clinica IS NULL) AND d.excluidoEm IS NULL")
    List<DocumentoTermo> findByClinicaIdOuPlataforma(@Param("clinicaId") Long clinicaId);

    /** Documentos excluídos da clínica (podem ser restaurados), mais recentes primeiro. */
    List<DocumentoTermo> findByClinicaIdAndExcluidoEmIsNotNullOrderByExcluidoEmDesc(Long clinicaId);

    List<DocumentoTermo> findByClinicaIsNull();

    /** Documentos da clínica de um tipo (para inativar a versão publicada anterior e montar a vitrine). */
    List<DocumentoTermo> findByClinicaIdAndTipoDocumento(Long clinicaId, String tipoDocumento);
}