package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Agendamento;
import prontto_api.domain.Clinica;
import prontto_api.domain.Notificacao;
import prontto_api.domain.RegrasAgendamento;
import prontto_api.domain.Usuario;
import prontto_api.dto.NotificacoesResponse;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.repository.ClinicaRepository;
import prontto_api.repository.NotificacaoRepository;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Notificações da gestora (sino do painel). Registradas nos eventos do
 * agendamento feitos pelo cliente ou pelo sistema; a gestora vê a lista,
 * o total de não lidas e marca como lidas.
 */
@Service
public class NotificacaoService {

    public static final String NOVO_AGENDAMENTO = "NOVO_AGENDAMENTO";
    public static final String PRESENCA_CONFIRMADA = "PRESENCA_CONFIRMADA";
    public static final String CANCELAMENTO_CLIENTE = "CANCELAMENTO_CLIENTE";
    public static final String CANCELAMENTO_AUTOMATICO = "CANCELAMENTO_AUTOMATICO";

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired private NotificacaoRepository notificacaoRepository;
    @Autowired private ClinicaRepository clinicaRepository;

    private static String brl(BigDecimal valor) {
        return NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(valor).replace(' ', ' ');
    }

    /** "Volume Brasileiro em 20/11 às 14:00" */
    private static String quando(Agendamento a) {
        return a.getNomeProcedimento() + " em " + a.getData().format(DIA) + " às " + a.getHora().format(HORA);
    }

    /** Cria a notificação do evento para a clínica do agendamento. */
    @Transactional
    public void registrar(Agendamento a, String tipo) {
        if (a == null || a.getServico() == null || a.getServico().getClinica() == null) return;
        String cliente = a.getCliente() != null ? a.getCliente().getNome() : "Cliente";
        boolean temSinal = RegrasAgendamento.temSinalRegistrado(a);
        String titulo;
        String mensagem;
        boolean requerAcao = false;
        switch (tipo) {
            case NOVO_AGENDAMENTO -> {
                titulo = "Novo agendamento";
                mensagem = cliente + " marcou " + quando(a) + "."
                        + (temSinal ? " Sinal de " + brl(a.getValorSinal()) + " pago." : "");
            }
            case PRESENCA_CONFIRMADA -> {
                titulo = "Presença confirmada";
                mensagem = cliente + " confirmou a presença: " + quando(a) + ".";
            }
            case CANCELAMENTO_CLIENTE -> {
                titulo = "Cancelamento pelo cliente";
                String sinal = "";
                if (RegrasAgendamento.REEMBOLSO_A_VERIFICAR.equals(a.getReembolsoStatus())) {
                    sinal = " Cancelou com 24h ou mais: verifique o reembolso do sinal ("
                            + brl(a.getValorSinal()) + ").";
                    requerAcao = true;
                } else if (temSinal) {
                    sinal = " Cancelou com menos de 24h: o sinal (" + brl(a.getValorSinal())
                            + ") fica retido, exceto em caso de força maior.";
                }
                mensagem = cliente + " cancelou " + quando(a) + "." + sinal;
            }
            case CANCELAMENTO_AUTOMATICO -> {
                titulo = "Cancelamento automático";
                mensagem = quando(a) + " (" + cliente + ") foi cancelado: a presença não foi confirmada até 24 horas antes."
                        + (temSinal ? " O sinal (" + brl(a.getValorSinal()) + ") fica retido." : "")
                        + " O horário voltou a ficar livre.";
            }
            default -> {
                return;
            }
        }
        Notificacao n = new Notificacao();
        n.setClinica(a.getServico().getClinica());
        n.setAgendamento(a);
        n.setTipo(tipo);
        n.setTitulo(titulo);
        n.setMensagem(mensagem.length() > 500 ? mensagem.substring(0, 499) + "…" : mensagem);
        n.setRequerAcao(requerAcao);
        notificacaoRepository.save(n);
    }

    private Clinica clinicaDa(Usuario gestora) {
        return clinicaRepository.findByGestoraId(gestora.getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Clínica da gestora não encontrada."));
    }

    @Transactional(readOnly = true)
    public NotificacoesResponse listar(Usuario gestora) {
        Clinica clinica = clinicaDa(gestora);
        var itens = notificacaoRepository.findTop30ByClinicaIdOrderByCriadaEmDescIdDesc(clinica.getId()).stream()
                .map(n -> new NotificacoesResponse.Item(
                        n.getId().toString(),
                        n.getTipo(),
                        n.getTitulo(),
                        n.getMensagem(),
                        n.getAgendamento() != null ? n.getAgendamento().getId().toString() : null,
                        n.getAgendamento() != null ? n.getAgendamento().getData().toString() : null,
                        Boolean.TRUE.equals(n.getRequerAcao()),
                        n.getCriadaEm().toString(),
                        n.getLidaEm() != null))
                .toList();
        return new NotificacoesResponse(notificacaoRepository.countByClinicaIdAndLidaEmIsNull(clinica.getId()), itens);
    }

    @Transactional
    public NotificacoesResponse marcarTodasComoLidas(Usuario gestora) {
        notificacaoRepository.marcarTodasComoLidas(clinicaDa(gestora).getId(), RegrasAgendamento.agora());
        return listar(gestora);
    }

    @Transactional
    public NotificacoesResponse marcarComoLida(Usuario gestora, Long id) {
        Clinica clinica = clinicaDa(gestora);
        Notificacao n = notificacaoRepository.findById(id)
                .filter(x -> x.getClinica().getId().equals(clinica.getId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Notificação não encontrada."));
        if (n.getLidaEm() == null) {
            n.setLidaEm(RegrasAgendamento.agora());
            notificacaoRepository.save(n);
        }
        return listar(gestora);
    }
}
