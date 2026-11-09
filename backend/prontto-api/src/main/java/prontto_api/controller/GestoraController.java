package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import prontto_api.domain.Usuario;
import prontto_api.dto.*;
import prontto_api.service.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/gestora")
public class GestoraController {

    @Autowired private ClinicaService clinicaService;
    @Autowired private CatalogoService catalogoService;
    @Autowired private HorarioService horarioService;
    @Autowired private AgendamentoService agendamentoService;
    @Autowired private GestoraAdminService gestoraAdminService;

    @GetMapping("/empresa")
    public ResponseEntity<EmpresaResponse> obterEmpresa(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clinicaService.obterEmpresaGestora(gestora));
    }

    @PutMapping("/empresa")
    public ResponseEntity<EmpresaResponse> atualizarEmpresa(Authentication authentication, @RequestBody @Valid EmpresaResponse request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clinicaService.atualizarEmpresaGestora(gestora, request));
    }

    @PostMapping("/empresa/encerramento")
    public ResponseEntity<Void> solicitarEncerramento(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        clinicaService.solicitarEncerramentoClinica(gestora);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/painel")
    public ResponseEntity<PainelSemanalResponse> obterPainel(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.obterPainelSemanal(gestora));
    }

    @GetMapping("/horarios-funcionamento")
    public ResponseEntity<List<HorarioFuncionamentoDto>> listarHorariosFuncionamento(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(horarioService.listarHorariosFuncionamento(gestora));
    }

    @PutMapping("/horarios-funcionamento")
    public ResponseEntity<List<HorarioFuncionamentoDto>> atualizarHorariosFuncionamento(Authentication authentication, @RequestBody List<HorarioFuncionamentoDto> request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(horarioService.atualizarHorariosFuncionamento(gestora, request));
    }

    @GetMapping("/bloqueios")
    public ResponseEntity<List<BloqueioHorarioDto>> listarBloqueios(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(horarioService.listarBloqueios(gestora));
    }

    @PostMapping("/bloqueios")
    public ResponseEntity<BloqueioHorarioDto> criarBloqueio(Authentication authentication, @RequestBody @Valid BloqueioHorarioDto request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(horarioService.criarBloqueio(gestora, request));
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
        return ResponseEntity.ok(agendamentoService.listarAgendamentosGestora(gestora));
    }

    @PostMapping("/agendamentos/{id}/cancelamento")
    public ResponseEntity<AgendamentoGestoraResponse> cancelarAgendamento(Authentication authentication, @PathVariable Long id, @RequestBody @Valid MotivoCancelamentoRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(agendamentoService.cancelarAgendamentoGestora(gestora, id, request.motivo()));
    }

    @GetMapping("/clientes")
    public ResponseEntity<List<ClienteGestoraResponse>> listarClientes(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarClientes(gestora));
    }

    @PutMapping("/clientes/{id}/notas")
    public ResponseEntity<Void> salvarNotasCliente(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, String> body) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        gestoraAdminService.salvarNotasCliente(gestora, id, body.get("notasGestora"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<String>> listarCategorias(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.listarCategorias(gestora));
    }

    @PostMapping("/categorias")
    public ResponseEntity<List<String>> criarCategoria(Authentication authentication, @RequestBody @Valid CategoriaRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(catalogoService.criarCategoria(gestora, request));
    }

    @DeleteMapping("/categorias/{nome}")
    public ResponseEntity<List<String>> deletarCategoria(Authentication authentication, @PathVariable String nome) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.deletarCategoria(gestora, nome));
    }

    @GetMapping("/servicos")
    public ResponseEntity<List<ServicoResponse>> listarServicos(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.listarServicos(gestora));
    }

    @PostMapping("/servicos")
    public ResponseEntity<ServicoResponse> criarServico(Authentication authentication, @RequestBody @Valid ServicoRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(catalogoService.criarServico(gestora, request));
    }

    @PutMapping("/servicos/{id}")
    public ResponseEntity<ServicoResponse> atualizarServico(Authentication authentication, @PathVariable Long id, @RequestBody @Valid ServicoRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.atualizarServico(gestora, id, request));
    }

    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<ServicoResponse> alterarStatusServico(Authentication authentication, @PathVariable Long id, @RequestBody @Valid StatusServicoPatchRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.alterarStatusServico(gestora, id, request));
    }

    @GetMapping("/documentos")
    public ResponseEntity<List<DocumentoResponse>> listarDocumentos(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarDocumentos(gestora));
    }

    @PostMapping("/documentos/{id}/versoes")
    public ResponseEntity<DocumentoResponse> criarVersaoDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(gestoraAdminService.criarNovaVersao(gestora, id));
    }

    @PostMapping("/documentos/{id}/publicacao")
    public ResponseEntity<List<DocumentoResponse>> publicarDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.publicarDocumento(gestora, id));
    }

    @PostMapping("/documentos/{id}/inativacao")
    public ResponseEntity<DocumentoResponse> inativarDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.inativarDocumento(gestora, id));
    }

    @PostMapping("/documentos/{id}/arquivo")
    public ResponseEntity<DocumentoResponse> uploadArquivoDocumento(Authentication authentication, @PathVariable Long id, @RequestParam("arquivo") MultipartFile arquivo) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.salvarArquivoDocumento(gestora, id, arquivo));
    }

    @GetMapping("/mensagens/modelos")
    public ResponseEntity<List<ModeloMensagemDto>> listarModelosMensagem(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarModelosMensagem(gestora));
    }

    @PutMapping("/mensagens/modelos")
    public ResponseEntity<List<ModeloMensagemDto>> salvarModelosMensagem(Authentication authentication, @RequestBody List<ModeloMensagemDto> modelos) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.salvarModelosMensagem(gestora, modelos));
    }

    @GetMapping("/mensagens/destinatarios")
    public ResponseEntity<List<DestinatarioMensagemDto>> listarDestinatarios(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarDestinatarios(gestora));
    }

    @GetMapping("/auditoria")
    public ResponseEntity<List<LogAuditoriaResponse>> listarLogsAuditoria(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarAuditoria(gestora));
    }
}