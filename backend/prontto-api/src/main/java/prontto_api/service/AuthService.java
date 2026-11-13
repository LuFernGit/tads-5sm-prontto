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
import prontto_api.infra.web.IpOrigem;
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
import java.util.Map;

@Service
public class AuthService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private HorarioRepository horarioRepository;
    @Autowired private FichaAnamneseRepository fichaAnamneseRepository;
    @Autowired private FichaVersaoService fichaVersaoService;
    @Autowired private DocumentoTermoRepository documentoTermoRepository;
    @Autowired private AceiteDocumentoRepository aceiteDocumentoRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private ModeloMensagemRepository modeloMensagemRepository;

    /** Cria um documento publicado da clínica, se houver texto ou arquivo. */
    private void criarDocumentoClinica(Clinica clinica, String titulo, String tipo,
                                       String conteudo, String arquivo, String nomeArquivo) {
        boolean temTexto = conteudo != null && !conteudo.isBlank();
        boolean temArquivo = arquivo != null && !arquivo.isBlank();
        if (!temTexto && !temArquivo) return;
        DocumentoTermo doc = new DocumentoTermo();
        doc.setClinica(clinica);
        doc.setTitulo(titulo.length() > 100 ? titulo.substring(0, 100) : titulo);
        doc.setTipoDocumento(tipo);
        doc.setVersao("1.0");
        doc.setConteudo(temTexto ? conteudo.trim() : null);
        doc.setCaminhoArquivo(temArquivo ? arquivo : null);
        doc.setNomeArquivo(temArquivo ? (nomeArquivo != null ? nomeArquivo : "termo.pdf") : null);
        doc.setStatus("PUBLICADO");
        doc.setDataPublicacao(LocalDateTime.now());
        documentoTermoRepository.save(doc);
    }
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
            throw new ConflitoException("Este e-mail já está cadastrado. Entre com sua senha ou use outro e-mail.");
        }
        String whatsGestora = request.gestora().whatsapp() != null ? request.gestora().whatsapp().replaceAll("\\D", "") : "";
        if (!whatsGestora.isEmpty() && usuarioRepository.existsByWhatsapp(whatsGestora)) {
            throw new ConflitoException("Este WhatsApp já está cadastrado em outra conta. Use outro número ou entre na sua conta.");
        }

        String rawDoc = request.empresa().cpfCnpj() != null ? request.empresa().cpfCnpj().replaceAll("\\D", "") : "";
        if (rawDoc.length() != 11 && rawDoc.length() != 14) {
            throw new RegraNegocioException("CPF ou CNPJ inválido. Digite 11 dígitos para CPF ou 14 para CNPJ.");
        }
        if (clinicaRepository.existsByCpfCnpj(rawDoc)) {
            throw new ConflitoException("Este CPF/CNPJ já está cadastrado em outra clínica. Confira o número digitado.");
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
        // O cadastro manda o endereço montado em um texto ("Rua, nº · Bairro,
        // Cidade — UF · CEP ..."): grava também as partes (CEP, rua, número...).
        EnderecoParser.Partes partes = EnderecoParser.separar(request.empresa().address());
        if (partes != null) {
            clinica.setCep(partes.cep());
            clinica.setLogradouro(partes.logradouro());
            clinica.setNumero(partes.numero());
            clinica.setComplemento(partes.complemento());
            clinica.setBairro(partes.bairro());
            clinica.setCidade(partes.cidade());
            clinica.setUf(partes.uf());
        }
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
            var capas = request.capasCategorias() != null ? request.capasCategorias() : Map.<String, String>of();
            for (String nomeCat : request.categorias()) {
                Categoria cat = new Categoria();
                cat.setClinica(clinica);
                cat.setNome(nomeCat.trim());
                // Foto de capa escolhida no cadastro (obrigatória para cada categoria).
                cat.setCapa(CatalogoService.capaObrigatoria(capas.get(nomeCat), nomeCat.trim()));
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

        // Termos da clínica enviados no cadastro: viram documentos PUBLICADOS
        // (versão 1.0), editáveis depois em "Documentos e termos".
        criarDocumentoClinica(clinica, "Termos de uso — " + clinica.getNome(), "TERMOS_USO",
                request.empresa().termsOfUse(), null, null);
        criarDocumentoClinica(clinica, "Política de privacidade — " + clinica.getNome(), "POLITICA_PRIVACIDADE",
                request.empresa().privacyPolicy(), null, null);
        criarDocumentoClinica(clinica, "Termo de consentimento — " + clinica.getNome(), "TERMO_CLINICA",
                null, request.empresa().clinicTermsDocument(), request.empresa().clinicTermsFileName());

        List<DocumentoTermo> termosPlataforma = documentoTermoRepository.findByClinicaIsNull();
        for (DocumentoTermo termo : termosPlataforma) {
            AceiteDocumento aceite = new AceiteDocumento();
            aceite.setUsuario(gestora);
            aceite.setDocumento(termo);
            aceite.setPapelNoAceite("GESTORA");
            aceite.setDataHoraAceite(LocalDateTime.now());
            aceite.setIpOrigem(IpOrigem.atual());
            aceiteDocumentoRepository.save(aceite);
        }

        registrarAuditoria(gestora, "CADASTRO_EMPRESA");

        String token = tokenService.gerarToken(gestora);
        return new TokenResponse(token, montarUsuarioSessao(gestora, clinica.getSlug()));
    }

    /**
     * Diz se e-mail, WhatsApp e CPF/CNPJ já estão em uso. Usado pelos cadastros
     * (empresa e cliente) para avisar na etapa certa, antes de chegar aos Termos.
     */
    public java.util.Map<String, Boolean> verificarDisponibilidade(String email, String whatsapp, String cpfCnpj) {
        var r = new java.util.LinkedHashMap<String, Boolean>();
        if (email != null && !email.isBlank()) {
            r.put("emailEmUso", usuarioRepository.existsByEmail(email.trim().toLowerCase()));
        }
        if (whatsapp != null && !whatsapp.isBlank()) {
            r.put("whatsappEmUso", usuarioRepository.existsByWhatsapp(whatsapp.replaceAll("\\D", "")));
        }
        if (cpfCnpj != null && !cpfCnpj.isBlank()) {
            r.put("cpfCnpjEmUso", clinicaRepository.existsByCpfCnpj(cpfCnpj.replaceAll("\\D", "")));
        }
        return r;
    }

    @Transactional
    public TokenResponse cadastrarCliente(String slug, CadastroClienteRequest request) {
        Clinica clinica = buscarClinicaPorSlug(slug);
        String email = request.usuario().email().trim().toLowerCase();

        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new ConflitoException("Este e-mail já está cadastrado. Entre com sua senha ou use outro e-mail.");
        }
        String whatsCliente = request.usuario().whatsapp() != null ? request.usuario().whatsapp().replaceAll("\\D", "") : "";
        if (usuarioRepository.existsByWhatsapp(whatsCliente)) {
            throw new ConflitoException("Este WhatsApp já está cadastrado em outra conta. Use outro número ou entre na sua conta.");
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
        // Conta nova NUNCA nasce recorrente (o valor enviado pelo front é ignorado):
        // a cliente vira recorrente sozinha depois do 1º atendimento CONCLUÍDO
        // (AgendamentoAutoCancelamentoJob.concluirAtendimentosRealizados).
        cliente.setRecorrente(false);
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
            ficha = fichaAnamneseRepository.save(ficha);
            // Versão 1 da ficha (a do cadastro) no histórico por versões.
            fichaVersaoService.registrarVersao(ficha);
        }

        List<DocumentoTermo> termosPlataforma = documentoTermoRepository.findByClinicaIsNull();
        for (DocumentoTermo termo : termosPlataforma) {
            AceiteDocumento aceite = new AceiteDocumento();
            aceite.setUsuario(cliente);
            aceite.setDocumento(termo);
            aceite.setPapelNoAceite("CLIENTE");
            aceite.setDataHoraAceite(LocalDateTime.now());
            aceite.setIpOrigem(IpOrigem.atual());
            aceiteDocumentoRepository.save(aceite);
        }

        registrarAuditoria(cliente, "CADASTRO_CLIENTE");

        String token = tokenService.gerarToken(cliente);
        return new TokenResponse(token, montarUsuarioSessao(cliente, clinica.getSlug()));
    }

    /**
     * GET /auth/me (restaurar a sessão ao recarregar a página).
     * O usuário que chega aqui vem do filtro do JWT, FORA de uma transação: ler
     * usuario.getClinica().getSlug() nele (clinica é LAZY) lançava
     * LazyInitializationException → 400 → o front apagava o token e a CLIENTE
     * "saía" a cada recarregamento. Por isso o usuário é recarregado aqui,
     * dentro de uma transação de leitura.
     */
    @Transactional(readOnly = true)
    public UsuarioSessaoResponse obterSessaoAtual(Usuario usuarioAutenticado) {
        Usuario usuario = usuarioRepository.findById(usuarioAutenticado.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        String slug = null;
        if (usuario.getTipo() == TipoUsuario.CLIENTE && usuario.getClinica() != null) {
            slug = usuario.getClinica().getSlug();
        } else if (usuario.getTipo() == TipoUsuario.GESTORA) {
            slug = clinicaRepository.findByGestoraId(usuario.getId())
                    .map(Clinica::getSlug)
                    .orElse(null);
        }
        return montarUsuarioSessao(usuario, slug);
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
        log.setIpOrigem(IpOrigem.atual());
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
