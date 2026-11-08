package prontto_api.service;

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

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private HorarioRepository horarioRepository;

    @Autowired
    private FichaAnamneseRepository fichaAnamneseRepository;

    @Autowired
    private AceiteDocumentoRepository aceiteDocumentoRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    public TokenResponse autenticarGestora(LoginRequest request) {
        var authToken = new UsernamePasswordAuthenticationToken(request.email(), request.senha());
        var authentication = authenticationManager.authenticate(authToken);
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (usuario.getTipo() != TipoUsuario.GESTORA) {
            throw new AccessDeniedException("Perfil não autorizado para acesso à área de gestora.");
        }

        String token = tokenService.gerarToken(usuario);
        return new TokenResponse(token, montarUsuarioSessao(usuario));
    }

    public TokenResponse autenticarCliente(String slug, LoginRequest request) {
        Clinica clinica = buscarClinicaPorSlug(slug);

        var authToken = new UsernamePasswordAuthenticationToken(request.email(), request.senha());
        var authentication = authenticationManager.authenticate(authToken);
        Usuario usuario = (Usuario) authentication.getPrincipal();

        if (usuario.getTipo() == TipoUsuario.GESTORA) {
            throw new AccessDeniedException("E-mail cadastrado como gestora. Utilize o portal da gestora.");
        }

        if (usuario.getClinica() == null || !usuario.getClinica().getId().equals(clinica.getId())) {
            throw new RegraNegocioException("Usuário não pertence à clínica informada.");
        }

        String token = tokenService.gerarToken(usuario);
        return new TokenResponse(token, montarUsuarioSessao(usuario));
    }

    @Transactional
    public TokenResponse cadastrarGestoraEClinica(CadastroClinicaRequest request) {
        if (request.gestora().email().equalsIgnoreCase(request.empresa().email())) {
            throw new RegraNegocioException("O e-mail de acesso da gestora e o e-mail de contato da clínica devem ser diferentes.");
        }

        if (usuarioRepository.findByEmail(request.gestora().email()).isPresent()) {
            throw new ConflitoException("E-mail de acesso já cadastrado no sistema.");
        }

        LocalDate dataNascimento = LocalDate.parse(request.gestora().dataNascimento());
        validarIdadeMinima(dataNascimento, 16, "A gestora deve ter no mínimo 16 anos.");

        Usuario gestora = new Usuario();
        gestora.setNome(request.gestora().nome());
        gestora.setEmail(request.gestora().email());
        gestora.setSenhaHash(passwordEncoder.encode(request.gestora().senha()));
        gestora.setDataNascimento(dataNascimento);
        gestora.setWhatsapp(request.gestora().whatsapp());
        gestora.setTipo(TipoUsuario.GESTORA);
        gestora.setStatus(StatusUsuario.ATIVO);
        gestora.setRecorrente(false);
        gestora.setSolicitouExclusao(false);

        Clinica clinica = new Clinica();
        clinica.setNome(request.empresa().name());
        clinica.setSlug(gerarSlug(request.empresa().name()));
        clinica.setCpfCnpj(request.empresa().cpfCnpj().replaceAll("\\D", ""));
        clinica.setWhatsapp(request.empresa().phone());
        clinica.setEmailContato(request.empresa().email());
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

        gestora.setClinica(clinica);
        gestora = usuarioRepository.save(gestora);

        if (request.categorias() != null) {
            for (String nomeCat : request.categorias()) {
                Categoria cat = new Categoria();
                cat.setClinica(clinica);
                cat.setNome(nomeCat);
                categoriaRepository.save(cat);
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

        String token = tokenService.gerarToken(gestora);
        return new TokenResponse(token, montarUsuarioSessao(gestora));
    }

    @Transactional
    public TokenResponse cadastrarCliente(String slug, CadastroClienteRequest request) {
        Clinica clinica = buscarClinicaPorSlug(slug);

        if (usuarioRepository.findByEmail(request.usuario().email()).isPresent()) {
            throw new ConflitoException("E-mail já cadastrado no sistema.");
        }

        LocalDate dataNascimento = LocalDate.parse(request.usuario().data_nascimento());
        validarIdadeMinima(dataNascimento, 15, "A cliente deve ter no mínimo 15 anos.");

        Usuario cliente = new Usuario();
        cliente.setClinica(clinica);
        cliente.setNome(request.usuario().nome());
        cliente.setEmail(request.usuario().email());
        cliente.setSenhaHash(passwordEncoder.encode(request.usuario().senha()));
        cliente.setDataNascimento(dataNascimento);
        cliente.setWhatsapp(request.usuario().whatsapp());
        cliente.setTipo(TipoUsuario.CLIENTE);
        cliente.setStatus(StatusUsuario.ATIVO);
        cliente.setRecorrente(request.usuario().recorrente() != null ? request.usuario().recorrente() : false);
        cliente.setSolicitouExclusao(false);

        cliente = usuarioRepository.save(cliente);

        if (request.ficha() != null) {
            FichaAnamnese ficha = new FichaAnamnese();
            ficha.setCliente(cliente);
            ficha.setAlergias(request.ficha().alergias());
            ficha.setObservacoesMedicas(request.ficha().observacoes_medicas());
            ficha.setRespostas(request.ficha().respostas().toString());
            ficha.setAtualizadaEm(LocalDateTime.now());
            fichaAnamneseRepository.save(ficha);
        }

        if (request.aceite() != null) {
            AceiteDocumento aceite = new AceiteDocumento();
            aceite.setUsuario(cliente);
            aceite.setDataHoraAceite(LocalDateTime.now());
            aceiteDocumentoRepository.save(aceite);
        }

        String token = tokenService.gerarToken(cliente);
        return new TokenResponse(token, montarUsuarioSessao(cliente));
    }

    public UsuarioSessaoResponse obterSessaoAtual(Usuario usuarioAutenticado) {
        return montarUsuarioSessao(usuarioAutenticado);
    }

    public Usuario buscarUsuarioPorEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
    }

    private Clinica buscarClinicaPorSlug(String slug) {
        return clinicaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada para o slug informado."));
    }

    private UsuarioSessaoResponse montarUsuarioSessao(Usuario usuario) {
        return new UsuarioSessaoResponse(
                usuario.getId().toString(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTipo().name(),
                usuario.getClinica() != null ? usuario.getClinica().getSlug() : null
        );
    }

    private void validarIdadeMinima(LocalDate dataNascimento, int idadeMinima, String mensagemErro) {
        if (dataNascimento == null || Period.between(dataNascimento, LocalDate.now()).getYears() < idadeMinima) {
            throw new RegraNegocioException(mensagemErro);
        }
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

    public void recuperarSenha(String email) {
        usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("E-mail não encontrado no sistema."));
    }
}