package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Servico;
import prontto_api.domain.DocumentoTermo;
import prontto_api.domain.Clinica;
import prontto_api.domain.EnderecoParser;
import prontto_api.domain.Horario;
import prontto_api.domain.Usuario;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusClinica;
import prontto_api.dto.CalendarioDisponibilidadeResponse;
import prontto_api.dto.ClinicaVitrineResponse;
import prontto_api.dto.EmpresaResponse;
import prontto_api.dto.ServicoResponse;
import prontto_api.infra.web.IpOrigem;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.*;

import java.util.ArrayList;
import java.util.List;

@Service
public class ClinicaService {

    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private HorarioRepository horarioRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private BloqueioHorarioRepository bloqueioHorarioRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private DocumentoTermoRepository documentoTermoRepository;

    /** Versão PUBLICADA mais recente de um tipo de documento da clínica (ou null). */
    private DocumentoTermo publicado(Clinica clinica, String tipo) {
        return documentoTermoRepository.findByClinicaIdAndTipoDocumento(clinica.getId(), tipo).stream()
                .filter(d -> "PUBLICADO".equals(d.getStatus()))
                .max(java.util.Comparator.comparing(DocumentoTermo::getDataPublicacao,
                        java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .orElse(null);
    }

    private String textoPublicado(Clinica clinica, String tipo) {
        DocumentoTermo d = publicado(clinica, tipo);
        return d != null ? d.getConteudo() : null;
    }

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
                .toList();

        var categoriasDaClinica = categoriaRepository.findByClinicaId(clinica.getId());
        var categorias = categoriasDaClinica.stream()
                .map(cat -> cat.getNome())
                .toList();
        var capasCategorias = CatalogoService.capasDaClinica(categoriasDaClinica);

        var empresaPublica = new ClinicaVitrineResponse.EmpresaPublicaResponse(
                clinica.getSlug(),
                clinica.getNome(),
                iniciaisDa(clinica),
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
                textoPublicado(clinica, "TERMOS_USO"),
                textoPublicado(clinica, "POLITICA_PRIVACIDADE"),
                publicado(clinica, "TERMO_CLINICA") != null ? publicado(clinica, "TERMO_CLINICA").getCaminhoArquivo() : null,
                publicado(clinica, "TERMO_CLINICA") != null ? publicado(clinica, "TERMO_CLINICA").getNomeArquivo() : null,
                clinica.getTextoHorario(),
                clinica.getPoliticaCancelamento()
        );

        return new ClinicaVitrineResponse(empresaPublica, servicosAtivos, categorias, capasCategorias);
    }

    /** Hash dos dados públicos da vitrine (sem transferir as imagens). */
    public String obterVersaoVitrine(String slug) {
        Clinica c = buscarClinicaPorSlugAtiva(slug);
        StringBuilder sb = new StringBuilder();
        java.util.function.Consumer<Object> add = v -> sb.append(java.util.Objects.hashCode(v)).append('|');
        for (Object v : new Object[]{c.getNome(), c.getIniciais(), c.getSlogan(), c.getTituloPrincipal(),
                c.getDescricao(), c.getWhatsapp(), c.getEmailContato(), c.getInstagram(), c.getEndereco(),
                c.getLogoClinica(), c.getImagemCapa(), c.getFavicon(), c.getTextoHorario(),
                c.getPoliticaCancelamento(), c.getStatus()}) {
            add.accept(v);
        }
        servicoRepository.findByClinicaIdAndAtivoTrue(c.getId()).stream()
                .sorted(java.util.Comparator.comparing(Servico::getId))
                .forEach(s -> {
                    for (Object v : new Object[]{s.getId(), s.getNome(), s.getPreco(), s.getDuracao(),
                            s.getDescricao(), s.getFotoServico(),
                            s.getCategoria() != null ? s.getCategoria().getNome() : null}) {
                        add.accept(v);
                    }
                });
        categoriaRepository.findByClinicaId(c.getId()).forEach(cat -> {
            add.accept(cat.getNome());
            add.accept(cat.getCapa());
        });
        documentoTermoRepository.findByClinicaIdOuPlataforma(c.getId()).stream()
                .filter(d -> "PUBLICADO".equals(d.getStatus()))
                .forEach(d -> add.accept(d.getId()));
        return Integer.toHexString(sb.toString().hashCode());
    }

    public CalendarioDisponibilidadeResponse obterCalendarioMensal(String slug, String mes) {
        Clinica clinica = buscarClinicaPorSlugAtiva(slug);
        List<Horario> horarios = horarioRepository.findByClinicaId(clinica.getId());

        List<Integer> fechados = new ArrayList<>();
        for (DiaSemana dia : DiaSemana.values()) {
            boolean ativo = horarios.stream().anyMatch(h -> h.getDiaSemana() == dia && h.getAtivo());
            if (!ativo) {
                fechados.add(converterDiaSemanaParaIndice(dia));
            }
        }

        // Mês pedido ("YYYY-MM"); sem parâmetro ou inválido = mês atual.
        java.time.YearMonth anoMes;
        try {
            anoMes = mes != null && !mes.isBlank()
                    ? java.time.YearMonth.parse(mes)
                    : java.time.YearMonth.now(prontto_api.domain.RegrasAgendamento.FUSO);
        } catch (java.time.format.DateTimeParseException e) {
            throw new RegraNegocioException("Mês inválido. Use o formato AAAA-MM. Exemplo: 2026-11.");
        }
        java.time.LocalDate inicio = anoMes.atDay(1);
        java.time.LocalDate fim = anoMes.atEndOfMonth();

        var bloqueios = bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), inicio, fim);
        var agendamentos = agendamentoRepository.findByServicoClinicaIdAndDataBetween(clinica.getId(), inicio, fim)
                .stream()
                .filter(a -> a.getStatus() != prontto_api.domain.enums.StatusAgendamento.CANCELADO)
                .toList();

        List<Integer> lotados = new ArrayList<>();
        List<Integer> bloqueados = new ArrayList<>();
        DiaSemana[] diasSemana = DiaSemana.values(); // SEGUNDA … DOMINGO (mesma ordem de DayOfWeek)

        for (java.time.LocalDate dia = inicio; !dia.isAfter(fim); dia = dia.plusDays(1)) {
            final java.time.LocalDate data = dia;
            DiaSemana diaEnum = diasSemana[data.getDayOfWeek().getValue() - 1];
            if (fechados.contains(converterDiaSemanaParaIndice(diaEnum))) continue;

            var bloqueiosDoDia = bloqueios.stream().filter(b -> b.getData().equals(data)).toList();
            if (bloqueiosDoDia.stream().anyMatch(b -> b.getHoraInicio() == null)) {
                bloqueados.add(data.getDayOfMonth()); // dia inteiro bloqueado
                continue;
            }

            // Mesmos horários de 1 hora do painel da gestora: livre se não houver
            // agendamento nem bloqueio cobrindo aquele horário.
            var agendamentosDoDia = agendamentos.stream().filter(a -> a.getData().equals(data)).toList();
            boolean temHorarioLivre = false;
            for (Horario faixa : horarios) {
                if (faixa.getDiaSemana() != diaEnum || !faixa.getAtivo()) continue;
                for (java.time.LocalTime t = faixa.getHoraInicio();
                     !t.plusMinutes(60).isAfter(faixa.getHoraFim()) && !temHorarioLivre;
                     t = t.plusMinutes(60)) {
                    final java.time.LocalTime ini = t;
                    final java.time.LocalTime fimSlot = t.plusMinutes(60);
                    boolean ocupado = agendamentosDoDia.stream().anyMatch(a ->
                            a.getHora().isBefore(fimSlot)
                                    && a.getHora().plusMinutes(a.getServico().getDuracao()).isAfter(ini));
                    boolean bloqueado = bloqueiosDoDia.stream().anyMatch(b ->
                            b.getHoraInicio().isBefore(fimSlot) && b.getHoraFim().isAfter(ini));
                    if (!ocupado && !bloqueado) temHorarioLivre = true;
                }
            }
            if (!temHorarioLivre) lotados.add(data.getDayOfMonth());
        }

        return new CalendarioDisponibilidadeResponse(lotados, fechados, bloqueados);
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

        // V5: monograma, endereço em partes e textos de Configurações.
        String iniciais = request.initials() == null ? "" : request.initials().trim().toUpperCase();
        if (iniciais.length() > 3) {
            throw new RegraNegocioException("As iniciais podem ter no máximo 3 letras. Exemplo: CA.");
        }
        clinica.setIniciais(iniciais.isEmpty() ? null : iniciais);
        clinica.setCep(request.cep() != null ? request.cep().replaceAll("\\D", "") : null);
        clinica.setLogradouro(request.street());
        clinica.setNumero(request.number());
        clinica.setComplemento(request.complement());
        clinica.setBairro(request.neighborhood());
        clinica.setCidade(request.city());
        clinica.setUf(request.state() != null ? request.state().trim().toUpperCase() : null);
        clinica.setTextoHorario(request.hoursText());
        clinica.setPoliticaCancelamento(request.cancellationPolicy());

        // "Responsável" (Configurações) = nome da gestora.
        if (request.ownerName() != null && !request.ownerName().isBlank()) {
            usuarioRepository.findById(gestoraAutenticada.getId()).ifPresent(g -> {
                g.setNome(request.ownerName().trim());
                usuarioRepository.save(g);
            });
        }

        clinica = clinicaRepository.save(clinica);
        return converterParaEmpresaResponse(clinica);
    }

    @Transactional
    public void solicitarEncerramentoClinica(Usuario gestoraAutenticada) {
        Clinica clinica = validarClinicaGestora(gestoraAutenticada);
        clinica.setStatus(StatusClinica.ENCERRAMENTO_SOLICITADO);
        clinicaRepository.save(clinica);

        var log = new prontto_api.domain.LogAuditoria();
        log.setUsuario(gestoraAutenticada);
        log.setAcao("ENCERRAMENTO_CLINICA_SOLICITADO");
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);
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
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica não encontrada para a gestora logada."));
    }

    private static boolean vazio(String s) {
        return s == null || s.isBlank();
    }

    private static String primeiro(String... valores) {
        for (String v : valores) if (!vazio(v)) return v;
        return null;
    }

    /**
     * Endereço em partes. Clínicas cadastradas antes das colunas separadas (ou
     * pelo cadastro, que manda o texto montado) têm só o texto completo, às
     * vezes também gravado no logradouro. Sem número salvo, separa esse texto
     * (EnderecoParser); o que já estiver salvo em cada coluna tem prioridade.
     */
    private EnderecoParser.Partes partesEndereco(Clinica c) {
        EnderecoParser.Partes salvo = new EnderecoParser.Partes(c.getCep(), c.getLogradouro(), c.getNumero(),
                c.getComplemento(), c.getBairro(), c.getCidade(), c.getUf());
        if (!vazio(c.getNumero())) return salvo;
        EnderecoParser.Partes doTexto = EnderecoParser.separar(primeiro(c.getLogradouro(), c.getEndereco()));
        if (doTexto == null) return salvo;
        EnderecoParser.Partes doEndereco = EnderecoParser.separar(c.getEndereco());
        return new EnderecoParser.Partes(
                primeiro(c.getCep(), doTexto.cep(), doEndereco != null ? doEndereco.cep() : null),
                doTexto.logradouro(),
                doTexto.numero(),
                primeiro(c.getComplemento(), doTexto.complemento()),
                primeiro(c.getBairro(), doTexto.bairro()),
                primeiro(c.getCidade(), doTexto.cidade()),
                primeiro(c.getUf(), doTexto.uf()));
    }

    private EmpresaResponse converterParaEmpresaResponse(Clinica clinica) {
        EnderecoParser.Partes end = partesEndereco(clinica);
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
                iniciaisDa(clinica),
                textoPublicado(clinica, "TERMOS_USO"),
                textoPublicado(clinica, "POLITICA_PRIVACIDADE"),
                null,   // o PDF não volta aqui (é grande); fica em Documentos e na vitrine
                publicado(clinica, "TERMO_CLINICA") != null ? publicado(clinica, "TERMO_CLINICA").getNomeArquivo() : null,
                end.cep(),
                end.logradouro(),
                end.numero(),
                end.complemento(),
                end.bairro(),
                end.cidade(),
                end.uf(),
                clinica.getTextoHorario(),
                clinica.getPoliticaCancelamento()
        );
    }

    /** Monograma salvo pela gestora; se não houver, calcula pelo nome. */
    private String iniciaisDa(Clinica clinica) {
        return clinica.getIniciais() != null && !clinica.getIniciais().isBlank()
                ? clinica.getIniciais()
                : obterIniciais(clinica.getNome());
    }

    private String obterIniciais(String nome) {
        if (nome == null || nome.isBlank()) return "CA";
        String[] partes = nome.trim().split("\\s+");
        if (partes.length == 1) {
            return partes[0].substring(0, Math.min(partes[0].length(), 2)).toUpperCase();
        }
        return (partes[0].substring(0, 1) + partes[partes.length - 1].substring(0, 1)).toUpperCase();
    }

    private int converterDiaSemanaParaIndice(DiaSemana dia) {
        return switch (dia) {
            case DOMINGO -> 0;
            case SEGUNDA -> 1;
            case TERCA -> 2;
            case QUARTA -> 3;
            case QUINTA -> 4;
            case SEXTA -> 5;
            case SABADO -> 6;
        };
    }
}
