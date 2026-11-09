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

    public PainelSemanalResponse obterPainelSemanal(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        LocalDate monday = LocalDate.now().minusDays((LocalDate.now().getDayOfWeek().getValue() - 1));

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
                            bl != null ? new PainelSemanalResponse.BloqueioInfo(bl.getId(), bl.getHoraInicio() != null ? bl.getHoraInicio().toString() : null, bl.getHoraFim() != null ? bl.getHoraFim().toString() : null) : null
                    ));

                    t = t.plusMinutes(60);
                }
            }
            horariosPorDia.add(slots);
        }

        return new PainelSemanalResponse(dias, datas, horariosPorDia, List.of());
    }

    public List<ClienteGestoraResponse> listarClientes(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        List<Usuario> clientes = usuarioRepository.findByClinicaIdAndTipo(clinica.getId(), TipoUsuario.CLIENTE);

        return clientes.stream().map(c -> {
            FichaAnamnese ficha = fichaAnamneseRepository.findByClienteId(c.getId()).orElse(null);
            List<Agendamento> ags = agendamentoRepository.findByClienteId(c.getId());

            String lastDate = ags.stream().map(a -> a.getData().toString()).max(String::compareTo).orElse("—");
            String lastServ = ags.stream().filter(a -> a.getData().toString().equals(lastDate)).map(Agendamento::getNomeProcedimento).findFirst().orElse("—");

            var appts = ags.stream().map(a -> new ClienteGestoraResponse.AgendamentoItemDto(
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
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ficha da cliente não encontrada."));
        ficha.setNotasGestora(notas);
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

    public List<ModeloMensagemDto> listarModelosMensagem(Usuario gestora) {
        Clinica clinica = buscarClinicaGestora(gestora);
        return modeloMensagemRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(m -> new ModeloMensagemDto(m.getId().toString(), m.getNome(), m.getFinalidade(), m.getAtivo(), m.getTexto()))
                .toList();
    }

    @Transactional
    public List<ModeloMensagemDto> salvarModelosMensagem(Usuario gestora, List<ModeloMensagemDto> dtos) {
        Clinica clinica = buscarClinicaGestora(gestora);
        for (var dto : dtos) {
            ModeloMensagem m;
            if (dto.id() != null && dto.id().matches("\\d+")) {
                m = modeloMensagemRepository.findById(Long.valueOf(dto.id())).orElseGet(ModeloMensagem::new);
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
                a.getHora().toString()
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