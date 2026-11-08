package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import prontto_api.domain.Usuario;
import prontto_api.domain.enums.StatusAgendamento;
import prontto_api.dto.*;
import prontto_api.service.*;

import java.util.List;

@RestController
@RequestMapping("/gestora")
public class GestoraController {

    @Autowired
    private ClinicaService clinicaService;

    @Autowired
    private CatalogoService catalogoService;

    @Autowired
    private HorarioService horarioService;

    @Autowired
    private AgendamentoService agendamentoService;

    @GetMapping("/empresa")
    public ResponseEntity<EmpresaResponse> obterEmpresa(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        EmpresaResponse response = clinicaService.obterEmpresaGestora(gestora);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/empresa")
    public ResponseEntity<EmpresaResponse> atualizarEmpresa(Authentication authentication, @RequestBody @Valid EmpresaResponse request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        EmpresaResponse response = clinicaService.atualizarEmpresaGestora(gestora, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/empresa/encerrar")
    public ResponseEntity<Void> solicitarEncerramento(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        clinicaService.solicitarEncerramentoClinica(gestora);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<String>> listarCategorias(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<String> categorias = catalogoService.listarCategorias(gestora);
        return ResponseEntity.ok(categorias);
    }

    @PostMapping("/categorias")
    public ResponseEntity<List<String>> criarCategoria(Authentication authentication, @RequestBody @Valid CategoriaRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<String> categorias = catalogoService.criarCategoria(gestora, request);
        return ResponseEntity.ok(categorias);
    }

    @DeleteMapping("/categorias/{nome}")
    public ResponseEntity<List<String>> deletarCategoria(Authentication authentication, @PathVariable String nome) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<String> categorias = catalogoService.deletarCategoria(gestora, nome);
        return ResponseEntity.ok(categorias);
    }

    @GetMapping("/servicos")
    public ResponseEntity<List<ServicoResponse>> listarServicos(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<ServicoResponse> servicos = catalogoService.listarServicos(gestora);
        return ResponseEntity.ok(servicos);
    }

    @PostMapping("/servicos")
    public ResponseEntity<ServicoResponse> criarServico(Authentication authentication, @RequestBody @Valid ServicoRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        ServicoResponse response = catalogoService.criarServico(gestora, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/servicos/{id}")
    public ResponseEntity<ServicoResponse> atualizarServico(Authentication authentication, @PathVariable Long id, @RequestBody @Valid ServicoRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        ServicoResponse response = catalogoService.atualizarServico(gestora, id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<ServicoResponse> alterarStatusServico(Authentication authentication, @PathVariable Long id, @RequestBody @Valid StatusServicoPatchRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        ServicoResponse response = catalogoService.alterarStatusServico(gestora, id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/horarios")
    public ResponseEntity<List<HorarioFuncionamentoDto>> listarHorarios(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<HorarioFuncionamentoDto> horarios = horarioService.listarHorariosFuncionamento(gestora);
        return ResponseEntity.ok(horarios);
    }

    @PutMapping("/horarios")
    public ResponseEntity<List<HorarioFuncionamentoDto>> atualizarHorarios(Authentication authentication, @RequestBody List<HorarioFuncionamentoDto> request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<HorarioFuncionamentoDto> horarios = horarioService.atualizarHorariosFuncionamento(gestora, request);
        return ResponseEntity.ok(horarios);
    }

    @GetMapping("/bloqueios")
    public ResponseEntity<List<BloqueioHorarioDto>> listarBloqueios(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<BloqueioHorarioDto> bloqueios = horarioService.listarBloqueios(gestora);
        return ResponseEntity.ok(bloqueios);
    }

    @PostMapping("/bloqueios")
    public ResponseEntity<BloqueioHorarioDto> criarBloqueio(Authentication authentication, @RequestBody @Valid BloqueioHorarioDto request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        BloqueioHorarioDto response = horarioService.criarBloqueio(gestora, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/bloqueios/{id}")
    public ResponseEntity<Void> deletarBloqueio(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        horarioService.deletarBloqueio(gestora, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/agendamentos")
    public ResponseEntity<List<AgendamentoGestoraResponse>> listarAgendamentos(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        List<AgendamentoGestoraResponse> agendamentos = agendamentoService.listarAgendamentosGestora(gestora);
        return ResponseEntity.ok(agendamentos);
    }

    @PatchMapping("/agendamentos/{id}/status")
    public ResponseEntity<Void> alterarStatusAgendamento(Authentication authentication, @PathVariable Long id, @RequestParam StatusAgendamento status) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        agendamentoService.alterarStatusAgendamento(gestora, id, status);
        return ResponseEntity.ok().build();
    }
}