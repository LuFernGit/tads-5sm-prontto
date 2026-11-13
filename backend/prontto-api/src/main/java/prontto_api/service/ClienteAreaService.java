package prontto_api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.*;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.domain.enums.StatusUsuario;
import prontto_api.dto.*;
import prontto_api.infra.web.IpOrigem;
import prontto_api.infra.exceptions.ConflitoException;
import prontto_api.infra.exceptions.RecursoNaoEncontradoException;
import prontto_api.infra.exceptions.RegraNegocioException;
import prontto_api.repository.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ClienteAreaService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private FichaAnamneseRepository fichaAnamneseRepository;
    @Autowired private FichaVersaoService fichaVersaoService;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AgendamentoService agendamentoService;

    public PerfilClienteDto obterPerfil(Usuario cliente) {
        return new PerfilClienteDto(
                cliente.getNome(),
                cliente.getEmail(),
                cliente.getWhatsapp(),
                cliente.getDataNascimento().toString(),
                cliente.getRecorrente()
        );
    }

    @Transactional
    public PerfilClienteDto atualizarPerfil(Usuario cliente, PerfilClienteDto dto) {
        cliente.setNome(dto.name().trim());

        if (dto.birthDate() != null && !dto.birthDate().isBlank()) {
            LocalDate birth = LocalDate.parse(dto.birthDate());
            if (Period.between(birth, LocalDate.now()).getYears() < 15) {
                throw new RegraNegocioException("O cadastro é permitido a partir de 15 anos. Confira a data informada.");
            }
            cliente.setDataNascimento(birth);
        }

        if (dto.whatsapp() != null && !dto.whatsapp().isBlank()) {
            cliente.setWhatsapp(dto.whatsapp().replaceAll("\\D", ""));
        }

        if (dto.email() != null && !dto.email().isBlank()) {
            String novoEmail = dto.email().trim().toLowerCase();
            if (!novoEmail.equalsIgnoreCase(cliente.getEmail())) {
                if (usuarioRepository.findByEmail(novoEmail).isPresent()) {
                    throw new ConflitoException("Este e-mail já está sendo utilizado por outra conta.");
                }
                cliente.setEmail(novoEmail);
            }
        }

        usuarioRepository.save(cliente);
        return obterPerfil(cliente);
    }

    public FichaAnamneseResponse obterFichaSaude(Usuario cliente) {
        FichaAnamnese ficha = fichaAnamneseRepository.findByClienteId(cliente.getId()).orElse(null);

        if (ficha == null || ficha.getRespostas() == null) {
            return new FichaAnamneseResponse(Map.of(), LocalDateTime.now().toString());
        }

        try {
            Map<String, Object> map = objectMapper.readValue(ficha.getRespostas(), new TypeReference<>() {});
            return new FichaAnamneseResponse(map, ficha.getDataAtualizacao().toString());
        } catch (Exception e) {
            return new FichaAnamneseResponse(Map.of(), ficha.getDataAtualizacao().toString());
        }
    }

    @Transactional
    public FichaAnamneseResponse atualizarFichaSaude(Usuario cliente, FichaAnamneseRequest request) {
        FichaAnamnese ficha = fichaAnamneseRepository.findByClienteId(cliente.getId())
                .orElseGet(() -> {
                    FichaAnamnese f = new FichaAnamnese();
                    f.setCliente(cliente);
                    return f;
                });

        String respostasJson = "{}";
        try {
            respostasJson = objectMapper.writeValueAsString(request.respostas());
        } catch (Exception ignored) {}
        String alergias = request.alergias() != null ? request.alergias() : "Nenhuma";
        String observacoes = request.observacoes_medicas() != null ? request.observacoes_medicas() : "Nenhuma";

        if (ficha.getId() != null) {
            // Ficha anterior ao histórico por versões: guarda o estado atual como
            // versão 1 antes de alterar, para não perdê-lo.
            fichaVersaoService.garantirVersaoInicial(ficha);
            // Salvou sem mudar nada: não gera versão nova.
            if (fichaVersaoService.mesmoConteudo(ficha, alergias, observacoes, respostasJson)) {
                return obterFichaSaude(cliente);
            }
        }

        ficha.setAlergias(alergias);
        ficha.setObservacoesMedicas(observacoes);
        ficha.setRespostas(respostasJson);
        ficha.setDataAtualizacao(LocalDateTime.now());
        ficha = fichaAnamneseRepository.save(ficha);

        // Histórico por versões: cópia COMPLETA da ficha a cada salvamento.
        fichaVersaoService.registrarVersao(ficha);

        return obterFichaSaude(cliente);
    }

    public List<AgendamentoClienteResponse> listarAgendamentos(Usuario cliente) {
        return agendamentoRepository.findByClienteId(cliente.getId())
                .stream()
                .sorted(RegrasAgendamento.ORDEM_DATA_HORA) // o 1º futuro é o "próximo"
                .map(this::paraResponse)
                .toList();
    }

    @Transactional
    public AgendamentoClienteResponse criarAgendamento(Usuario cliente, CriarAgendamentoClienteRequest request) {
        Servico servico = servicoRepository.findById(Long.valueOf(request.servicoId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));

        // O serviço precisa ser da clínica da cliente e estar ATIVO. Se a gestora
        // desativou o serviço com a página da cliente aberta, o agendamento é recusado.
        if (cliente.getClinica() == null || servico.getClinica() == null
                || !servico.getClinica().getId().equals(cliente.getClinica().getId())) {
            throw new RecursoNaoEncontradoException("Serviço não encontrado.");
        }
        if (!Boolean.TRUE.equals(servico.getAtivo())) {
            throw new RegraNegocioException(
                    "Este serviço não está mais disponível para agendamento. Escolha outro serviço.");
        }

        LocalDate data = LocalDate.parse(request.data());
        LocalTime hora = LocalTime.parse(request.hora());

        if (LocalDateTime.of(data, hora).isBefore(LocalDateTime.now())) {
            throw new RegraNegocioException("Essa data ou horário já passou. Escolha um horário futuro.");
        }

        LocalDate maxDate = LocalDate.now().plusMonths(2).withDayOfMonth(1).minusDays(1);
        if (data.isAfter(maxDate)) {
            throw new RegraNegocioException("A agenda está aberta só para este mês e o próximo.");
        }

        if (hora.plusMinutes(servico.getDuracao()).isAfter(LocalTime.of(19, 0))) {
            throw new RegraNegocioException("O procedimento ultrapassa o horário de encerramento da clínica (19:00).");
        }

        // O horário precisa estar LIVRE agora (expediente, bloqueios e outros
        // agendamentos). Evita dois agendamentos no mesmo horário quando a tela
        // de uma cliente está desatualizada.
        String horaTexto = hora.toString().substring(0, 5);
        boolean livre = agendamentoService
                .listarHorariosDisponiveisEmPeriodos(servico.getClinica().getSlug(), servico.getId(), data.toString())
                .stream()
                .flatMap(p -> p.slots().stream())
                .anyMatch(s -> horaTexto.equals(s.time()) && !Boolean.TRUE.equals(s.occupied()));
        if (!livre) {
            throw new ConflitoException(
                    "Este horário acabou de ficar indisponível. Escolha outro horário.");
        }

        // SINAL: cliente nova só agenda com o sinal pago (não existe agendamento
        // com sinal pendente). Cliente recorrente é isenta e confirma a presença depois.
        boolean recorrente = Boolean.TRUE.equals(cliente.getRecorrente());
        boolean sinalPago = request.valorSinal() != null && request.valorSinal().signum() > 0;
        if (!recorrente && !sinalPago) {
            throw new RegraNegocioException(
                    "Para agendar, é preciso pagar o sinal. Conclua o pagamento para garantir o horário.");
        }

        Agendamento agendamento = new Agendamento();
        agendamento.setCliente(cliente);
        agendamento.setServico(servico);
        agendamento.setNomeProcedimento(servico.getNome());
        agendamento.setValorServico(servico.getPreco());
        agendamento.setData(data);
        agendamento.setHora(hora);
        agendamento.setValorSinal(recorrente ? null : request.valorSinal());
        // Qualquer agendamento (cliente nova ou recorrente) nasce PENDENTE e só vira
        // CONFIRMADO quando a cliente confirma a presença (até 24h antes).
        // Agendado já dentro das 24h: o próprio agendamento vale como
        // confirmação (senão seria cancelado na hora pelo job automático).
        boolean dentroDoPrazo = RegrasAgendamento.prazoConfirmacao(agendamento).isAfter(RegrasAgendamento.agora());
        agendamento.setStatus(dentroDoPrazo
                ? StatusAgendamento.PENDENTE
                : StatusAgendamento.CONFIRMADO);

        agendamento = agendamentoRepository.save(agendamento);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(cliente);
        log.setAcao("CRIAR_AGENDAMENTO");
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);

        return paraResponse(agendamento);
    }

    /**
     * Cliente confirma a presença num agendamento PENDENTE (isenta de sinal).
     * Só é possível até 24 horas antes; depois disso o sistema cancela sozinho.
     */
    @Transactional
    public AgendamentoClienteResponse confirmarAgendamento(Usuario cliente, Long idAgendamento) {
        Agendamento a = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));

        if (!a.getCliente().getId().equals(cliente.getId())) {
            throw new RegraNegocioException("Agendamento não pertence ao usuário.");
        }
        if (a.getStatus() == StatusAgendamento.CONFIRMADO) {
            return paraResponse(a); // já confirmado: nada a fazer
        }
        if (a.getStatus() != StatusAgendamento.PENDENTE) {
            throw new ConflitoException("Só é possível confirmar um agendamento pendente.");
        }
        if (!RegrasAgendamento.prazoConfirmacao(a).isAfter(RegrasAgendamento.agora())) {
            throw new RegraNegocioException("O prazo para confirmar terminou ("
                    + RegrasAgendamento.PRAZO_CONFIRMACAO_HORAS
                    + " horas antes do horário). Fale com a clínica pelo WhatsApp.");
        }

        a.setStatus(StatusAgendamento.CONFIRMADO);
        agendamentoRepository.save(a);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(cliente);
        log.setAcao("CONFIRMACAO_CLIENTE");
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);

        return paraResponse(a);
    }

    /** Agendamento → resposta da área da cliente (inclui motivo e prazo de confirmação). */
    private AgendamentoClienteResponse paraResponse(Agendamento a) {
        return new AgendamentoClienteResponse(
                a.getId().toString(),
                a.getServico() != null ? a.getServico().getId().toString() : null,
                a.getNomeProcedimento(),
                a.getData().toString(),
                a.getHora().toString(),
                a.getServico() != null ? a.getServico().getDuracao() : null,
                a.getValorServico(),
                a.getValorSinal(),
                a.getStatus().name(),
                a.getCanceladoPor(),
                a.getMotivoCancelamento(),
                a.getStatus() == StatusAgendamento.PENDENTE
                        ? RegrasAgendamento.prazoConfirmacao(a).toString()
                        : null,
                a.getCancelamentoNoPrazo(),
                RegrasAgendamento.cancelarComReembolsoAte(a)
        );
    }

    /** Agendamento da própria cliente que ainda pode ser cancelado (senão, erro). */
    private Agendamento agendamentoCancelavel(Usuario cliente, Long idAgendamento, LocalDateTime agora) {
        Agendamento a = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));

        if (!a.getCliente().getId().equals(cliente.getId())) {
            throw new RegraNegocioException("Agendamento não pertence ao usuário.");
        }
        if (a.getStatus() == StatusAgendamento.CANCELADO) {
            throw new ConflitoException("Este agendamento já está cancelado.");
        }
        if (a.getStatus() != StatusAgendamento.PENDENTE && a.getStatus() != StatusAgendamento.CONFIRMADO) {
            throw new ConflitoException("Só é possível cancelar um agendamento que ainda não aconteceu.");
        }
        if (!RegrasAgendamento.inicio(a).isAfter(agora)) {
            throw new RegraNegocioException("O horário deste agendamento já passou. Fale com a clínica pelo WhatsApp.");
        }
        return a;
    }

    /**
     * Prévia do cancelamento: diz à cliente, ANTES de confirmar, se ela está
     * dentro do prazo de 24 horas para pedir o reembolso do sinal.
     */
    public CancelamentoPreviaResponse previaCancelamento(Usuario cliente, Long idAgendamento) {
        LocalDateTime agora = RegrasAgendamento.agora();
        Agendamento a = agendamentoCancelavel(cliente, idAgendamento, agora);
        return new CancelamentoPreviaResponse(
                a.getId().toString(),
                RegrasAgendamento.noPrazoDeReembolso(a, agora),
                RegrasAgendamento.temSinalRegistrado(a),
                a.getValorSinal(),
                RegrasAgendamento.prazoReembolso(a).toString(),
                RegrasAgendamento.PRAZO_REEMBOLSO_HORAS
        );
    }

    @Transactional
    public AgendamentoClienteResponse cancelarAgendamento(Usuario cliente, Long idAgendamento, String motivo) {
        // Mesmo relógio (fuso de São Paulo) da prévia: o resultado gravado é o
        // do momento real do cancelamento.
        LocalDateTime agora = RegrasAgendamento.agora();
        Agendamento a = agendamentoCancelavel(cliente, idAgendamento, agora);

        a.setStatus(StatusAgendamento.CANCELADO);
        a.setCanceladoPor("CLIENTE");
        a.setMotivoCancelamento(motivo);
        a.setDataCancelamento(agora);
        boolean noPrazo = RegrasAgendamento.noPrazoDeReembolso(a, agora);
        a.setCancelamentoNoPrazo(noPrazo);
        // Com 24h ou mais e sinal registrado → a gestora verifica o reembolso.
        // Menos de 24h: o sinal é retido (força maior: a cliente fala com a clínica).
        if (noPrazo && RegrasAgendamento.temSinalRegistrado(a)) {
            a.setReembolsoStatus(RegrasAgendamento.REEMBOLSO_A_VERIFICAR);
        }
        agendamentoRepository.save(a);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(cliente);
        log.setAcao("CANCELAMENTO_CLIENTE");
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);

        return paraResponse(a);
    }

    @Transactional
    public void excluirContaLGPD(Usuario cliente) {
        Long id = cliente.getId();
        cliente.setNome("CLIENTE_ANONIMIZADO");
        cliente.setEmail("anon-" + id + "@removido.invalid");
        cliente.setWhatsapp("ANON-" + id);
        cliente.setDataNascimento(LocalDate.of(1900, 1, 1));
        cliente.setSenha(passwordEncoder.encode(UUID.randomUUID().toString()));
        cliente.setStatus(StatusUsuario.ANONIMIZADO_LGPD);
        cliente.setSolicitouExclusao(true);
        usuarioRepository.save(cliente);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(null);
        log.setAcao("EXCLUSAO_CONTA_LGPD");
        log.setIpOrigem(IpOrigem.atual());
        logAuditoriaRepository.save(log);
    }
}