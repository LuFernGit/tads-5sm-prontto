package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import prontto_api.domain.Usuario;
import prontto_api.dto.*;
import prontto_api.service.*;

import java.time.LocalDate;
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

    /** Versão leve da agenda (muda quando há agendamento, cancelamento, bloqueio ou cliente nova). */
    @GetMapping("/agenda/versao")
    public ResponseEntity<java.util.Map<String, String>> obterVersaoAgenda(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(java.util.Map.of("versao", gestoraAdminService.obterVersaoAgenda(gestora)));
    }

    @GetMapping("/painel")
    public ResponseEntity<PainelSemanalResponse> obterPainel(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate semana) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.obterPainelSemanal(gestora, semana));
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

    /**
     * POST /gestora/agendamentos/{id}/reembolso/verificado → a gestora já analisou
     * o sinal de um cancelamento feito pela cliente (reembolso_status VERIFICADO).
     */
    @PostMapping("/agendamentos/{id}/reembolso/verificado")
    public ResponseEntity<AgendamentoGestoraResponse> marcarReembolsoVerificado(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(agendamentoService.marcarReembolsoVerificado(gestora, id));
    }

    @GetMapping("/clientes")
    public ResponseEntity<List<ClienteGestoraResponse>> listarClientes(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarClientes(gestora));
    }

    /** Histórico da ficha de saúde: versões completas, da atual para a mais antiga. */
    @GetMapping("/clientes/{id}/ficha/versoes")
    public ResponseEntity<List<FichaVersaoDto>> listarVersoesFicha(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarVersoesFicha(gestora, id));
    }

    /* ---------- Notas internas da gestora (CRUD) ---------- */

    @GetMapping("/clientes/{id}/notas")
    public ResponseEntity<List<NotaClienteDto>> listarNotas(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarNotas(gestora, id));
    }

    @PostMapping("/clientes/{id}/notas")
    public ResponseEntity<NotaClienteDto> criarNota(Authentication authentication, @PathVariable Long id,
                                                    @RequestBody java.util.Map<String, String> body) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(gestoraAdminService.criarNota(gestora, id, body.get("texto")));
    }

    @PutMapping("/clientes/{id}/notas/{notaId}")
    public ResponseEntity<NotaClienteDto> atualizarNota(Authentication authentication, @PathVariable Long id,
                                                        @PathVariable Long notaId,
                                                        @RequestBody java.util.Map<String, String> body) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.atualizarNota(gestora, id, notaId, body.get("texto")));
    }

    @DeleteMapping("/clientes/{id}/notas/{notaId}")
    public ResponseEntity<Void> excluirNota(Authentication authentication, @PathVariable Long id,
                                            @PathVariable Long notaId) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        gestoraAdminService.excluirNota(gestora, id, notaId);
        return ResponseEntity.noContent().build();
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

    /** GET /gestora/categorias/capas → { nome: capa } das categorias com foto própria. */
    @GetMapping("/categorias/capas")
    public ResponseEntity<Map<String, String>> listarCapasCategorias(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.listarCapasCategorias(gestora));
    }

    /** PUT /gestora/categorias/{nome}/capa { capa } → troca a foto (obrigatória; 400 se vazia). */
    @PutMapping("/categorias/{nome}/capa")
    public ResponseEntity<Map<String, String>> atualizarCapaCategoria(Authentication authentication, @PathVariable String nome,
                                                                      @RequestBody CategoriaCapaRequest request) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.atualizarCapaCategoria(gestora, nome, request != null ? request.capa() : null));
    }

    /** DELETE /gestora/categorias/{nome}?moverPara=Outra → move os serviços e exclui. */
    @DeleteMapping("/categorias/{nome}")
    public ResponseEntity<List<String>> deletarCategoria(Authentication authentication, @PathVariable String nome,
                                                         @RequestParam(required = false) String moverPara) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(catalogoService.deletarCategoria(gestora, nome, moverPara));
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

    @PostMapping("/documentos")
    public ResponseEntity<DocumentoDetalheResponse> criarDocumento(Authentication authentication, @RequestBody DocumentoRequest body) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(gestoraAdminService.criarDocumento(gestora, body));
    }

    /** Documentos excluídos (exclusão lógica): continuam salvos e podem ser restaurados. */
    @GetMapping("/documentos/excluidos")
    public ResponseEntity<List<DocumentoResponse>> listarDocumentosExcluidos(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.listarDocumentosExcluidos(gestora));
    }

    @PostMapping("/documentos/{id}/restauracao")
    public ResponseEntity<DocumentoResponse> restaurarDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.restaurarDocumento(gestora, id));
    }

    @GetMapping("/documentos/{id:\\d+}")
    public ResponseEntity<DocumentoDetalheResponse> obterDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.obterDocumento(gestora, id));
    }

    @PutMapping("/documentos/{id}")
    public ResponseEntity<DocumentoDetalheResponse> atualizarDocumento(Authentication authentication, @PathVariable Long id,
                                                                       @RequestBody DocumentoRequest body) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.atualizarDocumento(gestora, id, body));
    }

    @DeleteMapping("/documentos/{id}")
    public ResponseEntity<Void> excluirDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        gestoraAdminService.excluirDocumento(gestora, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/documentos/{id}/arquivo")
    public ResponseEntity<DocumentoResponse> removerArquivoDocumento(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.removerArquivoDocumento(gestora, id));
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

    @PostMapping("/mensagens/modelos")
    public ResponseEntity<ModeloMensagemDto> criarModeloMensagem(Authentication authentication, @RequestBody ModeloMensagemDto modelo) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(gestoraAdminService.criarModeloMensagem(gestora, modelo));
    }

    @PostMapping("/mensagens/modelos/padrao")
    public ResponseEntity<List<ModeloMensagemDto>> adicionarModelosPadrao(Authentication authentication) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.adicionarModelosPadrao(gestora));
    }

    @PutMapping("/mensagens/modelos/{id}")
    public ResponseEntity<ModeloMensagemDto> atualizarModeloMensagem(Authentication authentication, @PathVariable Long id, @RequestBody ModeloMensagemDto modelo) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.atualizarModeloMensagem(gestora, id, modelo));
    }

    @DeleteMapping("/mensagens/modelos/{id}")
    public ResponseEntity<Void> excluirModeloMensagem(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        gestoraAdminService.excluirModeloMensagem(gestora, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mensagens/modelos/{id}/restaurar")
    public ResponseEntity<ModeloMensagemDto> restaurarModeloMensagem(Authentication authentication, @PathVariable Long id) {
        Usuario gestora = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(gestoraAdminService.restaurarModeloPadrao(gestora, id));
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