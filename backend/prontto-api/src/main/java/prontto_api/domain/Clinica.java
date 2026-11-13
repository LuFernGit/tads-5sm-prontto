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

    // V5: monograma digitado pela gestora (antes era sempre calculado pelo nome)
    @Column(length = 3)
    private String iniciais;

    // V5: endereço em partes (o campo "endereco" guarda o texto completo da vitrine)
    @Column(length = 8)
    private String cep;
    @Column(length = 150)
    private String logradouro;
    @Column(length = 20)
    private String numero;
    @Column(length = 100)
    private String complemento;
    @Column(length = 100)
    private String bairro;
    @Column(length = 100)
    private String cidade;
    @Column(length = 2)
    private String uf;

    // V5: textos da tela Configurações
    @Column(name = "texto_horario", length = 200)
    private String textoHorario;
    @Column(name = "politica_cancelamento", length = 500)
    private String politicaCancelamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusClinica status = StatusClinica.ATIVA;
}