package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Clinica;
import prontto_api.domain.enums.StatusClinica;
import prontto_api.domain.Usuario;
import prontto_api.dto.CalendarioDisponibilidadeResponse;
import prontto_api.dto.ClinicaVitrineResponse;
import prontto_api.dto.EmpresaResponse;
import prontto_api.dto.ServicoResponse;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.CategoriaRepository;
import prontto_api.repository.ClinicaRepository;
import prontto_api.repository.ServicoRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClinicaService {

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    public ClinicaVitrineResponse obterVitrinePorSlug(String slug) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada para o slug informado."));

        if (clinica.getStatus() == StatusClinica.ENCERRADA) {
            throw new RegraNegocioException("Esta clínica encerrou suas atividades.");
        }

        var servicosAtivos = servicoRepository.findByClinicaIdAndAtivoTrue(clinica.getId())
                .stream()
                .map(servico -> new ServicoResponse(
                        servico.getId().toString(),
                        servico.getNome(),
                        servico.getCategoria() != null ? servico.getCategoria().getNome() : null,
                        servico.getDuracao(),
                        servico.getPreco(),
                        servico.getAtivo(),
                        servico.getDescricao(),
                        servico.getFotoServico()
                ))
                .collect(Collectors.toList());

        var categorias = categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(cat -> cat.getNome())
                .collect(Collectors.toList());

        var empresaPublica = new ClinicaVitrineResponse.EmpresaPublicaResponse(
                clinica.getSlug(),
                clinica.getNome(),
                obterIniciais(clinica.getNome()),
                clinica.getLogoClinica(),
                clinica.getImagemCapa(),
                clinica.getFavicon(),
                clinica.getSlogan(),
                clinica.getTituloPrincipal(),
                clinica.getDescricao(),
                clinica.getWhatsapp(),
                clinica.getEmailContato(),
                clinica.getInstagram(),
                clinica.getEndereco(),
                null, // termsOfUse
                null, // privacyPolicy
                null, // clinicTermsDocument
                null  // clinicTermsFileName
        );

        return new ClinicaVitrineResponse(empresaPublica, servicosAtivos, categorias);
    }

    public CalendarioDisponibilidadeResponse obterCalendarioMensal(String slug, String mes) {
        buscarClinicaPorSlugAtiva(slug);
        return new CalendarioDisponibilidadeResponse(List.of(), List.of(0));
    }

    public EmpresaResponse obterEmpresaGestora(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        return converterParaEmpresaResponse(clinica);
    }

    @Transactional
    public EmpresaResponse atualizarEmpresaGestora(Usuario gestoraAutenticada, EmpresaResponse request) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);

        if (request.email() != null && request.email().equalsIgnoreCase(gestoraAutenticada.getEmail())) {
            throw new RegraNegocioException("O e-mail de contato da clínica deve ser diferente do e-mail de acesso da gestora.");
        }

        clinica.setNome(request.name());
        clinica.setCpfCnpj(request.cpfCnpj() != null ? request.cpfCnpj().replaceAll("\\D", "") : clinica.getCpfCnpj());
        clinica.setWhatsapp(request.phone());
        clinica.setEmailContato(request.email());
        clinica.setInstagram(request.instagram());
        clinica.setEndereco(request.address());
        clinica.setSlogan(request.tagline());
        clinica.setTituloPrincipal(request.heroTitle());
        clinica.setDescricao(request.description());
        clinica.setLogoClinica(request.logoImage());
        clinica.setImagemCapa(request.heroImage());
        clinica.setFavicon(request.favicon());

        clinica = clinicaRepository.save(clinica);
        return converterParaEmpresaResponse(clinica);
    }

    @Transactional
    public void solicitarEncerramentoClinica(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        clinica.setStatus(StatusClinica.ENCERRAMENTO_SOLICITADO);
        clinicaRepository.save(clinica);
    }

    private Clinica buscarClinicaPorSlugAtiva(String slug) {
        Clinica clinica = clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada para o slug informado."));
        if (clinica.getStatus() == StatusClinica.ENCERRADA) {
            throw new RegraNegocioException("Esta clínica encerrou suas atividades.");
        }
        return clinica;
    }

    private Clinica validarClinicaGestora(Usuario gestora) {
        if (gestora.getClinica() == null) {
            throw new RecursoNaoEncontradoException("A gestora não está vinculada a nenhuma clínica.");
        }
        return gestora.getClinica();
    }

    private EmpresaResponse converterParaEmpresaResponse(Clinica clinica) {
        return new EmpresaResponse(
                clinica.getSlug(),
                clinica.getStatus().name(),
                clinica.getNome(),
                clinica.getCpfCnpj(),
                clinica.getWhatsapp(),
                clinica.getEmailContato(),
                clinica.getEndereco(),
                clinica.getDescricao(),
                clinica.getInstagram(),
                clinica.getSlogan(),
                clinica.getTituloPrincipal(),
                clinica.getLogoClinica(),
                clinica.getImagemCapa(),
                clinica.getFavicon(),
                clinica.getGestora() != null ? clinica.getGestora().getNome() : null,
                obterIniciais(clinica.getNome()),
                null,
                null,
                null,
                null
        );
    }

    private String obterIniciais(String nome) {
        if (nome == null || nome.isBlank()) return "CA";
        String[] partes = nome.trim().split("\\s+");
        if (partes.length == 1) {
            return partes[0].substring(0, Math.min(partes[0].length(), 2)).toUpperCase();
        }
        return (partes[0].substring(0, 1) + partes[partes.length - 1].substring(0, 1)).toUpperCase();
    }
}