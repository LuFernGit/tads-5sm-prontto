package prontto_api.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** GET /auth/disponibilidade?email=&whatsapp=&cpfCnpj= → { emailEmUso, whatsappEmUso, cpfCnpjEmUso } */
    @GetMapping("/disponibilidade")
    public ResponseEntity<java.util.Map<String, Boolean>> verificarDisponibilidade(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String whatsapp,
            @RequestParam(required = false) String cpfCnpj) {
        return ResponseEntity.ok(authService.verificarDisponibilidade(email, whatsapp, cpfCnpj));
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioSessaoResponse> obterUsuarioAutenticado(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Usuario usuario)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.obterSessaoAtual(usuario));
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