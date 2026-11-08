package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import prontto_api.domain.Usuario;
import prontto_api.dto.*;
import prontto_api.service.AuthService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/gestora/login")
    public ResponseEntity<TokenResponse> loginGestora(@RequestBody @Valid LoginRequest request) {
        TokenResponse response = authService.autenticarGestora(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/gestora/cadastro")
    public ResponseEntity<TokenResponse> cadastrarGestora(@RequestBody @Valid CadastroClinicaRequest request) {
        TokenResponse response = authService.cadastrarGestoraEClinica(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/clinicas/{slug}/auth/login")
    public ResponseEntity<TokenResponse> loginCliente(@PathVariable String slug, @RequestBody @Valid LoginRequest request) {
        TokenResponse response = authService.autenticarCliente(slug, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/clinicas/{slug}/clientes")
    public ResponseEntity<TokenResponse> cadastrarCliente(@PathVariable String slug, @RequestBody @Valid CadastroClienteRequest request) {
        TokenResponse response = authService.cadastrarCliente(slug, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioSessaoResponse> obterUsuarioAutenticado(Authentication authentication) {
        Usuario usuario = (Usuario) authentication.getPrincipal();
        UsuarioSessaoResponse response = new UsuarioSessaoResponse(
                usuario.getId().toString(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTipo().name(),
                usuario.getClinica() != null ? usuario.getClinica().getSlug() : null
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/recuperar-senha")
    public ResponseEntity<Void> recuperarSenha(@RequestBody @Valid RecuperarSenhaRequest request) {
        authService.recuperarSenha(request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }
}