package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import prontto_api.domain.*;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.domain.enums.TipoUsuario;
import prontto_api.dto.*;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class GestoraAdminService {

    @Autowired private ClinicaRepository clinicaRepository;
    @Autowired private HorarioRepository horarioRepository;
    @Autowired private BloqueioHorarioRepository bloqueioHorarioRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private FichaAnamneseRepository fichaAnamneseRepository;
    @Autowired private DocumentoTermoRepository documentoTermoRepository;
    @Autowired private AceiteDocumentoRepository aceiteDocumentoRepository;
    @Autowired private ModeloMensagemRepository modeloMensagemRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private NotaClienteRepository notaClienteRepository;
    @Autowired private FichaVersaoService fichaVersaoService;
    @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /** semana = qualquer data da semana desejada (null = semana atual). */
    public PainelSemanalResponse obterPainelSemanal(Usuario gestora, LocalDate semana) {
        Clinica clinica = buscarClinicaGestora(gestora);
        LocalDate base = semana != null ? semana : LocalDate.now();
        LocalDate monday = base.minusDays(base.getDayOfWeek().getValue() - 1);

        List<String> dias = new ArrayList<>();
        List<String> datas = new ArrayList<>();
        List<List<PainelSemanalResponse.SlotPainelDto>> horariosPorDia = new ArrayList<>();

        String[] weekShort = {"SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"};
        DiaSemana[] diasSemana = DiaSemana.values();

        for (int i = 0; i < 7; i++) {
            LocalDate diaData = monday.plusDays(i);
            datas.add(diaData.toString());
            dias.add(weekShort[i] + " " + String.format("%02d", diaData.getDayOfMonth()));

            DiaSemana diaEnum = diasSemana[i];
            List<Horario> ranges = horarioRepository.findByClinicaIdAndDiaSemana(clinica.getId(), diaEnum);
            List<BloqueioHorario> bloqueios = bloqueioHorarioRepository.findByClinicaIdAndDataBetween(clinica.getId(), diaData, diaData);
            List<Agendamento> agendamentos = agendamentoRepository.findByServicoClinicaIdAndData(clinica.getId(), diaData);

            List<PainelSemanalResponse.SlotPainelDto> slots = new ArrayList<>();

            for (Horario range : ranges) {
                if (!range.getAtivo()) continue;
                LocalTime t = range.getHoraInicio();
                while (t.plusMinutes(60).compareTo(range.getHoraFim()) <= 0) {
                    LocalTime end = t.plusMinutes(60);
                    LocalTime curT = t;

                    Agendamento ag = agendamentos.stream().filter(a ->
                            a.getStatus() != StatusAgendamento.CANCELADO &&
                                    a.getHora().isBefore(end) &&
                                    a.getHora().plusMinutes(a.getServico().getDuracao()).isAfter(curT)
                    ).findFirst().orElse(null);

                    BloqueioHorario bl = bloqueios.stream().filter(b ->
                            b.getHoraInicio() == null || (b.getHoraInicio().isBefore(end) && b.getHoraFim().isAfter(curT))
                    ).findFirst().orElse(null);

                    String status = ag != null ? "busy" : bl != null ? "blocked" : "free";

                    slots.add(new PainelSemanalResponse.SlotPainelDto(
                            curT.toString().substring(0, 5),
                            end.toString().substring(0, 5),
                            status,
                            ag != null ? ag.getId().toString() : null,
                            ag != null ? ag.getCliente().getNome() : null,
                            ag != null ? ag.getCliente().getWhatsapp() : null,
                            ag != null ? ag.getNomeProcedimento() : null,
                            bl != null ? new PainelSemanalResponse.BloqueioInfo(bl.getId(), bl.getHoraInicio() != null ? bl.getHoraInicio().toString() : null, bl.getHoraFim() != null ? bl.getHoraFim().toString() : null) : null,
                            ag != null ? ag.getStatus().name() : null
                    ));

                    t = t.plusMinutes(60);
                }
            }
            horariosPorDia.add(slots);
        }

        return new PainelSemanalResponse(dias, datas, horariosPorDia, listarProximosAtendimentos(clinica));
    }

    /** Quantos atendimentos aparecem em "Próxima cliente" + "Próximos atendimentos". */
    private static final int LIMITE_PROXIMOS = 6;

    /**
     * Próximos atendimentos da clínica: não cancelados, ainda não terminados
     * (inclui o que está em andamento), em ordem de data e hora.
     * Não depende da semana exibida no painel: é sempre a partir de agora.
     */
    private List<PainelSemanalResponse.ProximoAtendimentoDto> listarProximosAtendimentos(Clinica clinica) {
        // Horário de Brasília explícito: não depende do fuso do servidor.
        LocalDateTime agora = LocalDateTime.now(java.time.ZoneId.of("America/Sao_Paulo"));
        List<Agendamento> futuros = agendamentoRepository
                .findByServicoClinicaIdAndStatusNot(clinica.getId(), StatusAgendamento.CANCELADO)
                .stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONFIRMADO
                        || a.getStatus() == StatusAgendamento.PENDENTE)
                .filter(a -> !LocalDateTime.of(a.getData(), a.getHora())
                        .plusMinutes(duracaoDe(a))
                        .isBefore(agora))
                .sorted(java.util.Comparator
                        .comparing(Agendamento::getData)
                        .thenComparing(Agendamento::getHora))
                .limit(LIMITE_PROXIMOS)
                .toList();

        List<PainelSemanalResponse.ProximoAtendimentoDto> proximos = new ArrayList<>();
        for (int i = 0; i < futuros.size(); i++) {
            Agendamento a = futuros.get(i);
            Usuario cliente = a.getCliente();
            int duracao = duracaoDe(a);
            String nome = cliente.getNome();
            boolean recorrente = Boolean.TRUE.equals(cliente.getRecorrente());
            proximos.add(new PainelSemanalResponse.ProximoAtendimentoDto(
                    a.getId().toString(),
                    a.getHora().toString().substring(0, 5),
                    a.getHora().plusMinutes(duracao).toString().substring(0, 5),
                    nome,
                    nome.isBlank() ? "?" : nome.substring(0, 1).toUpperCase(),
                    i % 2 == 1,
                    a.getNomeProcedimento(),
                    a.getNomeProcedimento(),
                    a.getStatus().name(),
                    textoSinal(a.getValorSinal(), recorrente),
                    a.getData().toString(),
                    duracao,
                    cliente.getWhatsapp(),
                    recorrente
            ));
        }
        return proximos;
    }

    /** Duração do serviço em minutos (60 se não houver). */
    private static int duracaoDe(Agendamento a) {
        Integer duracao = a.getServico() != null ? a.getServico().getDuracao() : null;
        return duracao != null && duracao > 0 ? duracao : 60;
    }

    /** Texto do sinal mostrado no painel (sem o valor, para caber na etiqueta). */
    private static String textoSinal(java.math.BigDecimal valorSinal, boolean recorrente) {
        if (valorSinal != null && valorSinal.signum() > 0) return "Sinal pago";
        return recorrente ? "Isenta de sinal" : "Sem sinal registrado";
    }

    public List<ClienteGestoraResponse> listarClientes(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        List<Usuario> clientes = usuarioRepository.findByClinicaIdAndTipo(clinica.getId(), TipoUsuario.CLIENTE);

        return clientes.stream().map(c -> {
            FichaAnamnese ficha = fichaAnamneseRepository.findByClienteId(c.getId()).orElse(null);
            List<Agendamento> ags = agendamentoRepository.findByClienteId(c.getId());

            // ÚLTIMA APLICAÇÃO = atendimento mais recente que JÁ ACONTECEU (data até
            // agora: data E hora) e não foi cancelado. Agendamentos futuros — inclusive
            // os de hoje num horário que ainda não chegou — não contam como aplicação.
            var agora = prontto_api.domain.RegrasAgendamento.agora();
            Agendamento ultimo = ags.stream()
                    .filter(a -> a.getStatus() != StatusAgendamento.CANCELADO)
                    .filter(a -> !a.getData().atTime(a.getHora()).isAfter(agora))
                    .max(java.util.Comparator.comparing(Agendamento::getData).thenComparing(Agendamento::getHora))
                    .orElse(null);
            String lastDate = ultimo != null ? ultimo.getData().toString() : "—";
            String lastServ = ultimo != null ? ultimo.getNomeProcedimento() : "—";

            var appts = ags.stream()
                    // Histórico do mais recente para o mais antigo
                    .sorted(java.util.Comparator.comparing(Agendamento::getData).thenComparing(Agendamento::getHora).reversed())
                    .map(a -> new ClienteGestoraResponse.AgendamentoItemDto(
                    a.getData().toString(), a.getHora().toString(), a.getNomeProcedimento(), a.getStatus().name()
            )).toList();

            return new ClienteGestoraResponse(
                    c.getId(),
                    c.getNome(),
                    c.getNome().length() >= 2 ? c.getNome().substring(0, 2).toUpperCase() : "CL",
                    c.getEmail(),
                    c.getWhatsapp(),
                    c.getRecorrente(),
                    c.getStatus().name(),
                    lastServ,
                    lastServ,
                    lastDate,
                    appts,
                    ficha != null ? ficha.getAlergias() : "Nenhuma",
                    ficha != null ? ficha.getObservacoesMedicas() : "Nenhuma",
                    ficha != null ? ficha.getNotasGestora() : "",
                    ficha != null && ficha.getDataAtualizacao() != null ? ficha.getDataAtualizacao().toString() : "",
                    ficha != null ? fichaVersaoService.contar(ficha) : 0L,
                    notaClienteRepository.findByClienteIdOrderByCriadaEmDesc(c.getId())
                            .stream().map(this::paraNotaDto).toList()
            );
        }).toList();
    }

    /**
     * "Impressão digital" leve da agenda da clínica: muda quando uma cliente
     * agenda, confirma ou cancela, quando há bloqueio novo ou cliente nova.
     * O painel consulta isto e só recarrega os dados quando muda.
     */
    public String obterVersaoAgenda(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        StringBuilder sb = new StringBuilder();
        agendamentoRepository.findByServicoClinicaId(clinica.getId()).forEach(a -> sb.append(a.getId()).append(':').append(a.getStatus())
                .append(':').append(a.getData()).append(':').append(a.getHora()).append('|'));
        bloqueioHorarioRepository.findByClinicaId(clinica.getId())
                .forEach(b -> sb.append('b').append(b.getId()).append('|'));
        sb.append('c').append(usuarioRepository.findByClinicaIdAndTipo(clinica.getId(), TipoUsuario.CLIENTE).size());
        return Integer.toHexString(sb.toString().hashCode());
    }

    /* ---------- Notas internas da gestora (várias por cliente) ---------- */

    private NotaClienteDto paraNotaDto(NotaCliente n) {
        return new NotaClienteDto(n.getId(), n.getTexto(), n.getCriadaEm().toString(),
                n.getAtualizadaEm() != null ? n.getAtualizadaEm().toString() : null);
    }

    /** Cliente da clínica da gestora (senão, 404: não expõe clientes de outras clínicas). */
    private Usuario buscarClienteDaClinica(Clinica clinica, Long idCliente) {
        Usuario cliente = usuarioRepository.findById(idCliente)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrada."));
        if (cliente.getTipo() != TipoUsuario.CLIENTE || cliente.getClinica() == null
                || !cliente.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Cliente não encontrada.");
        }
        return cliente;
    }

    private NotaCliente buscarNota(Clinica clinica, Long idCliente, Long idNota) {
        NotaCliente nota = notaClienteRepository.findById(idNota)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Nota não encontrada."));
        if (!nota.getClinica().getId().equals(clinica.getId()) || !nota.getCliente().getId().equals(idCliente)) {
            throw new RecursoNaoEncontradoException("Nota não encontrada.");
        }
        return nota;
    }

    private String validarTextoNota(String texto) {
        String t = texto == null ? "" : texto.trim();
        if (t.isEmpty()) throw new RegraNegocioException("Escreva a nota. Exemplo: prefere horários pela manhã.");
        if (t.length() > 1000) throw new RegraNegocioException("A nota pode ter no máximo 1000 caracteres.");
        return t;
    }

    public List<NotaClienteDto> listarNotas(Usuario gestora, Long idCliente) {
        Clinica clinica = buscarClinicaGestora(gestora);
        buscarClienteDaClinica(clinica, idCliente);
        return notaClienteRepository.findByClienteIdOrderByCriadaEmDesc(idCliente)
                .stream().map(this::paraNotaDto).toList();
    }

    @Transactional
    public NotaClienteDto criarNota(Usuario gestora, Long idCliente, String texto) {
        Clinica clinica = buscarClinicaGestora(gestora);
        NotaCliente nota = new NotaCliente();
        nota.setClinica(clinica);
        nota.setCliente(buscarClienteDaClinica(clinica, idCliente));
        nota.setTexto(validarTextoNota(texto));
        nota.setCriadaEm(LocalDateTime.now());
        return paraNotaDto(notaClienteRepository.save(nota));
    }

    @Transactional
    public NotaClienteDto atualizarNota(Usuario gestora, Long idCliente, Long idNota, String texto) {
        Clinica clinica = buscarClinicaGestora(gestora);
        NotaCliente nota = buscarNota(clinica, idCliente, idNota);
        nota.setTexto(validarTextoNota(texto));
        nota.setAtualizadaEm(LocalDateTime.now());
        return paraNotaDto(notaClienteRepository.save(nota));
    }

    @Transactional
    public void excluirNota(Usuario gestora, Long idCliente, Long idNota) {
        Clinica clinica = buscarClinicaGestora(gestora);
        notaClienteRepository.delete(buscarNota(clinica, idCliente, idNota));
    }

    /* ---------- Ficha de saúde: histórico por versões completas ---------- */

    /**
     * Versões completas da ficha da cliente (da atual para a mais antiga).
     * Cada versão traz a ficha inteira daquele momento, não só o que mudou.
     */
    public List<FichaVersaoDto> listarVersoesFicha(Usuario gestora, Long idCliente) {
        Clinica clinica = buscarClinicaGestora(gestora);
        Usuario cliente = buscarClienteDaClinica(clinica, idCliente);
        return fichaAnamneseRepository.findByClienteId(cliente.getId())
                .map(fichaVersaoService::listar)
                .orElse(List.of());
    }

    /* ---------- Documentos e termos (versionados) ---------- */

    private DocumentoResponse paraDocumentoDto(DocumentoTermo d) {
        return new DocumentoResponse(
                d.getId(),
                d.getTitulo(),
                d.getTipoDocumento(),
                d.getVersao(),
                nomeDoArquivo(d),
                d.getStatus(),
                d.getDataPublicacao() != null ? d.getDataPublicacao().toString() : null,
                d.getClinica() == null,
                aceiteDocumentoRepository.countByDocumentoId(d.getId()),
                d.getExcluidoEm() != null ? d.getExcluidoEm().toString() : null
        );
    }

    /** Nome do PDF para a lista (nunca o conteúdo base64). */
    private String nomeDoArquivo(DocumentoTermo d) {
        if (d.getNomeArquivo() != null && !d.getNomeArquivo().isBlank()) return d.getNomeArquivo();
        String caminho = d.getCaminhoArquivo();
        if (caminho == null || caminho.isBlank() || caminho.startsWith("data:")) {
            return caminho == null || caminho.isBlank() ? null : "documento.pdf";
        }
        return caminho;
    }

    /**
     * Documento da clínica da gestora. Documentos do Prontto (sem clínica) são
     * só de leitura, e documentos de outras clínicas não existem para ela.
     */
    private DocumentoTermo buscarDocumentoDaClinica(Clinica clinica, Long idDoc) {
        DocumentoTermo doc = buscarDocumentoDaClinicaInclusiveExcluido(clinica, idDoc);
        if (doc.getExcluidoEm() != null) {
            throw new RegraNegocioException("Este documento está na lista de excluídos. Restaure-o antes de alterá-lo.");
        }
        return doc;
    }

    /** Igual a buscarDocumentoDaClinica, mas aceita documento excluído (para restaurar). */
    private DocumentoTermo buscarDocumentoDaClinicaInclusiveExcluido(Clinica clinica, Long idDoc) {
        DocumentoTermo doc = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
        if (doc.getClinica() == null) {
            throw new RegraNegocioException("Os documentos do Prontto são só de leitura.");
        }
        if (!doc.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Documento não encontrado.");
        }
        return doc;
    }

    private static final java.util.Set<String> TIPOS_DOCUMENTO = java.util.Set.of(
            "TERMOS_USO", "POLITICA_PRIVACIDADE", "TERMO_CLINICA", "OUTRO");

    private DocumentoDetalheResponse paraDetalhe(DocumentoTermo d) {
        String caminho = d.getCaminhoArquivo();
        return new DocumentoDetalheResponse(d.getId(), d.getTitulo(), d.getTipoDocumento(), d.getVersao(),
                d.getStatus(), d.getConteudo(), nomeDoArquivo(d),
                caminho != null && caminho.startsWith("data:") ? caminho : null,
                d.getDataPublicacao() != null ? d.getDataPublicacao().toString() : null,
                d.getClinica() == null, aceiteDocumentoRepository.countByDocumentoId(d.getId()),
                d.getExcluidoEm() != null ? d.getExcluidoEm().toString() : null);
    }

    /** Ver documento: os da clínica e os do Prontto (só leitura). */
    public DocumentoDetalheResponse obterDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo d = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
        if (d.getClinica() != null && !d.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Documento não encontrado.");
        }
        return paraDetalhe(d);
    }

    private void preencherDocumento(DocumentoTermo d, DocumentoRequest req) {
        String titulo = req.titulo() == null ? "" : req.titulo().trim();
        if (titulo.isEmpty()) throw new RegraNegocioException("Informe o título do documento. Exemplo: Termos de uso da clínica.");
        if (titulo.length() > 100) throw new RegraNegocioException("O título pode ter no máximo 100 caracteres.");
        d.setTitulo(titulo);
        String conteudo = req.conteudo() == null ? null : req.conteudo().trim();
        if (conteudo != null && conteudo.length() > 60000) {
            throw new RegraNegocioException("O texto está muito longo. Anexe o documento em PDF.");
        }
        d.setConteudo(conteudo == null || conteudo.isEmpty() ? null : conteudo);
    }

    /** Novo documento da clínica (nasce RASCUNHO, versão seguinte do tipo). */
    @Transactional
    public DocumentoDetalheResponse criarDocumento(Usuario gestora, DocumentoRequest req) {
        Clinica clinica = buscarClinicaGestora(gestora);
        String tipo = req.tipo() == null || req.tipo().isBlank() ? "OUTRO" : req.tipo().trim().toUpperCase(Locale.ROOT);
        if (!TIPOS_DOCUMENTO.contains(tipo)) throw new RegraNegocioException("Tipo de documento inválido.");
        double maior = documentoTermoRepository.findByClinicaIdAndTipoDocumento(clinica.getId(), tipo).stream()
                .mapToDouble(x -> {
                    try { return Double.parseDouble(x.getVersao()); } catch (Exception e) { return 0; }
                })
                .max().orElse(0);
        DocumentoTermo d = new DocumentoTermo();
        d.setClinica(clinica);
        d.setTipoDocumento(tipo);
        d.setVersao(String.format(Locale.US, "%.1f", maior + 1.0));
        d.setStatus("RASCUNHO");
        preencherDocumento(d, req);
        return paraDetalhe(documentoTermoRepository.save(d));
    }

    /** Editar título/texto: só RASCUNHO (versão publicada vale como registro legal). */
    @Transactional
    public DocumentoDetalheResponse atualizarDocumento(Usuario gestora, Long idDoc, DocumentoRequest req) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo d = buscarDocumentoDaClinica(clinica, idDoc);
        if (!"RASCUNHO".equals(d.getStatus())) {
            throw new RegraNegocioException("Só rascunhos podem ser editados. Para mudar um documento publicado, crie uma nova versão.");
        }
        preencherDocumento(d, req);
        return paraDetalhe(documentoTermoRepository.save(d));
    }

    /**
     * Excluir (exclusão LÓGICA): o documento sai da lista, mas continua salvo no
     * banco, com texto e PDF, e pode ser restaurado. Não pode se estiver
     * PUBLICADO (inative antes) nem se tiver aceites registrados (prova legal do
     * consentimento, LGPD: fica inativo).
     */
    @Transactional
    public void excluirDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo d = buscarDocumentoDaClinica(clinica, idDoc);
        if ("PUBLICADO".equals(d.getStatus())) {
            throw new RegraNegocioException("Documento publicado não pode ser excluído. Inative-o antes.");
        }
        if (aceiteDocumentoRepository.countByDocumentoId(d.getId()) > 0) {
            throw new RegraNegocioException("Este documento tem aceites registrados e precisa ser guardado (LGPD). Ele pode ficar inativo.");
        }
        d.setExcluidoEm(LocalDateTime.now());
        documentoTermoRepository.save(d);
    }

    /** Documentos excluídos da clínica (para consultar e restaurar). */
    public List<DocumentoResponse> listarDocumentosExcluidos(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        return documentoTermoRepository.findByClinicaIdAndExcluidoEmIsNotNullOrderByExcluidoEmDesc(clinica.getId())
                .stream().map(this::paraDocumentoDto).toList();
    }

    /** Restaura um documento excluído: volta para a lista com o status que tinha. */
    @Transactional
    public DocumentoResponse restaurarDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo d = buscarDocumentoDaClinicaInclusiveExcluido(clinica, idDoc);
        if (d.getExcluidoEm() == null) {
            throw new RegraNegocioException("Este documento não está excluído.");
        }
        d.setExcluidoEm(null);
        return paraDocumentoDto(documentoTermoRepository.save(d));
    }

    /** Remove o PDF anexado de um rascunho. */
    @Transactional
    public DocumentoResponse removerArquivoDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo d = buscarDocumentoDaClinica(clinica, idDoc);
        if (!"RASCUNHO".equals(d.getStatus())) {
            throw new RegraNegocioException("Só é possível remover o PDF de um rascunho.");
        }
        d.setCaminhoArquivo(null);
        d.setNomeArquivo(null);
        return paraDocumentoDto(documentoTermoRepository.save(d));
    }

    public List<DocumentoResponse> listarDocumentos(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        return documentoTermoRepository.findByClinicaIdOuPlataforma(clinica.getId())
                .stream().map(this::paraDocumentoDto).toList();
    }

    @Transactional
    public DocumentoResponse criarNovaVersao(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo base = buscarDocumentoDaClinica(clinica, idDoc);

        // Próxima versão = maior versão existente do mesmo tipo + 1.0
        double maior = documentoTermoRepository.findByClinicaIdAndTipoDocumento(clinica.getId(), base.getTipoDocumento())
                .stream()
                .mapToDouble(d -> {
                    try { return Double.parseDouble(d.getVersao()); } catch (Exception e) { return 0; }
                })
                .max().orElse(0);

        DocumentoTermo novo = new DocumentoTermo();
        novo.setClinica(clinica);
        novo.setTitulo(base.getTitulo());
        novo.setTipoDocumento(base.getTipoDocumento());
        novo.setVersao(String.format(Locale.US, "%.1f", maior + 1.0));
        novo.setConteudo(base.getConteudo());   // parte do texto atual; o PDF novo é anexado depois
        novo.setStatus("RASCUNHO");
        novo.setCaminhoArquivo(null);
        novo.setNomeArquivo(null);
        novo.setDataPublicacao(null);
        return paraDocumentoDto(documentoTermoRepository.save(novo));
    }

    /**
     * Publica a versão. A versão PUBLICADA anterior do mesmo tipo vira INATIVA
     * (os aceites dela ficam guardados) e as clientes aceitam a nova.
     */
    @Transactional
    public List<DocumentoResponse> publicarDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo doc = buscarDocumentoDaClinica(clinica, idDoc);
        if ("PUBLICADO".equals(doc.getStatus())) {
            throw new RegraNegocioException("Esta versão já está publicada.");
        }
        if ((doc.getConteudo() == null || doc.getConteudo().isBlank())
                && (doc.getCaminhoArquivo() == null || doc.getCaminhoArquivo().isBlank())) {
            throw new RegraNegocioException("Anexe o PDF do documento antes de publicar.");
        }
        for (DocumentoTermo outro : documentoTermoRepository.findByClinicaIdAndTipoDocumento(clinica.getId(), doc.getTipoDocumento())) {
            if (!outro.getId().equals(doc.getId()) && "PUBLICADO".equals(outro.getStatus())) {
                outro.setStatus("INATIVO");
                documentoTermoRepository.save(outro);
            }
        }
        doc.setStatus("PUBLICADO");
        doc.setDataPublicacao(LocalDateTime.now());
        documentoTermoRepository.save(doc);
        return listarDocumentos(gestora);
    }

    @Transactional
    public DocumentoResponse inativarDocumento(Usuario gestora, Long idDoc) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo doc = buscarDocumentoDaClinica(clinica, idDoc);
        doc.setStatus("INATIVO");
        return paraDocumentoDto(documentoTermoRepository.save(doc));
    }

    /** Anexa o PDF (até 10 MB). O arquivo é guardado como data URL em caminho_arquivo. */
    @Transactional
    public DocumentoResponse salvarArquivoDocumento(Usuario gestora, Long idDoc, MultipartFile file) {
        Clinica clinica = buscarClinicaGestora(gestora);
        DocumentoTermo doc = buscarDocumentoDaClinica(clinica, idDoc);
        if ("PUBLICADO".equals(doc.getStatus())) {
            throw new RegraNegocioException("Versões publicadas não podem ser alteradas. Crie uma nova versão.");
        }
        if (file == null || file.isEmpty()) {
            throw new RegraNegocioException("Escolha um arquivo PDF.");
        }
        String nome = file.getOriginalFilename() != null ? file.getOriginalFilename() : "documento.pdf";
        boolean pdf = "application/pdf".equalsIgnoreCase(file.getContentType()) || nome.toLowerCase().endsWith(".pdf");
        if (!pdf) {
            throw new RegraNegocioException("O arquivo precisa ser um PDF.");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new RegraNegocioException("O PDF tem mais de 10 MB. Reduza o tamanho do arquivo.");
        }
        try {
            doc.setCaminhoArquivo("data:application/pdf;base64,"
                    + java.util.Base64.getEncoder().encodeToString(file.getBytes()));
        } catch (java.io.IOException e) {
            throw new RegraNegocioException("Não foi possível ler o arquivo. Tente de novo.");
        }
        doc.setNomeArquivo(nome);
        return paraDocumentoDto(documentoTermoRepository.save(doc));
    }

    /**
     * Modelos padrão do sistema. São criados UMA VEZ, no cadastro da clínica
     * (AuthService). Se a gestora excluir algum, ele não volta sozinho: ela pode
     * recriar os que faltam pelo botão "Adicionar modelos padrão".
     * Variáveis: {nome}, {procedimento}, {data}, {horario}, {prazo}, {link}, {motivo}, {clinica}.
     */
    private static final String[][] MODELOS_PADRAO = {
            // Pede que a cliente CONFIRME pelo site até 24h antes (regra RegrasAgendamento);
            // {prazo} = data/hora limite, {link} = endereço da vitrine.
            {"Pedido de confirmação", "CONFIRMACAO",
                    "Olá, {nome}! Seu horário de {procedimento} está reservado para {data} às {horario}. Para garantir a sua vaga, confirme sua presença pelo nosso site até {prazo}: {link} Sem a confirmação, o horário é liberado para outra cliente. Te esperamos! — {clinica}"},
            {"Cancelamento de agendamento", "CANCELAMENTO",
                    "Olá, {nome}! Informamos que seu agendamento de {procedimento}, marcado para {data} às {horario}, precisou ser cancelado. Motivo: {motivo}. Pedimos desculpas pelo transtorno. — {clinica}"},
            {"Lembrete de agendamento", "LEMBRETE",
                    "Olá, {nome}! Passando para lembrar do seu atendimento de {procedimento}, no dia {data} às {horario}. Esperamos você! — {clinica}"},
            {"Aviso de manutenção", "MANUTENCAO",
                    "Olá, {nome}! Informamos que a clínica estará em manutenção em {data}. Entre em contato conosco para verificar a disponibilidade de horários. — {clinica}"},
            {"Alteração de horário", "ALTERACAO",
                    "Olá, {nome}! Precisamos conversar sobre o horário do seu atendimento de {procedimento}, previsto para {data} às {horario}. Por favor, fale conosco. — {clinica}"},
            {"Reagendamento", "REAGENDAMENTO",
                    "Olá, {nome}! Gostaríamos de combinar um novo horário para seu atendimento de {procedimento}. Entre em contato para escolhermos a melhor opção. — {clinica}"},
    };

    /**
     * Modelos padrão cujas finalidades ainda não existem na clínica (não salva).
     * Usado no cadastro da clínica e no botão "Adicionar modelos padrão".
     */
    public static List<ModeloMensagem> modelosPadraoFaltantes(Clinica clinica, java.util.Collection<String> finalidadesExistentes) {
        List<ModeloMensagem> novos = new ArrayList<>();
        for (String[] padrao : MODELOS_PADRAO) {
            if (finalidadesExistentes.contains(padrao[1])) continue;
            ModeloMensagem m = new ModeloMensagem();
            m.setClinica(clinica);
            m.setNome(padrao[0]);
            m.setFinalidade(padrao[1]);
            m.setTexto(padrao[2]);
            m.setAtivo(true);
            novos.add(m);
        }
        return novos;
    }

    public List<ModeloMensagemDto> listarModelosMensagem(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        return modeloMensagemRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(this::paraDto)
                .toList();
    }

    /* ---------- CRUD de modelos de mensagem (um modelo por vez) ---------- */

    private static final java.util.Set<String> FINALIDADES = java.util.Set.of(
            "CONFIRMACAO", "CANCELAMENTO", "LEMBRETE", "MANUTENCAO",
            "ALTERACAO", "REAGENDAMENTO", "PERSONALIZADA");

    private ModeloMensagemDto paraDto(ModeloMensagem m) {
        return new ModeloMensagemDto(m.getId().toString(), m.getNome(), m.getFinalidade(), m.getAtivo(), m.getTexto());
    }

    /** Busca o modelo garantindo que ele é da clínica da gestora logada. */
    private ModeloMensagem buscarModeloDaClinica(Clinica clinica, Long id) {
        ModeloMensagem m = modeloMensagemRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Modelo de mensagem não encontrado."));
        if (!m.getClinica().getId().equals(clinica.getId())) {
            throw new RecursoNaoEncontradoException("Modelo de mensagem não encontrado.");
        }
        return m;
    }

    /** Valida e copia os campos do DTO para a entidade. */
    private void preencherModelo(ModeloMensagem m, ModeloMensagemDto dto) {
        String nome = dto.nome() == null ? "" : dto.nome().trim();
        String texto = dto.texto() == null ? "" : dto.texto().trim();
        String finalidade = dto.finalidade() == null || dto.finalidade().isBlank()
                ? "PERSONALIZADA" : dto.finalidade().trim().toUpperCase(Locale.ROOT);
        if (nome.isEmpty()) throw new RegraNegocioException("Informe o nome do modelo. Exemplo: Aviso de feriado.");
        if (nome.length() > 100) throw new RegraNegocioException("O nome do modelo pode ter no máximo 100 caracteres.");
        if (texto.isEmpty()) throw new RegraNegocioException("Escreva o texto da mensagem. Exemplo: Olá, {nome}! ...");
        if (texto.length() > 1000) throw new RegraNegocioException("O texto pode ter no máximo 1000 caracteres.");
        if (!FINALIDADES.contains(finalidade)) throw new RegraNegocioException("Finalidade de mensagem inválida.");
        m.setNome(nome);
        m.setTexto(texto);
        m.setFinalidade(finalidade);
        m.setAtivo(dto.ativo() != null ? dto.ativo() : Boolean.TRUE);
    }

    @Transactional
    public ModeloMensagemDto criarModeloMensagem(Usuario gestora, ModeloMensagemDto dto) {
        Clinica clinica = buscarClinicaGestora(gestora);
        ModeloMensagem m = new ModeloMensagem();
        m.setClinica(clinica);
        preencherModelo(m, dto);
        return paraDto(modeloMensagemRepository.save(m));
    }

    @Transactional
    public ModeloMensagemDto atualizarModeloMensagem(Usuario gestora, Long id, ModeloMensagemDto dto) {
        Clinica clinica = buscarClinicaGestora(gestora);
        ModeloMensagem m = buscarModeloDaClinica(clinica, id);
        preencherModelo(m, dto);
        return paraDto(modeloMensagemRepository.save(m));
    }

    /**
     * Exclui o modelo (qualquer um, inclusive os padrão). Quem precisar de um
     * tipo que não existe mais usa o texto padrão interno; e a gestora pode
     * recriar os padrão que faltam em "Adicionar modelos padrão".
     */
    @Transactional
    public void excluirModeloMensagem(Usuario gestora, Long id) {
        Clinica clinica = buscarClinicaGestora(gestora);
        ModeloMensagem m = buscarModeloDaClinica(clinica, id);
        modeloMensagemRepository.delete(m);
    }

    /** Recria só os modelos padrão cujas finalidades não existem mais. */
    @Transactional
    public List<ModeloMensagemDto> adicionarModelosPadrao(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        var existentes = modeloMensagemRepository.findByClinicaId(clinica.getId()).stream()
                .map(ModeloMensagem::getFinalidade)
                .toList();
        modeloMensagemRepository.saveAll(modelosPadraoFaltantes(clinica, existentes));
        return listarModelosMensagem(gestora);
    }

    /** Volta o nome e o texto do modelo para o padrão do sistema da mesma finalidade. */
    @Transactional
    public ModeloMensagemDto restaurarModeloPadrao(Usuario gestora, Long id) {
        Clinica clinica = buscarClinicaGestora(gestora);
        ModeloMensagem m = buscarModeloDaClinica(clinica, id);
        for (String[] padrao : MODELOS_PADRAO) {
            if (padrao[1].equals(m.getFinalidade())) {
                m.setNome(padrao[0]);
                m.setTexto(padrao[2]);
                return paraDto(modeloMensagemRepository.save(m));
            }
        }
        throw new RegraNegocioException("Modelos personalizados não têm texto padrão para restaurar.");
    }

    @Transactional
    public List<ModeloMensagemDto> salvarModelosMensagem(Usuario gestora, List<ModeloMensagemDto> dtos) {
        Clinica clinica = buscarClinicaGestora(gestora);
        for (var dto : dtos) {
            ModeloMensagem m;
            if (dto.id() != null && dto.id().matches("\\d+")) {
                // Só aceita modelos da própria clínica (antes, qualquer id era sobrescrito).
                m = buscarModeloDaClinica(clinica, Long.valueOf(dto.id()));
            } else {
                m = new ModeloMensagem();
            }
            m.setClinica(clinica);
            m.setNome(dto.nome());
            m.setFinalidade(dto.finalidade());
            m.setTexto(dto.texto());
            m.setAtivo(dto.ativo() != null ? dto.ativo() : true);
            modeloMensagemRepository.save(m);
        }
        return listarModelosMensagem(gestora);
    }

    public List<DestinatarioMensagemDto> listarDestinatarios(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        List<Agendamento> ags = agendamentoRepository.findByServicoClinicaIdAndStatusNot(clinica.getId(), StatusAgendamento.CANCELADO);
        return ags.stream().map(a -> new DestinatarioMensagemDto(
                a.getCliente().getNome(),
                a.getCliente().getWhatsapp(),
                a.getNomeProcedimento(),
                a.getData().toString(),
                a.getData().toString(),
                a.getHora().toString(),
                a.getId(),
                a.getStatus().name()
        )).toList();
    }

    public List<LogAuditoriaResponse> listarAuditoria(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        return logAuditoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(l -> new LogAuditoriaResponse(
                        l.getId(),
                        l.getUsuario() != null ? l.getUsuario().getNome() : null,
                        l.getAcao(),
                        l.getIpOrigem(),
                        l.getDataHora().toString()
                )).toList();
    }

    private Clinica buscarClinicaGestora(Usuario gestora) {
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica da gestora não encontrada."));
    }
}