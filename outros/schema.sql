-- Schema V2 - Alteração na forma de armazenamento de imagens
-- Varchar(255) -> Longtext

DROP DATABASE IF EXISTS prontto;
CREATE DATABASE prontto
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE prontto;


-- ============================================
-- 1. TABELA USUARIO
-- Armazena clientes e gestoras.
-- ============================================

CREATE TABLE USUARIO (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha VARCHAR(255) NOT NULL COMMENT 'Hash da senha (BCrypt)',
    tipo ENUM('CLIENTE', 'GESTORA') NOT NULL,
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    solicitou_exclusao BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM(
        'ATIVO',
        'INATIVO',
        'ANONIMIZADO_LGPD',
        'ACESSO_RESTRITO',
        'EXCLUSAO_SOLICITADA'
    ) NOT NULL DEFAULT 'ATIVO',
   
    CONSTRAINT uq_usuario_email
        UNIQUE (email),
    CONSTRAINT uq_usuario_whatsapp
        UNIQUE (whatsapp),
    CONSTRAINT chk_usuario_clinica
        CHECK (
            (tipo = 'CLIENTE' AND id_clinica IS NOT NULL)
            OR
            (tipo = 'GESTORA' AND id_clinica IS NULL)
        ),

    INDEX idx_usuario_status (status),
    INDEX idx_usuario_clinica (id_clinica)
) ENGINE=InnoDB;


-- ============================================
-- 2. TABELA CLINICA
-- Armazena os dados cadastrais da clínica.
-- ============================================

CREATE TABLE CLINICA (
    id_clinica INT PRIMARY KEY AUTO_INCREMENT,
    id_gestora INT NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    cpf_cnpj VARCHAR(14) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email_contato VARCHAR(150) NOT NULL,
    descricao VARCHAR(500) NULL,
    logo_clinica LONGTEXT NULL,
    instagram VARCHAR(100) NULL,
    slogan VARCHAR(100) NULL,
    titulo_principal VARCHAR(150) NULL,
    imagem_capa LONGTEXT NULL,
    favicon LONGTEXT NULL,
    status ENUM(
        'ATIVA',
        'ENCERRAMENTO_SOLICITADO',
        'ENCERRADA'
    ) NOT NULL DEFAULT 'ATIVA',

    CONSTRAINT uq_clinica_cpf_cnpj
        UNIQUE (cpf_cnpj),
    CONSTRAINT chk_clinica_cpf_cnpj
        CHECK (CHAR_LENGTH(cpf_cnpj) IN (11, 14)),
    CONSTRAINT fk_clinica_gestora
        FOREIGN KEY (id_gestora)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_clinica_status (status)
) ENGINE=InnoDB;


ALTER TABLE USUARIO
    ADD CONSTRAINT fk_usuario_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica);


-- ============================================
-- 3. TABELA CATEGORIA
-- Grupos do catálogo de cada clínica.
-- ============================================

CREATE TABLE CATEGORIA (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    nome VARCHAR(100) NOT NULL,

    CONSTRAINT uq_categoria_clinica_nome
        UNIQUE (id_clinica, nome),

    CONSTRAINT fk_categoria_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================
-- 4. TABELA SERVICO
-- Armazena os procedimentos oferecidos.
-- ============================================

CREATE TABLE SERVICO (
    id_servico INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    id_categoria INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    preco DECIMAL(10,2) NOT NULL COMMENT 'Em reais',
    duracao INT NOT NULL COMMENT 'Duração em minutos',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    foto_servico LONGTEXT NULL,

    CONSTRAINT chk_servico_preco
        CHECK (preco >= 0),
    CONSTRAINT chk_servico_duracao
        CHECK (duracao > 0),
    CONSTRAINT fk_servico_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_servico_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES CATEGORIA(id_categoria)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_servico_clinica (id_clinica),
    INDEX idx_servico_categoria (id_categoria),
    INDEX idx_servico_ativo (ativo)
) ENGINE=InnoDB;


-- ============================================
-- 5. TABELA HORARIO
-- Define os horários de funcionamento.
-- ============================================

CREATE TABLE HORARIO (
    id_horario INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    dia_semana ENUM(
        'SEGUNDA',
        'TERCA',
        'QUARTA',
        'QUINTA',
        'SEXTA',
        'SABADO',
        'DOMINGO'
    ) NOT NULL,
   
    CONSTRAINT chk_horario_intervalo
        CHECK (hora_fim > hora_inicio),
    CONSTRAINT fk_horario_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_horario_clinica_dia
        (id_clinica, dia_semana)
) ENGINE=InnoDB;


-- ============================================
-- 6. TABELA BLOQUEIO_HORARIO
-- Bloqueios de dias e períodos na agenda.
-- ============================================

CREATE TABLE BLOQUEIO_HORARIO (
    id_bloqueio INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NULL,
    hora_fim TIME NULL,
    motivo VARCHAR(255) NULL,

    CONSTRAINT chk_bloqueio_intervalo
        CHECK (
            (hora_inicio IS NULL AND hora_fim IS NULL)
            OR
            (
                hora_inicio IS NOT NULL
                AND hora_fim IS NOT NULL
                AND hora_fim > hora_inicio
            )
        ),
    CONSTRAINT fk_bloqueio_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_bloqueio_data (id_clinica, data)
) ENGINE=InnoDB;


-- ============================================
-- 7. TABELA AGENDAMENTO
-- Registra os agendamentos dos clientes.
-- ============================================

CREATE TABLE AGENDAMENTO (
    id_agendamento INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_servico INT NOT NULL,
    nome_procedimento VARCHAR(100) NOT NULL,
    valor_servico DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    valor_sinal DECIMAL(10,2) NULL,
    cancelado_por ENUM('GESTORA', 'CLIENTE') NULL,
    motivo_cancelamento VARCHAR(255) NULL,
    data_cancelamento DATETIME NULL,
    status ENUM(
        'PENDENTE',
        'CONFIRMADO',
        'CONCLUIDO',
        'CANCELADO',
        'ARQUIVADO'
    ) NOT NULL DEFAULT 'PENDENTE',
   
    CONSTRAINT chk_agendamento_valor
        CHECK (valor_servico >= 0),
    CONSTRAINT chk_agendamento_sinal
        CHECK (valor_sinal IS NULL OR valor_sinal >= 0),
    CONSTRAINT chk_agendamento_cancelamento
        CHECK (
            status <> 'CANCELADO'
            OR (cancelado_por IS NOT NULL AND data_cancelamento IS NOT NULL)
        ),
    CONSTRAINT fk_agendamento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_agendamento_servico
        FOREIGN KEY (id_servico)
        REFERENCES SERVICO(id_servico)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_agendamento_data_hora (data, hora),
    INDEX idx_agendamento_usuario (id_usuario),
    INDEX idx_agendamento_servico (id_servico),
    INDEX idx_agendamento_status (status)
) ENGINE=InnoDB;


-- ============================================
-- 8. TABELA FICHA_ANAMNESE
-- ============================================

CREATE TABLE FICHA_ANAMNESE (
    id_anamnese INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    alergias VARCHAR(255) NOT NULL,
    observacoes_medicas VARCHAR(500) NOT NULL,
    respostas JSON NULL,
    notas_gestora VARCHAR(500) NULL,
    data_atualizacao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_anamnese_usuario
        UNIQUE (id_usuario),
    CONSTRAINT fk_anamnese_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================
-- 9. TABELA HISTORICO_ANAMNESE
-- ============================================

CREATE TABLE HISTORICO_ANAMNESE (
    id_historico INT PRIMARY KEY AUTO_INCREMENT,
    id_anamnese INT NOT NULL,
    campo_alterado VARCHAR(100) NOT NULL,
    valor_anterior TEXT NOT NULL,
    valor_novo TEXT NOT NULL,
    data_alteracao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historico_anamnese
        FOREIGN KEY (id_anamnese)
        REFERENCES FICHA_ANAMNESE(id_anamnese)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_historico_anamnese (id_anamnese),
    INDEX idx_historico_data (data_alteracao)
) ENGINE=InnoDB;


-- ============================================
-- 10. TABELA LOG_AUDITORIA
-- ============================================

CREATE TABLE LOG_AUDITORIA (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NULL,
    acao VARCHAR(100) NOT NULL,
    ip_origem VARCHAR(45) NULL,
    data_hora DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_log_usuario (id_usuario),
    INDEX idx_log_data_hora (data_hora)
) ENGINE=InnoDB;


-- ============================================
-- 11. TABELA DOCUMENTO_TERMO
-- ============================================

CREATE TABLE DOCUMENTO_TERMO (
    id_documento INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NULL,
    titulo VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(30) NOT NULL,
    versao VARCHAR(20) NOT NULL,
    caminho_arquivo LONGTEXT NULL,
    conteudo TEXT NULL,
    data_publicacao DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',

    CONSTRAINT chk_documento_status
        CHECK (
            status IN ('RASCUNHO', 'PUBLICADO', 'INATIVO')
        ),
    CONSTRAINT fk_documento_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_documento_clinica (id_clinica),
    INDEX idx_documento_status (status)
) ENGINE=InnoDB;


-- ============================================
-- 12. TABELA ACEITE_DOCUMENTO
-- ============================================

CREATE TABLE ACEITE_DOCUMENTO (
    id_aceite INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_documento INT NOT NULL,
    papel_no_aceite VARCHAR(20) NOT NULL,
    data_hora_aceite DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    ip_origem VARCHAR(45) NULL,

    CONSTRAINT chk_aceite_papel
        CHECK (papel_no_aceite IN ('GESTORA', 'CLIENTE')),
    CONSTRAINT fk_aceite_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_aceite_documento
        FOREIGN KEY (id_documento)
        REFERENCES DOCUMENTO_TERMO(id_documento)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT uq_aceite_usuario_documento
        UNIQUE (id_usuario, id_documento),

    INDEX idx_aceite_documento (id_documento)
) ENGINE=InnoDB;


-- ============================================
-- 13. TABELA MODELO_MENSAGEM
-- ============================================

CREATE TABLE MODELO_MENSAGEM (
    id_modelo INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    finalidade ENUM(
        'CONFIRMACAO',
        'CANCELAMENTO',
        'LEMBRETE',
        'MANUTENCAO',
        'ALTERACAO',
        'REAGENDAMENTO',
        'PERSONALIZADA'
    ) NOT NULL DEFAULT 'PERSONALIZADA',
   
    CONSTRAINT fk_modelo_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_modelo_clinica (id_clinica)
) ENGINE=InnoDB;


-- ============================================
-- DADOS INICIAIS
-- Documentos gerais do Prontto (id_clinica NULL).
-- ============================================

INSERT INTO DOCUMENTO_TERMO
    (id_clinica, titulo, tipo_documento, versao, caminho_arquivo, conteudo, status, data_publicacao)
VALUES
    (NULL, 'Termos de Uso do Prontto', 'TERMOS_USO', '1.0', NULL,
     'Texto dos Termos de Uso do Prontto.', 'PUBLICADO', NOW()),
    (NULL, 'Política de Privacidade do Prontto', 'POLITICA_PRIVACIDADE', '1.0', NULL,
     'Texto da Política de Privacidade do Prontto.', 'PUBLICADO', NOW());




-- Schema V1 - Original

DROP DATABASE IF EXISTS prontto;
CREATE DATABASE prontto
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;


USE prontto;




-- ============================================
-- 1. TABELA USUARIO
-- Armazena clientes e gestoras.
-- ============================================


CREATE TABLE USUARIO (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NULL,
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha VARCHAR(255) NOT NULL COMMENT 'Hash da senha (BCrypt)',
    tipo ENUM('CLIENTE', 'GESTORA') NOT NULL,
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    solicitou_exclusao BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM(
        'ATIVO',
        'INATIVO',
        'ANONIMIZADO_LGPD',
        'ACESSO_RESTRITO',
        'EXCLUSAO_SOLICITADA'
    ) NOT NULL DEFAULT 'ATIVO',
   
    CONSTRAINT uq_usuario_email
        UNIQUE (email),
    CONSTRAINT uq_usuario_whatsapp
        UNIQUE (whatsapp),
    CONSTRAINT chk_usuario_clinica
        CHECK (
            (tipo = 'CLIENTE' AND id_clinica IS NOT NULL)
            OR
            (tipo = 'GESTORA' AND id_clinica IS NULL)
        ),


    INDEX idx_usuario_status (status),
    INDEX idx_usuario_clinica (id_clinica)
) ENGINE=InnoDB;




-- ============================================
-- 2. TABELA CLINICA
-- Armazena os dados cadastrais da clínica.
-- As cores da vitrine não são personalizáveis
-- (o front usa sempre a paleta padrão).
-- ============================================


CREATE TABLE CLINICA (
    id_clinica INT PRIMARY KEY AUTO_INCREMENT,
    id_gestora INT NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    cpf_cnpj VARCHAR(14) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email_contato VARCHAR(150) NOT NULL,
    descricao VARCHAR(500) NULL,
    logo_clinica VARCHAR(255) NULL,
    instagram VARCHAR(100) NULL,
    slogan VARCHAR(100) NULL,
    titulo_principal VARCHAR(150) NULL,
    imagem_capa VARCHAR(255) NULL,
    favicon VARCHAR(255) NULL,
    status ENUM(
        'ATIVA',
        'ENCERRAMENTO_SOLICITADO',
        'ENCERRADA'
    ) NOT NULL DEFAULT 'ATIVA',


    CONSTRAINT uq_clinica_cpf_cnpj
        UNIQUE (cpf_cnpj),
    CONSTRAINT chk_clinica_cpf_cnpj
        CHECK (CHAR_LENGTH(cpf_cnpj) IN (11, 14)),
    CONSTRAINT fk_clinica_gestora
        FOREIGN KEY (id_gestora)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_clinica_status (status)
) ENGINE=InnoDB;




ALTER TABLE USUARIO
    ADD CONSTRAINT fk_usuario_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica);




-- ============================================
-- 3. TABELA CATEGORIA (NOVO)
-- Grupos do catálogo de cada clínica.
-- Permite ter categoria sem serviço e impede
-- nome repetido dentro da mesma clínica.
-- ============================================


CREATE TABLE CATEGORIA (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    nome VARCHAR(100) NOT NULL,


    CONSTRAINT uq_categoria_clinica_nome
        UNIQUE (id_clinica, nome),


    CONSTRAINT fk_categoria_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;




-- ============================================
-- 4. TABELA SERVICO
-- Armazena os procedimentos oferecidos.
-- ============================================


CREATE TABLE SERVICO (
    id_servico INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    id_categoria INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    preco DECIMAL(10,2) NOT NULL COMMENT 'Em reais',
    duracao INT NOT NULL COMMENT 'Duração em minutos',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    foto_servico VARCHAR(255) NULL,


    CONSTRAINT chk_servico_preco
        CHECK (preco >= 0),
    CONSTRAINT chk_servico_duracao
        CHECK (duracao > 0),
    CONSTRAINT fk_servico_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_servico_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES CATEGORIA(id_categoria)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_servico_clinica (id_clinica),
    INDEX idx_servico_categoria (id_categoria),
    INDEX idx_servico_ativo (ativo)
) ENGINE=InnoDB;




-- ============================================
-- 5. TABELA HORARIO
-- Define os horários de funcionamento.
-- Horário com almoço = duas linhas no mesmo dia
-- (ex.: 09:00–12:00 e 13:00–19:00).
-- ============================================


CREATE TABLE HORARIO (
    id_horario INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    dia_semana ENUM(
        'SEGUNDA',
        'TERCA',
        'QUARTA',
        'QUINTA',
        'SEXTA',
        'SABADO',
        'DOMINGO'
    ) NOT NULL,
   
    CONSTRAINT chk_horario_intervalo
        CHECK (hora_fim > hora_inicio),
    CONSTRAINT fk_horario_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_horario_clinica_dia
        (id_clinica, dia_semana)
) ENGINE=InnoDB;




-- ============================================
-- 6. TABELA BLOQUEIO_HORARIO
-- Registra bloqueios de dias e períodos
-- excepcionais na agenda da clínica.
-- O bloqueio é permitido mesmo com agendamentos
-- no período: a gestora é alertada e os
-- agendamentos NÃO são cancelados automaticamente.
-- ============================================


CREATE TABLE BLOQUEIO_HORARIO (
    id_bloqueio INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NULL,
    hora_fim TIME NULL,
    motivo VARCHAR(255) NULL,


    CONSTRAINT chk_bloqueio_intervalo
        CHECK (
            (hora_inicio IS NULL AND hora_fim IS NULL)
            OR
            (
                hora_inicio IS NOT NULL
                AND hora_fim IS NOT NULL
                AND hora_fim > hora_inicio
            )
        ),
    CONSTRAINT fk_bloqueio_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_bloqueio_data (id_clinica, data)
) ENGINE=InnoDB;




-- ============================================
-- 7. TABELA AGENDAMENTO
-- Registra os agendamentos dos clientes.
-- Nome e preço são preservados no momento
-- da reserva (snapshot).
-- ============================================


CREATE TABLE AGENDAMENTO (
    id_agendamento INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_servico INT NOT NULL,
    nome_procedimento VARCHAR(100) NOT NULL,
    valor_servico DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    valor_sinal DECIMAL(10,2) NULL,
    cancelado_por ENUM('GESTORA', 'CLIENTE') NULL,
    motivo_cancelamento VARCHAR(255) NULL,
    data_cancelamento DATETIME NULL,
    status ENUM(
        'PENDENTE',
        'CONFIRMADO',
        'CONCLUIDO',
        'CANCELADO',
        'ARQUIVADO'
    ) NOT NULL DEFAULT 'PENDENTE',
   
    CONSTRAINT chk_agendamento_valor
        CHECK (valor_servico >= 0),
    CONSTRAINT chk_agendamento_sinal
        CHECK (valor_sinal IS NULL OR valor_sinal >= 0),
    CONSTRAINT chk_agendamento_cancelamento
        CHECK (
            status <> 'CANCELADO'
            OR (cancelado_por IS NOT NULL AND data_cancelamento IS NOT NULL)
        ),
    CONSTRAINT fk_agendamento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_agendamento_servico
        FOREIGN KEY (id_servico)
        REFERENCES SERVICO(id_servico)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_agendamento_data_hora (data, hora),
    INDEX idx_agendamento_usuario (id_usuario),
    INDEX idx_agendamento_servico (id_servico),
    INDEX idx_agendamento_status (status)
) ENGINE=InnoDB;




-- ============================================
-- 8. TABELA FICHA_ANAMNESE
-- Cada usuário pode ter no máximo uma ficha.
-- Armazena informações de saúde da cliente
-- e notas internas da gestora.
-- Na exclusão LGPD a ficha é MANTIDA, com
-- acesso só da gestora.
-- ============================================


CREATE TABLE FICHA_ANAMNESE (
    id_anamnese INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    alergias VARCHAR(255) NOT NULL,
    observacoes_medicas VARCHAR(500) NOT NULL,
    respostas JSON NULL,
    notas_gestora VARCHAR(500) NULL,
    data_atualizacao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT uq_anamnese_usuario
        UNIQUE (id_usuario),
    CONSTRAINT fk_anamnese_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;




-- ============================================
-- 9. TABELA HISTORICO_ANAMNESE
-- Registra as alterações nas respostas da
-- ficha de anamnese da cliente.
-- ============================================


CREATE TABLE HISTORICO_ANAMNESE (
    id_historico INT PRIMARY KEY AUTO_INCREMENT,
    id_anamnese INT NOT NULL,
    campo_alterado VARCHAR(100) NOT NULL,
    valor_anterior TEXT NOT NULL,
    valor_novo TEXT NOT NULL,
    data_alteracao DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_historico_anamnese
        FOREIGN KEY (id_anamnese)
        REFERENCES FICHA_ANAMNESE(id_anamnese)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_historico_anamnese (id_anamnese),
    INDEX idx_historico_data (data_alteracao)
) ENGINE=InnoDB;




-- ============================================
-- 10. TABELA LOG_AUDITORIA
-- Registra ações relevantes para segurança.
-- O usuário pode ser nulo em ações anônimas.
-- ============================================


CREATE TABLE LOG_AUDITORIA (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NULL,
    acao VARCHAR(100) NOT NULL,
    ip_origem VARCHAR(45) NULL,
    data_hora DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_log_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE,


    INDEX idx_log_usuario (id_usuario),
    INDEX idx_log_data_hora (data_hora)
) ENGINE=InnoDB;




-- ============================================
-- 11. TABELA DOCUMENTO_TERMO
-- Armazena os documentos legais da plataforma
-- Prontto e das clínicas cadastradas.
-- ============================================


CREATE TABLE DOCUMENTO_TERMO (
    id_documento INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NULL,
    titulo VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(30) NOT NULL,
    versao VARCHAR(20) NOT NULL,
    caminho_arquivo VARCHAR(255) NULL,
    conteudo TEXT NULL,
    data_publicacao DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO',


    CONSTRAINT chk_documento_status
        CHECK (
            status IN ('RASCUNHO', 'PUBLICADO', 'INATIVO')
        ),
    CONSTRAINT fk_documento_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_documento_clinica (id_clinica),
    INDEX idx_documento_status (status)
) ENGINE=InnoDB;




-- ============================================
-- 12. TABELA ACEITE_DOCUMENTO
-- Registra o aceite dos documentos pelos usuários.
-- ============================================


CREATE TABLE ACEITE_DOCUMENTO (
    id_aceite INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_documento INT NOT NULL,
    papel_no_aceite VARCHAR(20) NOT NULL,
    data_hora_aceite DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    ip_origem VARCHAR(45) NULL,


    CONSTRAINT chk_aceite_papel
        CHECK (papel_no_aceite IN ('GESTORA', 'CLIENTE')),
    CONSTRAINT fk_aceite_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_aceite_documento
        FOREIGN KEY (id_documento)
        REFERENCES DOCUMENTO_TERMO(id_documento)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT uq_aceite_usuario_documento
        UNIQUE (id_usuario, id_documento),


    INDEX idx_aceite_documento (id_documento)
) ENGINE=InnoDB;




-- ============================================
-- 13. TABELA MODELO_MENSAGEM (NOVO)
-- Modelos de mensagem de WhatsApp de cada clínica.
-- O texto aceita campos como {nome}, {procedimento},
-- {data}, {horario}, {motivo} e {clinica}.
-- ============================================


CREATE TABLE MODELO_MENSAGEM (
    id_modelo INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    finalidade ENUM(
        'CONFIRMACAO',
        'CANCELAMENTO',
        'LEMBRETE',
        'MANUTENCAO',
        'ALTERACAO',
        'REAGENDAMENTO',
        'PERSONALIZADA'
    ) NOT NULL DEFAULT 'PERSONALIZADA',
   
    CONSTRAINT fk_modelo_clinica
        FOREIGN KEY (id_clinica)
        REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,


    INDEX idx_modelo_clinica (id_clinica)
) ENGINE=InnoDB;




-- ============================================
-- DADOS INICIAIS (NOVO)
-- Documentos gerais do Prontto (id_clinica NULL).
-- Precisam existir publicados para a gestora
-- aceitá-los no cadastro da empresa.
-- ============================================


INSERT INTO DOCUMENTO_TERMO
    (id_clinica, titulo, tipo_documento, versao, caminho_arquivo, conteudo, status, data_publicacao)
VALUES
    (NULL, 'Termos de Uso do Prontto', 'TERMOS_USO', '1.0', NULL,
     'Texto dos Termos de Uso do Prontto.', 'PUBLICADO', NOW()),
    (NULL, 'Política de Privacidade do Prontto', 'POLITICA_PRIVACIDADE', '1.0', NULL,
     'Texto da Política de Privacidade do Prontto.', 'PUBLICADO', NOW());
