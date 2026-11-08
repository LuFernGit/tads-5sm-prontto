package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import prontto_api.domain.Usuario;
import prontto_api.dto.AgendamentoClienteResponse;
import prontto_api.dto.CriarAgendamentoClienteRequest;
import prontto_api.service.AgendamentoService;

import java.util.List;

@RestController
@RequestMapping("/clinicas/{slug}/clientes")
public class ClienteController {

    @Autowired
    private AgendamentoService agendamentoService;

    @PostMapping("/agendamentos")
    public ResponseEntity<AgendamentoClienteResponse> criarAgendamento(
            @PathVariable String slug,
            Authentication authentication,
            @RequestBody @Valid CriarAgendamentoClienteRequest request) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        AgendamentoClienteResponse response = agendamentoService.criarAgendamento(slug, cliente, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/meus-agendamentos")
    public ResponseEntity<List<AgendamentoClienteResponse>> listarAgendamentosCliente(
            @PathVariable String slug,
            Authentication authentication) {
        Usuario cliente = (Usuario) authentication.getPrincipal();
        List<AgendamentoClienteResponse> agendamentos = agendamentoService.listarAgendamentosCliente(slug, cliente);
        return ResponseEntity.ok(agendamentos);
    }
}