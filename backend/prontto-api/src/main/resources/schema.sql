-- ============================================
-- PRONTTO - Schema do banco de dados (MySQL 8)
--
-- V2 - Imagens passam de VARCHAR(255) para LONGTEXT (Base64).
-- V3 - Script idempotente: não apaga mais o banco a cada start.
--      * CREATE DATABASE / CREATE TABLE com IF NOT EXISTS
--      * FK circular USUARIO -> CLINICA adicionada só se não existir
--      * Dados iniciais inseridos só se ainda não existirem
--
-- Executado automaticamente pelo Spring a cada start
-- (spring.sql.init.mode: always). Cria só o que ainda não existe e
-- mantém os dados entre execuções.
--
-- Atenção: o script NÃO altera tabelas já existentes. Se mudar uma
-- coluna aqui, recrie o banco manualmente: DROP DATABASE prontto;
-- ============================================

CREATE DATABASE IF NOT EXISTS prontto
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE prontto;


-- ============================================
-- 1. TABELA USUARIO
-- Armazena clientes e gestoras.
-- ============================================

CREATE TABLE IF NOT EXISTS USUARIO (
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

CREATE TABLE IF NOT EXISTS CLINICA (
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


-- FK circular (USUARIO <-> CLINICA): só adiciona se ainda não existir.
SET @fk_existe = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                  WHERE CONSTRAINT_SCHEMA = DATABASE()
                    AND CONSTRAINT_NAME = 'fk_usuario_clinica');
SET @sql_fk = IF(@fk_existe = 0,
    'ALTER TABLE USUARIO ADD CONSTRAINT fk_usuario_clinica FOREIGN KEY (id_clinica) REFERENCES CLINICA(id_clinica)',
    'SELECT 1');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;


-- ============================================
-- 3. TABELA CATEGORIA
-- Grupos do catálogo de cada clínica.
-- ============================================

CREATE TABLE IF NOT EXISTS CATEGORIA (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    capa LONGTEXT NULL,               -- foto de capa na vitrine (data URL); NULL = capa padrão

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

CREATE TABLE IF NOT EXISTS SERVICO (
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

CREATE TABLE IF NOT EXISTS HORARIO (
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

CREATE TABLE IF NOT EXISTS BLOQUEIO_HORARIO (
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

CREATE TABLE IF NOT EXISTS AGENDAMENTO (
    id_agendamento INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_servico INT NOT NULL,
    nome_procedimento VARCHAR(100) NOT NULL,
    valor_servico DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    valor_sinal DECIMAL(10,2) NULL,
    cancelado_por ENUM('GESTORA', 'CLIENTE', 'SISTEMA') NULL,  -- SISTEMA = sem confirmação até 24h antes
    motivo_cancelamento VARCHAR(255) NULL,
    data_cancelamento DATETIME NULL,
    cancelamento_no_prazo BOOLEAN NULL,      -- cliente cancelou com 24h+ de antecedência?
    reembolso_status VARCHAR(20) NULL,       -- A_VERIFICAR | VERIFICADO (análise do sinal pela gestora)
    reembolso_verificado_em DATETIME NULL,
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

CREATE TABLE IF NOT EXISTS FICHA_ANAMNESE (
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

CREATE TABLE IF NOT EXISTS HISTORICO_ANAMNESE (
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

CREATE TABLE IF NOT EXISTS LOG_AUDITORIA (
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

CREATE TABLE IF NOT EXISTS DOCUMENTO_TERMO (
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

CREATE TABLE IF NOT EXISTS ACEITE_DOCUMENTO (
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

CREATE TABLE IF NOT EXISTS MODELO_MENSAGEM (
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
-- AJUSTES EM TABELAS JÁ EXISTENTES (V4)
-- O CREATE TABLE IF NOT EXISTS não altera tabelas antigas; estes comandos
-- podem rodar a cada start sem problema (o resultado é sempre o mesmo).
-- ============================================

-- V4: cancelamento automático pelo SISTEMA (cliente não confirmou até 24h antes).
ALTER TABLE AGENDAMENTO
    MODIFY COLUMN cancelado_por ENUM('GESTORA', 'CLIENTE', 'SISTEMA') NULL;


-- ============================================
-- V5 (idempotente)
--  - CLINICA: iniciais (monograma), endereço em partes, texto do horário de
--    atendimento e política de cancelamento (tela Configurações/Personalização).
--  - NOTA_CLIENTE: várias notas internas da gestora por cliente (CRUD).
-- ============================================
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'iniciais');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN iniciais VARCHAR(3) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'cep');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN cep VARCHAR(8) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'logradouro');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN logradouro VARCHAR(150) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'numero');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN numero VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'complemento');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN complemento VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'bairro');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN bairro VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'cidade');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN cidade VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'uf');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN uf CHAR(2) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'texto_horario');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN texto_horario VARCHAR(200) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CLINICA' AND COLUMN_NAME = 'politica_cancelamento');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CLINICA ADD COLUMN politica_cancelamento VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- DOCUMENTO_TERMO.nome_arquivo: nome do PDF anexado (o conteúdo fica em
-- caminho_arquivo, como data URL base64).
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DOCUMENTO_TERMO' AND COLUMN_NAME = 'nome_arquivo');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE DOCUMENTO_TERMO ADD COLUMN nome_arquivo VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- Recorrência é regra do sistema: só é recorrente quem tem atendimento
-- CONCLUÍDO. Corrige contas que nasceram recorrentes sem nenhum atendimento.
UPDATE USUARIO u
SET u.recorrente = FALSE
WHERE u.tipo = 'CLIENTE' AND u.recorrente = TRUE
  AND NOT EXISTS (SELECT 1 FROM AGENDAMENTO a WHERE a.id_usuario = u.id_usuario AND a.status = 'CONCLUIDO');

CREATE TABLE IF NOT EXISTS NOTA_CLIENTE (
    id_nota INT PRIMARY KEY AUTO_INCREMENT,
    id_clinica INT NOT NULL,
    id_usuario INT NOT NULL,          -- a cliente
    texto VARCHAR(1000) NOT NULL,
    criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em DATETIME NULL,

    CONSTRAINT fk_nota_clinica
        FOREIGN KEY (id_clinica) REFERENCES CLINICA(id_clinica)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_nota_cliente
        FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_nota_cliente (id_usuario)
) ENGINE=InnoDB;

-- A nota única antiga (FICHA_ANAMNESE.notas_gestora) vira a primeira nota da
-- lista, uma vez só (se a cliente ainda não tiver nenhuma nota).
INSERT INTO NOTA_CLIENTE (id_clinica, id_usuario, texto, criada_em)
SELECT u.id_clinica, f.id_usuario, f.notas_gestora, COALESCE(f.data_atualizacao, NOW())
FROM FICHA_ANAMNESE f
JOIN USUARIO u ON u.id_usuario = f.id_usuario
WHERE f.notas_gestora IS NOT NULL AND TRIM(f.notas_gestora) <> ''
  AND u.id_clinica IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM NOTA_CLIENTE n WHERE n.id_usuario = f.id_usuario);


-- ============================================
-- V6 (idempotente)
--  - DOCUMENTO_TERMO.excluido_em: exclusão LÓGICA dos documentos (o documento
--    sai da lista, mas fica salvo com texto e PDF e pode ser restaurado).
--  - FICHA_ANAMNESE_VERSAO: histórico da ficha de saúde por VERSÕES COMPLETAS
--    (uma cópia inteira da ficha a cada salvamento da cliente).
-- ============================================
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DOCUMENTO_TERMO' AND COLUMN_NAME = 'excluido_em');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE DOCUMENTO_TERMO ADD COLUMN excluido_em DATETIME NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

CREATE TABLE IF NOT EXISTS FICHA_ANAMNESE_VERSAO (
    id_versao INT PRIMARY KEY AUTO_INCREMENT,
    id_anamnese INT NOT NULL,
    numero_versao INT NOT NULL,             -- 1, 2, 3... por ficha
    alergias VARCHAR(255) NULL,
    observacoes_medicas VARCHAR(500) NULL,
    respostas JSON NULL,                    -- a ficha INTEIRA naquele momento
    criada_em DATETIME NULL,                -- data e hora do salvamento

    CONSTRAINT uq_ficha_versao
        UNIQUE (id_anamnese, numero_versao),
    CONSTRAINT fk_versao_anamnese
        FOREIGN KEY (id_anamnese)
        REFERENCES FICHA_ANAMNESE(id_anamnese)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_versao_anamnese (id_anamnese)
) ENGINE=InnoDB;

-- Migração do histórico antigo (uma vez só: só para fichas sem nenhuma versão).
-- Cada registro de HISTORICO_ANAMNESE já guardava a ficha inteira (JSON) antes e
-- depois de cada salvamento, então dá para remontar as versões completas:
--   versão 1 = ficha antes do 1º salvamento (data desconhecida: fica NULL);
--   versões seguintes = ficha depois de cada salvamento, com a data dele.
-- A tabela HISTORICO_ANAMNESE é mantida (não é apagada).
INSERT INTO FICHA_ANAMNESE_VERSAO (id_anamnese, numero_versao, alergias, observacoes_medicas, respostas, criada_em)
SELECT h.id_anamnese, 1, NULL, NULL, h.valor_anterior, NULL
FROM (
    SELECT id_anamnese, valor_anterior,
           ROW_NUMBER() OVER (PARTITION BY id_anamnese ORDER BY data_alteracao, id_historico) AS n
    FROM HISTORICO_ANAMNESE
    WHERE campo_alterado = 'respostas' AND JSON_VALID(valor_novo)
) h
WHERE h.n = 1 AND JSON_VALID(h.valor_anterior)
  AND NOT EXISTS (SELECT 1 FROM FICHA_ANAMNESE_VERSAO v WHERE v.id_anamnese = h.id_anamnese);

INSERT INTO FICHA_ANAMNESE_VERSAO (id_anamnese, numero_versao, alergias, observacoes_medicas, respostas, criada_em)
SELECT h.id_anamnese,
       h.n + (SELECT COUNT(*) FROM FICHA_ANAMNESE_VERSAO v1 WHERE v1.id_anamnese = h.id_anamnese AND v1.numero_versao = 1 AND v1.criada_em IS NULL),
       NULL, NULL, h.valor_novo, h.data_alteracao
FROM (
    SELECT id_anamnese, valor_novo, data_alteracao,
           ROW_NUMBER() OVER (PARTITION BY id_anamnese ORDER BY data_alteracao, id_historico) AS n
    FROM HISTORICO_ANAMNESE
    WHERE campo_alterado = 'respostas' AND JSON_VALID(valor_novo)
) h
WHERE NOT EXISTS (SELECT 1 FROM FICHA_ANAMNESE_VERSAO v
                  WHERE v.id_anamnese = h.id_anamnese AND v.criada_em IS NOT NULL);

-- A versão mais recente é a ficha atual: completa com alergias e observações.
UPDATE FICHA_ANAMNESE_VERSAO v
JOIN FICHA_ANAMNESE f ON f.id_anamnese = v.id_anamnese
SET v.alergias = f.alergias, v.observacoes_medicas = f.observacoes_medicas
WHERE v.alergias IS NULL
  AND v.numero_versao = (SELECT m.maior FROM (SELECT id_anamnese, MAX(numero_versao) AS maior
                                              FROM FICHA_ANAMNESE_VERSAO GROUP BY id_anamnese) m
                         WHERE m.id_anamnese = v.id_anamnese);

-- Fichas sem histórico: a ficha atual vira a versão 1.
INSERT INTO FICHA_ANAMNESE_VERSAO (id_anamnese, numero_versao, alergias, observacoes_medicas, respostas, criada_em)
SELECT f.id_anamnese, 1, f.alergias, f.observacoes_medicas,
       IF(JSON_VALID(f.respostas), f.respostas, NULL), f.data_atualizacao
FROM FICHA_ANAMNESE f
WHERE NOT EXISTS (SELECT 1 FROM FICHA_ANAMNESE_VERSAO v WHERE v.id_anamnese = f.id_anamnese);


-- ============================================
-- V7 (idempotente)
--  - CATEGORIA.capa: foto de capa de cada categoria na vitrine, enviada pela
--    gestora no cadastro da empresa ou em Serviços > Gerenciar categorias.
-- ============================================
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CATEGORIA' AND COLUMN_NAME = 'capa');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE CATEGORIA ADD COLUMN capa LONGTEXT NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;


-- ============================================
-- V8 (idempotente)
--  - AGENDAMENTO: política de cancelamento/reembolso de 24 horas.
--    cancelamento_no_prazo = a cliente cancelou com 24h ou mais de antecedência;
--    reembolso_status = A_VERIFICAR (sinal registrado, gestora precisa analisar)
--    ou VERIFICADO. O Prontto não faz estorno: só sinaliza o caso.
-- ============================================
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AGENDAMENTO' AND COLUMN_NAME = 'cancelamento_no_prazo');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE AGENDAMENTO ADD COLUMN cancelamento_no_prazo BOOLEAN NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AGENDAMENTO' AND COLUMN_NAME = 'reembolso_status');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE AGENDAMENTO ADD COLUMN reembolso_status VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;
SET @col_existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AGENDAMENTO' AND COLUMN_NAME = 'reembolso_verificado_em');
SET @sql_col = IF(@col_existe = 0, 'ALTER TABLE AGENDAMENTO ADD COLUMN reembolso_verificado_em DATETIME NULL', 'SELECT 1');
PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;


-- ============================================
-- DADOS INICIAIS
-- Documentos gerais do Prontto (id_clinica NULL).
-- ============================================

-- Só insere se ainda não existir (evita duplicar a cada start).
INSERT INTO DOCUMENTO_TERMO
    (id_clinica, titulo, tipo_documento, versao, caminho_arquivo, conteudo, status, data_publicacao)
SELECT NULL, 'Termos de Uso do Prontto', 'TERMOS_USO', '1.0', NULL,
       'Texto dos Termos de Uso do Prontto.', 'PUBLICADO', NOW()
WHERE NOT EXISTS (SELECT 1 FROM DOCUMENTO_TERMO
                  WHERE id_clinica IS NULL AND tipo_documento = 'TERMOS_USO');

INSERT INTO DOCUMENTO_TERMO
    (id_clinica, titulo, tipo_documento, versao, caminho_arquivo, conteudo, status, data_publicacao)
SELECT NULL, 'Política de Privacidade do Prontto', 'POLITICA_PRIVACIDADE', '1.0', NULL,
       'Texto da Política de Privacidade do Prontto.', 'PUBLICADO', NOW()
WHERE NOT EXISTS (SELECT 1 FROM DOCUMENTO_TERMO
                  WHERE id_clinica IS NULL AND tipo_documento = 'POLITICA_PRIVACIDADE');