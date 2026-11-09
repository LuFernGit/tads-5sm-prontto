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
    @Autowired private HistoricoAnamneseRepository historicoAnamneseRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private LogAuditoriaRepository logAuditoriaRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

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

        if (ficha.getId() != null) {
            HistoricoAnamnese hist = new HistoricoAnamnese();
            hist.setFichaAnamnese(ficha);
            hist.setCampoAlterado("respostas");
            hist.setValorAnterior(ficha.getRespostas() != null ? ficha.getRespostas() : "");
            hist.setValorNovo(respostasJson);
            hist.setDataAlteracao(LocalDateTime.now());
            historicoAnamneseRepository.save(hist);
        }

        ficha.setAlergias(request.alergias() != null ? request.alergias() : "Nenhuma");
        ficha.setObservacoesMedicas(request.observacoes_medicas() != null ? request.observacoes_medicas() : "Nenhuma");
        ficha.setRespostas(respostasJson);
        ficha.setDataAtualizacao(LocalDateTime.now());
        fichaAnamneseRepository.save(ficha);

        return obterFichaSaude(cliente);
    }

    public List<AgendamentoClienteResponse> listarAgendamentos(Usuario cliente) {
        return agendamentoRepository.findByClienteId(cliente.getId())
                .stream()
                .map(a -> new AgendamentoClienteResponse(
                        a.getId().toString(),
                        a.getServico() != null ? a.getServico().getId().toString() : null,
                        a.getNomeProcedimento(),
                        a.getData().toString(),
                        a.getHora().toString(),
                        a.getServico() != null ? a.getServico().getDuracao() : null,
                        a.getValorServico(),
                        a.getValorSinal(),
                        a.getStatus().name()
                ))
                .toList();
    }

    @Transactional
    public AgendamentoClienteResponse criarAgendamento(Usuario cliente, CriarAgendamentoClienteRequest request) {
        Servico servico = servicoRepository.findById(Long.valueOf(request.servicoId()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));

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

        Agendamento agendamento = new Agendamento();
        agendamento.setCliente(cliente);
        agendamento.setServico(servico);
        agendamento.setNomeProcedimento(servico.getNome());
        agendamento.setValorServico(servico.getPreco());
        agendamento.setData(data);
        agendamento.setHora(hora);
        agendamento.setValorSinal(request.valorSinal());
        agendamento.setStatus(request.valorSinal() != null ? StatusAgendamento.CONFIRMADO : StatusAgendamento.PENDENTE);

        agendamento = agendamentoRepository.save(agendamento);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(cliente);
        log.setAcao("CRIAR_AGENDAMENTO");
        log.setIpOrigem("127.0.0.1");
        logAuditoriaRepository.save(log);

        return new AgendamentoClienteResponse(
                agendamento.getId().toString(),
                servico.getId().toString(),
                servico.getNome(),
                data.toString(),
                hora.toString(),
                servico.getDuracao(),
                servico.getPreco(),
                agendamento.getValorSinal(),
                agendamento.getStatus().name()
        );
    }

    @Transactional
    public AgendamentoClienteResponse cancelarAgendamento(Usuario cliente, Long idAgendamento, String motivo) {
        Agendamento a = agendamentoRepository.findById(idAgendamento)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado."));

        if (!a.getCliente().getId().equals(cliente.getId())) {
            throw new RegraNegocioException("Agendamento não pertence ao usuário.");
        }

        if (a.getStatus() == StatusAgendamento.CANCELADO) {
            throw new ConflitoException("Este agendamento já está cancelado.");
        }

        a.setStatus(StatusAgendamento.CANCELADO);
        a.setCanceladoPor("CLIENTE");
        a.setMotivoCancelamento(motivo);
        a.setDataCancelamento(LocalDateTime.now());
        agendamentoRepository.save(a);

        LogAuditoria log = new LogAuditoria();
        log.setUsuario(cliente);
        log.setAcao("CANCELAMENTO_CLIENTE");
        log.setIpOrigem("127.0.0.1");
        logAuditoriaRepository.save(log);

        return new AgendamentoClienteResponse(
                a.getId().toString(),
                a.getServico() != null ? a.getServico().getId().toString() : null,
                a.getNomeProcedimento(),
                a.getData().toString(),
                a.getHora().toString(),
                a.getServico() != null ? a.getServico().getDuracao() : null,
                a.getValorServico(),
                a.getValorSinal(),
                a.getStatus().name()
        );
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
        log.setIpOrigem("127.0.0.1");
        logAuditoriaRepository.save(log);
    }
}