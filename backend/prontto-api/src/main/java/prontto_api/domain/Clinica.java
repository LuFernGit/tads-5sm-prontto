package prontto_api.domain;

import prontto_api.domain.enums.StatusClinica;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "clinica")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Clinica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_clinica")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_gestora", nullable = false)
    private Usuario gestora;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "cpf_cnpj", nullable = false, unique = true, length = 14)
    private String cpfCnpj;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 255)
    private String endereco;

    @Column(nullable = false, length = 20)
    private String whatsapp;

    @Column(name = "email_contato", nullable = false, length = 150)
    private String emailContato;

    @Column(length = 500)
    private String descricao;

    @Lob
    @Column(name = "logo_clinica", columnDefinition = "LONGTEXT")
    private String logoClinica;

    @Column(length = 100)
    private String instagram;

    @Column(length = 100)
    private String slogan;

    @Column(name = "titulo_principal", length = 150)
    private String tituloPrincipal;

    @Lob
    @Column(name = "imagem_capa", columnDefinition = "LONGTEXT")
    private String imagemCapa;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String favicon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusClinica status = StatusClinica.ATIVA;
}