package prontto_api.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "BLOQUEIO_HORARIO")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BloqueioHorario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bloqueio")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_clinica", nullable = false)
    private Clinica clinica;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "hora_inicio")
    private LocalTime horaInicio;

    @Column(name = "hora_fim")
    private LocalTime horaFim;

    @Column(length = 255)
    private String motivo;
}