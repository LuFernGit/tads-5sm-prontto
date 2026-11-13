package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Categoria;
import prontto_api.domain.Clinica;
import prontto_api.domain.Servico;
import prontto_api.domain.Usuario;
import prontto_api.dto.CategoriaRequest;
import prontto_api.dto.ServicoRequest;
import prontto_api.dto.ServicoResponse;
import prontto_api.dto.StatusServicoPatchRequest;
import prontto_api.infra.exceptions.ConflitoException;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.CategoriaRepository;
import prontto_api.repository.ClinicaRepository;
import prontto_api.repository.ServicoRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CatalogoService {

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    public List<String> listarCategorias(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(Categoria::getNome)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<String> criarCategoria(Usuario gestoraAutenticada, CategoriaRequest request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        if (request == null || request.nome() == null || request.nome().isBlank()) {
            throw new RegraNegocioException("O nome da categoria é obrigatório.");
        }

        String nomeCategoria = request.nome().trim();

        boolean existe = categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .anyMatch(c -> c.getNome().equalsIgnoreCase(nomeCategoria));

        if (existe) {
            throw new ConflitoException("Categoria '" + nomeCategoria + "' já existe nesta clínica.");
        }

        Categoria novaCategoria = new Categoria();
        novaCategoria.setClinica(clinica);
        novaCategoria.setNome(nomeCategoria);
        novaCategoria.setCapa(capaObrigatoria(request.capa(), nomeCategoria));
        categoriaRepository.save(novaCategoria);

        return listarCategorias(gestoraAutenticada);
    }

    /** { nome da categoria: capa } só das categorias com foto de capa própria. */
    public Map<String, String> listarCapasCategorias(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return capasDaClinica(categoriaRepository.findByClinicaId(clinica.getId()));
    }

    /**
     * Troca a foto de capa da categoria (obrigatória: não dá para deixar a
     * categoria sem foto). Devolve o mapa de capas atualizado.
     */
    @Transactional
    public Map<String, String> atualizarCapaCategoria(Usuario gestoraAutenticada, String nomeCategoria, String capa) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Categoria categoria = buscarCategoriaDaClinica(clinica, nomeCategoria);

        categoria.setCapa(capaObrigatoria(capa, nomeCategoria));
        categoriaRepository.save(categoria);
        return listarCapasCategorias(gestoraAutenticada);
    }

    /** Monta { nome: capa } (na ordem das categorias), ignorando as sem capa. */
    public static Map<String, String> capasDaClinica(List<Categoria> categorias) {
        Map<String, String> capas = new LinkedHashMap<>();
        for (Categoria c : categorias) {
            if (c.getCapa() != null && !c.getCapa().isBlank()) {
                capas.put(c.getNome(), c.getCapa());
            }
        }
        return capas;
    }

    /**
     * Foto de capa obrigatória: precisa vir preenchida e ser imagem em data URL.
     * nomeCategoria entra na mensagem de erro (ex.: cadastro com várias categorias).
     */
    public static String capaObrigatoria(String capa, String nomeCategoria) {
        if (capa == null || capa.isBlank()) {
            throw new RegraNegocioException("Escolha a foto de capa da categoria '" + nomeCategoria + "'.");
        }
        if (!capa.startsWith("data:image/")) {
            throw new RegraNegocioException("A foto de capa precisa ser uma imagem JPG, PNG ou WEBP.");
        }
        return capa;
    }

    @Transactional
    public List<String> deletarCategoria(Usuario gestoraAutenticada, String nomeCategoria) {
        return deletarCategoria(gestoraAutenticada, nomeCategoria, null);
    }

    /**
     * Exclui a categoria. Serviços não podem ficar sem categoria (FK obrigatória)
     * e não podem ser apagados (guardam o histórico de agendamentos). Por isso,
     * se a categoria tiver serviços, eles são MOVIDOS para "moverPara" antes.
     */
    @org.springframework.transaction.annotation.Transactional
    public List<String> deletarCategoria(Usuario gestoraAutenticada, String nomeCategoria, String moverPara) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Categoria categoria = buscarCategoriaDaClinica(clinica, nomeCategoria);

        var servicosDaCategoria = servicoRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(s -> s.getCategoria() != null && s.getCategoria().getId().equals(categoria.getId()))
                .toList();

        if (!servicosDaCategoria.isEmpty()) {
            if (moverPara == null || moverPara.isBlank()) {
                throw new ConflitoException("A categoria '" + nomeCategoria + "' tem " + servicosDaCategoria.size()
                        + " serviço(s). Escolha para qual categoria eles devem ser movidos.");
            }
            Categoria destino = categoriaRepository.findByClinicaId(clinica.getId())
                    .stream()
                    .filter(c -> c.getNome().equalsIgnoreCase(moverPara.trim()))
                    .findFirst()
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria de destino '" + moverPara + "' não encontrada."));
            if (destino.getId().equals(categoria.getId())) {
                throw new prontto_api.infra.exceptions.RegraNegocioException("Escolha uma categoria diferente da que será excluída.");
            }
            for (var servico : servicosDaCategoria) {
                servico.setCategoria(destino);
                servicoRepository.save(servico);
            }
        }

        categoriaRepository.delete(categoria);
        return listarCategorias(gestoraAutenticada);
    }

    public List<ServicoResponse> listarServicos(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return servicoRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(this::converterParaResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ServicoResponse criarServico(Usuario gestoraAutenticada, ServicoRequest request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Categoria categoria = buscarOuCriarCategoria(clinica, request.category());

        Servico servico = new Servico();
        servico.setClinica(clinica);
        servico.setCategoria(categoria);
        servico.setNome(request.name());
        servico.setDescricao(request.description());
        servico.setPreco(request.price());
        servico.setDuracao(request.duration());
        servico.setAtivo(true);
        servico.setFotoServico(request.image());

        servico = servicoRepository.save(servico);
        return converterParaResponse(servico);
    }

    @Transactional
    public ServicoResponse atualizarServico(Usuario gestoraAutenticada, Long idServico, ServicoRequest request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Servico servico = buscarServicoDaClinica(idServico, clinica.getId());
        Categoria categoria = buscarOuCriarCategoria(clinica, request.category());

        servico.setCategoria(categoria);
        servico.setNome(request.name());
        servico.setDescricao(request.description());
        servico.setPreco(request.price());
        servico.setDuracao(request.duration());
        if (request.image() != null) {
            servico.setFotoServico(request.image());
        }

        servico = servicoRepository.save(servico);
        return converterParaResponse(servico);
    }

    @Transactional
    public ServicoResponse alterarStatusServico(Usuario gestoraAutenticada, Long idServico, StatusServicoPatchRequest request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        Servico servico = buscarServicoDaClinica(idServico, clinica.getId());

        if (request != null && request.active() != null) {
            servico.setAtivo(request.active());
        }

        servico = servicoRepository.save(servico);
        return converterParaResponse(servico);
    }

    /**
     * Clínica da gestora logada. A gestora NÃO tem USUARIO.id_clinica (a regra
     * chk_usuario_clinica do banco exige NULL para GESTORA): quem aponta para ela
     * é CLINICA.id_gestora. Por isso a busca é por findByGestoraId, igual aos
     * outros serviços (HorarioService, ClinicaService, AgendamentoService).
     */
    private Clinica validarClinicaGestora(Usuario gestora) {
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "A gestora não está vinculada a nenhuma clínica."));
    }

    /** Categoria da clínica pelo nome (sem diferenciar maiúsculas); 404 se não existir. */
    private Categoria buscarCategoriaDaClinica(Clinica clinica, String nomeCategoria) {
        return categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(c -> c.getNome().equalsIgnoreCase(nomeCategoria))
                .findFirst()
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria '" + nomeCategoria + "' não encontrada."));
    }

    private Servico buscarServicoDaClinica(Long idServico, Long idClinica) {
        Servico servico = servicoRepository.findById(idServico)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado com o ID: " + idServico));

        if (!servico.getClinica().getId().equals(idClinica)) {
            throw new RegraNegocioException("O serviço informado não pertence à clínica da gestora.");
        }
        return servico;
    }

    private Categoria buscarOuCriarCategoria(Clinica clinica, String nomeCategoria) {
        if (nomeCategoria == null || nomeCategoria.isBlank()) {
            throw new RegraNegocioException("A categoria do serviço é obrigatória.");
        }

        String nomeTratado = nomeCategoria.trim();
        return categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(c -> c.getNome().equalsIgnoreCase(nomeTratado))
                .findFirst()
                .orElseGet(() -> {
                    Categoria nova = new Categoria();
                    nova.setClinica(clinica);
                    nova.setNome(nomeTratado);
                    return categoriaRepository.save(nova);
                });
    }

    private ServicoResponse converterParaResponse(Servico servico) {
        return new ServicoResponse(
                servico.getId().toString(),
                servico.getNome(),
                servico.getCategoria() != null ? servico.getCategoria().getNome() : null,
                servico.getDuracao(),
                servico.getPreco(),
                servico.getAtivo(),
                servico.getDescricao(),
                servico.getFotoServico()
        );
    }
}