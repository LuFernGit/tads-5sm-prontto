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

import java.util.List;
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
        categoriaRepository.save(novaCategoria);

        return listarCategorias(gestoraAutenticada);
    }

    @Transactional
    public List<String> deletarCategoria(Usuario gestoraAutenticada, String nomeCategoria) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        Categoria categoria = categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .filter(c -> c.getNome().equalsIgnoreCase(nomeCategoria))
                .findFirst()
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria '" + nomeCategoria + "' não encontrada."));

        boolean possuiServicos = servicoRepository.findByClinicaId(clinica.getId())
                .stream()
                .anyMatch(s -> s.getCategoria() != null && s.getCategoria().getId().equals(categoria.getId()));

        if (possuiServicos) {
            throw new ConflitoException("Não é possível excluir a categoria '" + nomeCategoria + "' pois ela possui serviços associados.");
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

    private Clinica validarClinicaGestora(Usuario gestora) {
        if (gestora.getClinica() == null) {
            throw new RecursoNaoEncontradoException("A gestora não está vinculada a nenhuma clínica.");
        }
        return gestora.getClinica();
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