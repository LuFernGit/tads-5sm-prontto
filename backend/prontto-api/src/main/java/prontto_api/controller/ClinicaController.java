package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import prontto_api.dto.*;
import prontto_api.service.AgendamentoService;
import prontto_api.service.AuthService;
import prontto_api.service.ClinicaService;

import java.util.List;

@RestController
@RequestMapping("/clinicas")
public class ClinicaController {

    @Autowired private ClinicaService clinicaService;
    @Autowired private AgendamentoService agendamentoService;
    @Autowired private AuthService authService;

    @GetMapping("/{slug}")
    public ResponseEntity<ClinicaVitrineResponse> obterVitrineClinica(@PathVariable String slug) {
        ClinicaVitrineResponse response = clinicaService.obterVitrinePorSlug(slug);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{slug}/calendario")
    public ResponseEntity<CalendarioDisponibilidadeResponse> obterCalendarioMensal(
            @PathVariable String slug,
            @RequestParam String mes) {
        CalendarioDisponibilidadeResponse response = clinicaService.obterCalendarioMensal(slug, mes);
        return ResponseEntity.ok(response);
    }

    // Retorna a lista de períodos (MANHÃ, TARDE, NOITE) esperada pelo front
    @GetMapping("/{slug}/horarios")
    public ResponseEntity<List<PeriodoHorarioResponse>> obterHorariosDisponiveis(
            @PathVariable String slug,
            @RequestParam String data,
            @RequestParam("servicoId") Long servicoId) {
        List<PeriodoHorarioResponse> response = agendamentoService.listarHorariosDisponiveisEmPeriodos(slug, servicoId, data);
        return ResponseEntity.ok(response);
    }

    // Rotas de login e cadastro da cliente vinculadas à clínica do link
    @PostMapping("/{slug}/auth/login")
    public ResponseEntity<TokenResponse> loginCliente(@PathVariable String slug, @RequestBody @Valid LoginRequest request) {
        TokenResponse response = authService.autenticarCliente(slug, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{slug}/clientes")
    public ResponseEntity<TokenResponse> cadastrarCliente(@PathVariable String slug, @RequestBody @Valid CadastroClienteRequest request) {
        TokenResponse response = authService.cadastrarCliente(slug, request);
        return ResponseEntity.status(201).body(response);
    }
}