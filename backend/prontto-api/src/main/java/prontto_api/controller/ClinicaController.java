package prontto_api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import prontto_api.dto.CalendarioDisponibilidadeResponse;
import prontto_api.dto.ClinicaVitrineResponse;
import prontto_api.dto.HorariosDisponiveisResponse;
import prontto_api.service.AgendamentoService;
import prontto_api.service.ClinicaService;

@RestController
@RequestMapping("/clinicas")
public class ClinicaController {

    @Autowired
    private ClinicaService clinicaService;

    @Autowired
    private AgendamentoService agendamentoService;

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

    @GetMapping("/{slug}/horarios")
    public ResponseEntity<HorariosDisponiveisResponse> obterHorariosDisponiveis(
            @PathVariable String slug,
            @RequestParam String data,
            @RequestParam("servicoId") Long servicoId) {
        HorariosDisponiveisResponse response = agendamentoService.listarHorariosDisponiveis(slug, servicoId, data);
        return ResponseEntity.ok(response);
    }
}