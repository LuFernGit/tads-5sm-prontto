package prontto_api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.*;
import prontto_api.dto.*;
import prontto_api.infra.exceptions.ConflitoException;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.infra.security.TokenService;
import prontto_api.repository.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Period;
import java.util.List;

@Service
public class AuthService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private HorarioRepository horarioRepository;
    @Autowired private FichaAnamneseRepository fichaAnamneseRepository;
    @Autowired private DocumentoTermoRepository documentoTermoRepository;
    @Autowired private AceiteDocumentoRepository aceiteDocumentoRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private ModeloMensagemRepository modeloMensagemRepository;
    @Autowired private TokenService tokenService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private ObjectMapper objectMapper;

    public TokenResponse autenticarGestora(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        var authToken = new UsernamePasswordAuthenticationToken(email, request.senha());
        var authentication = authenticationManager.authenticate(authToken);
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (usuario.getTipo() != TipoUsuario.GESTORA) {
            registrarAuditoria(usuario, "LOGIN_FALHA");
            throw new AccessDeniedException("Perfil não autorizado para acesso à área de gestora.");
        }

        registrarAuditoria(usuario, "LOGIN");
        String token = tokenService.gerarToken(usuario);
        return new TokenResponse(token, montarUsuarioSessao(usuario));
    }

    public TokenResponse autenticarCliente(String slug, LoginRequest request) {
        Clinica clinica = buscarClinicaPorSlug(slug);
        String email = request.email().trim().toLowerCase();

        var authToken = new UsernamePasswordAuthenticationToken(email, request.senha());
        var authentication = authenticationManager.authenticate(authToken);
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (usuario.getTipo() == TipoUsuario.GESTORA) {
            registrarAuditoria(usuario, "LOGIN_FALHA");
            throw new AccessDeniedException("E-mail cadastrado como gestora. Utilize o portal da gestora.");
        }

        if (usuario.getClinica() == null || !usuario.getClinica().getId().equals(clinica.getId())) {
            registrarAuditoria(usuario, "LOGIN_FALHA");
            throw new RegraNegocioException("Usuário não pertence à clínica informada.");
        }

        registrarAuditoria(usuario, "LOGIN");
        String token = tokenService.gerarToken(usuario);
        return new TokenResponse(token, montarUsuarioSessao(usuario, clinica.getSlug()));
    }

    @Transactional
    public TokenResponse cadastrarGestoraEClinica(CadastroClinicaRequest request) {
        String emailGestora = request.gestora().email().trim().toLowerCase();
        String emailEmpresa = request.empresa().email().trim().toLowerCase();

        if (emailGestora.equalsIgnoreCase(emailEmpresa)) {
            throw new RegraNegocioException("O e-mail de acesso da gestora e o e-mail de contato da clínica devem ser diferentes.");
        }

        if (usuarioRepository.findByEmail(emailGestora).isPresent()) {
            throw new ConflitoException("E-mail de acesso já cadastrado no sistema.");
        }

        String rawDoc = request.empresa().cpfCnpj() != null ? request.empresa().cpfCnpj().replaceAll("\\D", "") : "";
        if (rawDoc.length() != 11 && rawDoc.length() != 14) {
            throw new RegraNegocioException("CPF ou CNPJ inválido. Digite 11 dígitos para CPF ou 14 para CNPJ.");
        }

        LocalDate dataNascimento = LocalDate.parse(request.gestora().dataNascimento());
        validarIdadeMinima(dataNascimento, 16, "A gestora deve ter no mínimo 16 anos.");

        // Regra do Schema V2: Gestora DEVE possuir id_clinica = NULL
        Usuario gestora = new Usuario();
        gestora.setNome(request.gestora().nome().trim());
        gestora.setEmail(emailGestora);
        gestora.setSenha(passwordEncoder.encode(request.gestora().senha()));
        gestora.setDataNascimento(dataNascimento);
        gestora.setWhatsapp(request.gestora().whatsapp().replaceAll("\\D", ""));
        gestora.setTipo(TipoUsuario.GESTORA);
        gestora.setStatus(StatusUsuario.ATIVO);
        gestora.setRecorrente(false);
        gestora.setSolicitouExclusao(false);
        gestora.setClinica(null);
        gestora = usuarioRepository.save(gestora);

        Clinica clinica = new Clinica();
        clinica.setNome(request.empresa().name().trim());
        clinica.setSlug(gerarSlug(request.empresa().name()));
        clinica.setCpfCnpj(rawDoc);
        clinica.setWhatsapp(request.empresa().phone());
        clinica.setEmailContato(emailEmpresa);
        clinica.setInstagram(request.empresa().instagram());
        clinica.setEndereco(request.empresa().address());
        clinica.setSlogan(request.empresa().tagline());
        clinica.setTituloPrincipal(request.empresa().heroTitle());
        clinica.setDescricao(request.empresa().description());
        clinica.setLogoClinica(request.empresa().logoImage());
        clinica.setImagemCapa(request.empresa().heroImage());
        clinica.setStatus(StatusClinica.ATIVA);
        clinica.setGestora(gestora);
        clinica = clinicaRepository.save(clinica);

        // Modelos de mensagem padrão (confirmação, cancelamento, lembrete...):
        // criados uma única vez, aqui no cadastro da clínica.
        modeloMensagemRepository.saveAll(GestoraAdminService.modelosPadraoFaltantes(clinica, List.of()));

        if (request.categorias() != null) {
            for (String nomeCat : request.categorias()) {
                Categoria cat = new Categoria();
                cat.setClinica(clinica);
                cat.setNome(nomeCat.trim());
                categoriaRepository.save(cat);
            }
        }

        final Clinica clinicaSalva = clinica;

        if (request.servicos() != null) {
            for (var servReq : request.servicos()) {
                Categoria cat = categoriaRepository.findByClinicaIdAndNome(clinicaSalva.getId(), servReq.category())
                        .orElseGet(() -> {
                            Categoria c = new Categoria();
                            c.setClinica(clinicaSalva);
                            c.setNome(servReq.category());
                            return categoriaRepository.save(c);
                        });
                Servico serv = new Servico();
                serv.setClinica(clinicaSalva);
                serv.setCategoria(cat);
                serv.setNome(servReq.name());
                serv.setDescricao(servReq.description() != null ? servReq.description() : "");
                serv.setPreco(servReq.price());
                serv.setDuracao(servReq.duration());
                serv.setAtivo(true);
                serv.setFotoServico(servReq.image());
                servicoRepository.save(serv);
            }
        }

        for (DiaSemana dia : DiaSemana.values()) {
            if (dia != DiaSemana.DOMINGO) {
                Horario horario = new Horario();
                horario.setClinica(clinica);
                horario.setDiaSemana(dia);
                horario.setHoraInicio(LocalTime.of(9, 0));
                horario.setHoraFim(LocalTime.of(18, 0));
                horario.setAtivo(true);
                horarioRepository.save(horario);
            }
        }

        List<DocumentoTermo> termosPlataforma = documentoTermoRepository.findByClinicaIsNull();
        for (DocumentoTermo termo : termosPlataforma) {
            AceiteDocumento aceite = new AceiteDocumento();
            aceite.setUsuario(gestora);
            aceite.setDocumento(termo);
            aceite.setPapelNoAceite("GESTORA");
            aceite.setDataHoraAceite(LocalDateTime.now());
            aceite.setIpOrigem("127.0.0.1");
            aceiteDocumentoRepository.save(aceite);
        }

        registrarAuditoria(gestora, "CADASTRO_EMPRESA");

        String token = tokenService.gerarToken(gestora);
        return new TokenResponse(token, montarUsuarioSessao(gestora, clinica.getSlug()));
    }

    @Transactional
    public TokenResponse cadastrarCliente(String slug, CadastroClienteRequest request) {
        Clinica clinica = buscarClinicaPorSlug(slug);
        String email = request.usuario().email().trim().toLowerCase();

        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new ConflitoException("E-mail já cadastrado no sistema.");
        }

        LocalDate dataNascimento = LocalDate.parse(request.usuario().data_nascimento());
        validarIdadeMinima(dataNascimento, 15, "A cliente deve ter no mínimo 15 anos.");

        Usuario cliente = new Usuario();
        cliente.setClinica(clinica);
        cliente.setNome(request.usuario().nome().trim());
        cliente.setEmail(email);
        cliente.setSenha(passwordEncoder.encode(request.usuario().senha()));
        cliente.setDataNascimento(dataNascimento);
        cliente.setWhatsapp(request.usuario().whatsapp().replaceAll("\\D", ""));
        cliente.setTipo(TipoUsuario.CLIENTE);
        cliente.setStatus(StatusUsuario.ATIVO);
        cliente.setRecorrente(request.usuario().recorrente() != null ? request.usuario().recorrente() : false);
        cliente.setSolicitouExclusao(false);
        cliente = usuarioRepository.save(cliente);

        if (request.ficha() != null) {
            FichaAnamnese ficha = new FichaAnamnese();
            ficha.setCliente(cliente);
            ficha.setAlergias(request.ficha().alergias() != null ? request.ficha().alergias() : "Nenhuma");
            ficha.setObservacoesMedicas(request.ficha().observacoes_medicas() != null ? request.ficha().observacoes_medicas() : "Nenhuma");
            try {
                ficha.setRespostas(objectMapper.writeValueAsString(request.ficha().respostas()));
            } catch (Exception e) {
                ficha.setRespostas("{}");
            }
            ficha.setDataAtualizacao(LocalDateTime.now());
            fichaAnamneseRepository.save(ficha);
        }

        List<DocumentoTermo> termosPlataforma = documentoTermoRepository.findByClinicaIsNull();
        for (DocumentoTermo termo : termosPlataforma) {
            AceiteDocumento aceite = new AceiteDocumento();
            aceite.setUsuario(cliente);
            aceite.setDocumento(termo);
            aceite.setPapelNoAceite("CLIENTE");
            aceite.setDataHoraAceite(LocalDateTime.now());
            aceite.setIpOrigem("127.0.0.1");
            aceiteDocumentoRepository.save(aceite);
        }

        registrarAuditoria(cliente, "CADASTRO_CLIENTE");

        String token = tokenService.gerarToken(cliente);
        return new TokenResponse(token, montarUsuarioSessao(cliente, clinica.getSlug()));
    }

    public UsuarioSessaoResponse obterSessaoAtual(Usuario usuarioAutenticado) {
        String slug = null;
        if (usuarioAutenticado.getTipo() == TipoUsuario.CLIENTE && usuarioAutenticado.getClinica() != null) {
            slug = usuarioAutenticado.getClinica().getSlug();
        } else if (usuarioAutenticado.getTipo() == TipoUsuario.GESTORA) {
            slug = clinicaRepository.findByGestoraId(usuarioAutenticado.getId())
                    .map(Clinica::getSlug)
                    .orElse(null);
        }
        return montarUsuarioSessao(usuarioAutenticado, slug);
    }

    public void recuperarSenha(String email) {
        usuarioRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RecursoNaoEncontradoException("E-mail não encontrado no sistema."));
    }

    private Clinica buscarClinicaPorSlug(String slug) {
        return clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada para o slug informado."));
    }

    private UsuarioSessaoResponse montarUsuarioSessao(Usuario usuario) {
        String slug = null;
        if (usuario.getClinica() != null) {
            slug = usuario.getClinica().getSlug();
        } else {
            slug = clinicaRepository.findByGestoraId(usuario.getId()).map(Clinica::getSlug).orElse(null);
        }
        return montarUsuarioSessao(usuario, slug);
    }

    private UsuarioSessaoResponse montarUsuarioSessao(Usuario usuario, String slug) {
        return new UsuarioSessaoResponse(
                usuario.getId().toString(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTipo().name(),
                slug
        );
    }

    private void validarIdadeMinima(LocalDate dataNascimento, int idadeMinima, String mensagemErro) {
        if (dataNascimento == null || Period.between(dataNascimento, LocalDate.now()).getYears() < idadeMinima) {
            throw new RegraNegocioException(mensagemErro);
        }
    }

    private void registrarAuditoria(Usuario usuario, String acao) {
        LogAuditoria log = new LogAuditoria();
        log.setUsuario(usuario);
        log.setAcao(acao);
        log.setIpOrigem("127.0.0.1");
        log.setDataHora(LocalDateTime.now());
        logAuditoriaRepository.save(log);
    }

    private String gerarSlug(String nome) {
        if (nome == null) return "";
        return nome.toLowerCase()
                .replaceAll("[áàâãä]", "a")
                .replaceAll("[éèêë]", "e")
                .replaceAll("[íìîï]", "i")
                .replaceAll("[óòôõö]", "o")
                .replaceAll("[úùûü]", "u")
                .replaceAll("[ç]", "c")
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
    }
}
