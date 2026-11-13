package prontto_api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.FichaAnamnese;
import prontto_api.domain.FichaAnamneseVersao;
import prontto_api.dto.FichaVersaoDto;
import prontto_api.repository.FichaAnamneseVersaoRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Histórico da ficha de saúde por VERSÕES COMPLETAS: cada salvamento da
 * cliente gera uma cópia inteira da ficha (FICHA_ANAMNESE_VERSAO). As versões
 * anteriores nunca são sobrescritas.
 */
@Service
public class FichaVersaoService {

    @Autowired private FichaAnamneseVersaoRepository versaoRepository;
    @Autowired private ObjectMapper objectMapper;

    /** Guarda o estado atual (já salvo) da ficha como a próxima versão. */
    @Transactional
    public FichaAnamneseVersao registrarVersao(FichaAnamnese ficha) {
        int proxima = versaoRepository.findTopByFichaAnamneseIdOrderByNumeroVersaoDesc(ficha.getId())
                .map(v -> v.getNumeroVersao() + 1)
                .orElse(1);
        FichaAnamneseVersao v = new FichaAnamneseVersao();
        v.setFichaAnamnese(ficha);
        v.setNumeroVersao(proxima);
        v.setAlergias(ficha.getAlergias());
        v.setObservacoesMedicas(ficha.getObservacoesMedicas());
        v.setRespostas(ficha.getRespostas());
        v.setCriadaEm(ficha.getDataAtualizacao());
        return versaoRepository.save(v);
    }

    /**
     * Ficha antiga sem nenhuma versão (criada antes deste histórico): guarda o
     * estado atual como versão 1 antes de qualquer alteração, para não perdê-lo.
     */
    @Transactional
    public void garantirVersaoInicial(FichaAnamnese ficha) {
        if (ficha.getId() != null && versaoRepository.countByFichaAnamneseId(ficha.getId()) == 0) {
            registrarVersao(ficha);
        }
    }

    /** true se o conteúdo novo é igual ao atual (salvar sem mudar nada não gera versão). */
    public boolean mesmoConteudo(FichaAnamnese ficha, String alergias, String observacoes, String respostasJson) {
        return Objects.equals(ficha.getAlergias(), alergias)
                && Objects.equals(ficha.getObservacoesMedicas(), observacoes)
                && Objects.equals(lerJson(ficha.getRespostas()), lerJson(respostasJson));
    }

    /** Versões completas, da mais recente (a atual) para a mais antiga. */
    public List<FichaVersaoDto> listar(FichaAnamnese ficha) {
        List<FichaAnamneseVersao> versoes = versaoRepository.findByFichaAnamneseIdOrderByNumeroVersaoDesc(ficha.getId());
        if (versoes.isEmpty()) {
            // Ainda sem versão gravada: a ficha atual é a versão 1.
            return List.of(new FichaVersaoDto(null, 1,
                    ficha.getDataAtualizacao() != null ? ficha.getDataAtualizacao().toString() : null,
                    ficha.getAlergias(), ficha.getObservacoesMedicas(), lerJson(ficha.getRespostas()), true));
        }
        List<FichaVersaoDto> lista = new ArrayList<>();
        for (int i = 0; i < versoes.size(); i++) {
            FichaAnamneseVersao v = versoes.get(i);
            lista.add(new FichaVersaoDto(v.getId(), v.getNumeroVersao(),
                    v.getCriadaEm() != null ? v.getCriadaEm().toString() : null,
                    v.getAlergias(), v.getObservacoesMedicas(), lerJson(v.getRespostas()), i == 0));
        }
        return lista;
    }

    public long contar(FichaAnamnese ficha) {
        long total = versaoRepository.countByFichaAnamneseId(ficha.getId());
        return total == 0 ? 1 : total;
    }

    private Map<String, Object> lerJson(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
