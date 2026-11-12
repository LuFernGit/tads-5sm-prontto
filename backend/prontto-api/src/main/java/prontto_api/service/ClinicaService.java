package prontto_api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import prontto_api.domain.Clinica;
import prontto_api.domain.Horario;
import prontto_api.domain.Usuario;
import prontto_api.domain.enums.DiaSemana;
import prontto_api.domain.enums.StatusClinica;
import prontto_api.dto.CalendarioDisponibilidadeResponse;
import prontto_api.dto.ClinicaVitrineResponse;
import prontto_api.dto.EmpresaResponse;
import prontto_api.dto.ServicoResponse;
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

        var categorias = categoriaRepository.findByClinicaId(clinica.getId())
                .stream()
                .map(cat -> cat.getNome())
                .toList();

        var empresaPublica = new ClinicaVitrineResponse.EmpresaPublicaResponse(
                clinica.getSlug(),
                clinica.getNome(),
                obterIniciais(clinica.getNome()),
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
                null,
                null,
                null,
                null
        );

        return new ClinicaVitrineResponse(empresaPublica, servicosAtivos, categorias);
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
        log.setIpOrigem("127.0.0.1");
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

    private EmpresaResponse converterParaEmpresaResponse(Clinica clinica) {
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
                obterIniciais(clinica.getNome()),
                null,
                null,
                null,
                null
        );
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
