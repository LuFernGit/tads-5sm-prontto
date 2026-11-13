package prontto_api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import prontto_api.domain.FichaAnamneseVersao;

import java.util.List;
import java.util.Optional;

public interface FichaAnamneseVersaoRepository extends JpaRepository<FichaAnamneseVersao, Long> {
    /** Versões da ficha, da mais recente para a mais antiga. */
    List<FichaAnamneseVersao> findByFichaAnamneseIdOrderByNumeroVersaoDesc(Long fichaAnamneseId);

    Optional<FichaAnamneseVersao> findTopByFichaAnamneseIdOrderByNumeroVersaoDesc(Long fichaAnamneseId);

    long countByFichaAnamneseId(Long fichaAnamneseId);
}
