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
                    ficha != null ? ficha.getDataAtualizacao().toString() : "",
                    List.of()
            );
        }).toList();
    }

    @Transactional
    public void salvarNotasCliente(Usuario gestora, Long idCliente, String notas) {
        FichaAnamnese ficha = fichaAnamneseRepository.findByClienteId(idCliente)
                .orElseGet(() -> {
                    Usuario cliente = usuarioRepository.findById(idCliente)
                            .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrada."));
                    FichaAnamnese f = new FichaAnamnese();
                    f.setCliente(cliente);
                    f.setAlergias("Nenhuma");
                    f.setObservacoesMedicas("Nenhuma");
                    f.setRespostas("{}");
                    return f;
                });
        ficha.setNotasGestora(notas);
        ficha.setDataAtualizacao(LocalDateTime.now());
        fichaAnamneseRepository.save(ficha);
    }

    public List<DocumentoResponse> listarDocumentos(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        List<DocumentoTermo> docs = documentoTermoRepository.findByClinicaIdOuPlataforma(clinica.getId());

        return docs.stream().map(d -> new DocumentoResponse(
                d.getId(),
                d.getTitulo(),
                d.getTipoDocumento(),
                d.getVersao(),
                d.getCaminhoArquivo(),
                d.getStatus(),
                d.getDataPublicacao() != null ? d.getDataPublicacao().toString() : null,
                d.getClinica() == null,
                aceiteDocumentoRepository.countByDocumentoId(d.getId())
        )).toList();
    }

    @Transactional
    public DocumentoResponse criarNovaVersao(Usuario gestora, Long idDoc) {
        DocumentoTermo base = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));

        DocumentoTermo novo = new DocumentoTermo();
        novo.setClinica(base.getClinica());
        novo.setTitulo(base.getTitulo());
        novo.setTipoDocumento(base.getTipoDocumento());
        novo.setVersao(String.format(Locale.US, "%.1f", Double.parseDouble(base.getVersao()) + 1.0));
        novo.setStatus("RASCUNHO");
        novo.setCaminhoArquivo(null);
        novo.setDataPublicacao(null);
        novo = documentoTermoRepository.save(novo);

        return new DocumentoResponse(novo.getId(), novo.getTitulo(), novo.getTipoDocumento(), novo.getVersao(), null, novo.getStatus(), null, novo.getClinica() == null, 0);
    }

    @Transactional
    public List<DocumentoResponse> publicarDocumento(Usuario gestora, Long idDoc) {
        DocumentoTermo doc = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
        doc.setStatus("PUBLICADO");
        doc.setDataPublicacao(LocalDateTime.now());
        documentoTermoRepository.save(doc);
        return listarDocumentos(gestora);
    }

    @Transactional
    public DocumentoResponse inativarDocumento(Usuario gestora, Long idDoc) {
        DocumentoTermo doc = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
        doc.setStatus("INATIVO");
        doc = documentoTermoRepository.save(doc);
        return new DocumentoResponse(doc.getId(), doc.getTitulo(), doc.getTipoDocumento(), doc.getVersao(), doc.getCaminhoArquivo(), doc.getStatus(), doc.getDataPublicacao() != null ? doc.getDataPublicacao().toString() : null, doc.getClinica() == null, 0);
    }

    @Transactional
    public DocumentoResponse salvarArquivoDocumento(Usuario gestora, Long idDoc, MultipartFile file) {
        DocumentoTermo doc = documentoTermoRepository.findById(idDoc)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Documento não encontrado."));
        doc.setCaminhoArquivo(file.getOriginalFilename());
        doc = documentoTermoRepository.save(doc);
        return new DocumentoResponse(doc.getId(), doc.getTitulo(), doc.getTipoDocumento(), doc.getVersao(), doc.getCaminhoArquivo(), doc.getStatus(), doc.getDataPublicacao() != null ? doc.getDataPublicacao().toString() : null, doc.getClinica() == null, 0);
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