package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import prontto_api.domain.Usuario;
import prontto_api.dto.*;
import prontto_api.service.ClienteAreaService;

import java.util.List;

@RestController
@RequestMapping("/cliente")
public class ClienteAreaController {

    @Autowired
    private ClienteAreaService clienteAreaService;

    @GetMapping("/perfil")
    public ResponseEntity<PerfilClienteDto> obterPerfil(Authentication authentication) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.obterPerfil(cliente));
    }

    @PutMapping("/perfil")
    public ResponseEntity<PerfilClienteDto> atualizarPerfil(Authentication authentication, @RequestBody @Valid PerfilClienteDto dto) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.atualizarPerfil(cliente, dto));
    }

    @GetMapping("/ficha-saude")
    public ResponseEntity<FichaAnamneseResponse> obterFichaSaude(Authentication authentication) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.obterFichaSaude(cliente));
    }

    @PutMapping("/ficha-saude")
    public ResponseEntity<FichaAnamneseResponse> atualizarFichaSaude(Authentication authentication, @RequestBody FichaAnamneseRequest request) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.atualizarFichaSaude(cliente, request));
    }

    @GetMapping("/agendamentos")
    public ResponseEntity<List<AgendamentoClienteResponse>> listarAgendamentos(Authentication authentication) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.listarAgendamentos(cliente));
    }

    @PostMapping("/agendamentos")
    public ResponseEntity<AgendamentoClienteResponse> criarAgendamento(Authentication authentication, @RequestBody @Valid CriarAgendamentoClienteRequest request) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.status(201).body(clienteAreaService.criarAgendamento(cliente, request));
    }

    /** Cliente confirma a presença num agendamento PENDENTE (até 24h antes). */
    @PostMapping("/agendamentos/{id}/confirmacao")
    public ResponseEntity<AgendamentoClienteResponse> confirmarAgendamento(Authentication authentication, @PathVariable Long id) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.confirmarAgendamento(cliente, id));
    }

    /**
     * GET /cliente/agendamentos/{id}/cancelamento → prévia: se cancelar agora,
     * está no prazo de 24h para pedir reembolso do sinal? (não cancela nada)
     */
    @GetMapping("/agendamentos/{id}/cancelamento")
    public ResponseEntity<CancelamentoPreviaResponse> previaCancelamento(Authentication authentication, @PathVariable Long id) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.previaCancelamento(cliente, id));
    }

    @PostMapping("/agendamentos/{id}/cancelamento")
    public ResponseEntity<AgendamentoClienteResponse> cancelarAgendamento(Authentication authentication, @PathVariable Long id, @RequestBody @Valid MotivoCancelamentoRequest request) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        return ResponseEntity.ok(clienteAreaService.cancelarAgendamento(cliente, id, request.motivo()));
    }

    @PostMapping("/conta/exclusao")
    public ResponseEntity<Void> solicitarExclusaoConta(Authentication authentication) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        clienteAreaService.excluirContaLGPD(cliente);
        return ResponseEntity.ok().build();
    }
}