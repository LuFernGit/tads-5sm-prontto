package prontto_api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Agendamento;
import prontto_api.domain.LogAuditoria;
import prontto_api.domain.RegrasAgendamento;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.repository.AgendamentoRepository;
import prontto_api.repository.LogAuditoriaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Cancela automaticamente os agendamentos PENDENTES cuja cliente não confirmou
 * a presença até 24 horas antes (RegrasAgendamento.PRAZO_CONFIRMACAO_HORAS).
 * O horário volta a ficar livre na agenda.
 *
 * Roda a cada 5 minutos (e 30 segundos depois que o Spring sobe).
 */
@Component
public class AgendamentoAutoCancelamentoJob {

    private static final Logger log = LoggerFactory.getLogger(AgendamentoAutoCancelamentoJob.class);

    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;

    @Scheduled(initialDelay = 30_000, fixedDelay = 300_000)
    @Transactional
    public void cancelarPendentesSemConfirmacao() {
        LocalDateTime agora = RegrasAgendamento.agora();
        List<Agendamento> vencidos = agendamentoRepository.findByStatus(StatusAgendamento.PENDENTE)
                .stream()
                .filter(a -> !RegrasAgendamento.prazoConfirmacao(a).isAfter(agora))
                .toList();

        for (Agendamento a : vencidos) {
            a.setStatus(StatusAgendamento.CANCELADO);
            a.setCanceladoPor("SISTEMA");
            a.setMotivoCancelamento(RegrasAgendamento.MOTIVO_SEM_CONFIRMACAO);
            a.setDataCancelamento(agora);
            agendamentoRepository.save(a);

            LogAuditoria registro = new LogAuditoria();
            registro.setUsuario(a.getCliente());
            registro.setAcao("CANCELAMENTO_AUTOMATICO_SEM_CONFIRMACAO");
            logAuditoriaRepository.save(registro);
        }
        if (!vencidos.isEmpty()) {
            log.info("{} agendamento(s) pendente(s) cancelado(s) por falta de confirmação.", vencidos.size());
        }
    }
}
