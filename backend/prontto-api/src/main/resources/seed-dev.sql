-- ============================================
-- PRONTTO - DADOS DE TESTE (somente desenvolvimento)
--
-- Cria a CA Beauty Clinic já cadastrada, com gestora, cliente, catálogo,
-- horários e alguns agendamentos, para testar o sistema sem cadastrar tudo.
--
-- Acessos (senha dos dois: Prontto@123):
--   Gestora: camile@cabeauty.com.br       → http://localhost:5173/
--   Cliente: jamily@email.com             → http://localhost:5173/?clinica=ca-beauty-clinic
--
-- WhatsApp (todos números da equipe, para nenhuma mensagem de teste ir para um
-- estranho):
--   Clínica e cliente: 11 98504-8943
--   Gestora:           11 94982-3270 (precisa ser outro: USUARIO.whatsapp é único)
--
-- Idempotente: roda a cada start do Spring e só insere o que ainda não existe.
-- Se algo já existir com o mesmo e-mail, WhatsApp, slug ou CNPJ, a parte
-- dependente é pulada (não quebra a subida do sistema).
-- Para recriar do zero: apague a clínica e as usuárias abaixo no banco.
--
-- PRODUÇÃO: remova a linha "data-locations: classpath:seed-dev.sql" do
-- application.yaml para não carregar estes dados.
-- ============================================

-- ---------- 1. Gestora (USUARIO tipo GESTORA, sem id_clinica) ----------
INSERT INTO USUARIO (id_clinica, nome, data_nascimento, whatsapp, email, senha, tipo, recorrente, status)
SELECT NULL, 'Camille Oli', '1994-03-18', '11949823270', 'camile@cabeauty.com.br',
       '$2a$10$y0WugwRu5Xr5hQpHfH/exu/OOj4rBNRPsdY0XNLjMFcFeRO/N37bm', 'GESTORA', FALSE, 'ATIVO'
WHERE NOT EXISTS (SELECT 1 FROM USUARIO WHERE email = 'camile@cabeauty.com.br' OR whatsapp = '11949823270');

-- Correção: uma versão anterior deste script usava 11900000000 para a gestora.
-- Se ela já foi criada assim, troca para o número da equipe (se ele estiver livre).
UPDATE USUARIO SET whatsapp = '11949823270'
WHERE email = 'camile@cabeauty.com.br' AND whatsapp = '11900000000'
  AND NOT EXISTS (SELECT 1 FROM (SELECT whatsapp FROM USUARIO) u WHERE u.whatsapp = '11949823270');

SET @gestora = (SELECT id_usuario FROM USUARIO WHERE email = 'camile@cabeauty.com.br' AND tipo = 'GESTORA');

-- ---------- 2. Clínica ----------
INSERT INTO CLINICA (id_gestora, slug, cpf_cnpj, nome, endereco, whatsapp, email_contato, descricao,
                     logo_clinica, instagram, slogan, titulo_principal, imagem_capa, favicon, status)
SELECT @gestora, 'ca-beauty-clinic', '45723174000110', 'CA Beauty Clinic',
       'Avenida Guarapiranga, 92 · Parque Guarapiranga, São Paulo — SP · CEP 04902-000',
       '11985048943', 'contato@cabeauty.com.br',
       'Atendimentos exclusivos, técnicas atuais e todo o cuidado que você merece.',
       '/brands/logo-ca-beauty.png', '@cabeautyclinic', 'Estética Premium em São Paulo',
       'Realçando sua beleza com excelência e naturalidade.',
       'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=88',
       '/brands/logo-ca-beauty.png', 'ATIVA'
WHERE @gestora IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM CLINICA WHERE slug = 'ca-beauty-clinic' OR cpf_cnpj = '45723174000110');

SET @clinica = (SELECT id_clinica FROM CLINICA WHERE slug = 'ca-beauty-clinic' AND id_gestora = @gestora);

-- ---------- 3. Categorias ----------
INSERT INTO CATEGORIA (id_clinica, nome)
SELECT @clinica, c.nome FROM (
    SELECT 'Nail Design' AS nome UNION ALL SELECT 'Lash Design'
    UNION ALL SELECT 'Sobrancelhas' UNION ALL SELECT 'Estética Labial'
) c
WHERE @clinica IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM CATEGORIA x WHERE x.id_clinica = @clinica AND x.nome = c.nome);

-- ---------- 4. Serviços (preço em reais, duração em minutos) ----------
INSERT INTO SERVICO (id_clinica, id_categoria, nome, descricao, preco, duracao, ativo, foto_servico)
SELECT @clinica, cat.id_categoria, s.nome, s.descricao, s.preco, s.duracao, TRUE, s.foto
FROM (
    SELECT 'Nail Design' AS categoria, 'Fibra de Vidro' AS nome, 'Alongamento em fibra de vidro com estrutura personalizada e acabamento natural.' AS descricao, 180.00 AS preco, 120 AS duracao, '/images/servicos/nail-fibra.jpg' AS foto
    UNION ALL SELECT 'Nail Design', 'Banho de Gel', 'Camada de gel sobre as unhas naturais para reforço, nivelamento e maior durabilidade.', 120.00, 90, '/images/servicos/nail-banho.jpg'
    UNION ALL SELECT 'Nail Design', 'Blindagem (Esmaltação em Gel)', 'Proteção das unhas naturais combinada com esmaltação em gel de longa duração.', 100.00, 60, '/images/servicos/nail-blindagem.jpg'
    UNION ALL SELECT 'Lash Design', 'Volume Brasileiro', 'Extensão de cílios com volume equilibrado e efeito marcante.', 170.00, 120, '/images/servicos/lash-brasileiro.jpg'
    UNION ALL SELECT 'Lash Design', 'Volume Marrom', 'Volume em tonalidade marrom para um olhar suave e natural.', 170.00, 120, '/images/servicos/lash-marrom.jpg'
    UNION ALL SELECT 'Lash Design', 'Volume Hollywood', 'Volume intenso e glamouroso para maior destaque do olhar.', 200.00, 150, '/images/servicos/lash-hollywood.jpg'
    UNION ALL SELECT 'Lash Design', 'Volume Inglês', 'Técnica de volume com acabamento elegante e definição uniforme.', 180.00, 120, '/images/servicos/lash-ingles.jpg'
    UNION ALL SELECT 'Lash Design', 'Fox Eyes', 'Mapeamento alongado que cria um efeito lifting no canto externo dos olhos.', 200.00, 150, '/images/servicos/lash-fox.jpg'
    UNION ALL SELECT 'Lash Design', 'Sirena', 'Efeito de cílios texturizado e delicado, personalizado para o formato dos olhos.', 190.00, 150, '/images/servicos/lash-sirena.jpg'
    UNION ALL SELECT 'Lash Design', 'Efeito Delineado', 'Extensão com mapeamento que simula o acabamento de um delineado.', 180.00, 120, '/images/servicos/lash-delineado.jpg'
    UNION ALL SELECT 'Lash Design', 'Lash Lifting', 'Curvatura e alinhamento dos cílios naturais para um olhar mais aberto.', 140.00, 60, '/images/servicos/lash-lifting.jpg'
    UNION ALL SELECT 'Lash Design', 'Combo: Brow Lamination + Lash Lifting', 'Combo de alinhamento das sobrancelhas e curvatura dos cílios naturais.', 220.00, 90, '/images/servicos/combo-lash.jpg'
    UNION ALL SELECT 'Sobrancelhas', 'Brow Lamination', 'Alinhamento dos fios para sobrancelhas mais definidas e volumosas.', 120.00, 60, '/images/servicos/brow-lamination.jpg'
    UNION ALL SELECT 'Sobrancelhas', 'Design Personalizado', 'Design desenvolvido de acordo com o formato do rosto e o crescimento dos fios.', 60.00, 40, '/images/servicos/brow-design.jpg'
    UNION ALL SELECT 'Sobrancelhas', 'Design Personalizado com Tintura', 'Design personalizado com aplicação de tintura para mais definição.', 80.00, 50, '/images/servicos/brow-tintura.jpg'
    UNION ALL SELECT 'Estética Labial', 'Hidra Gloss', 'Tratamento de hidratação profunda para devolver maciez e brilho aos lábios.', 130.00, 60, '/images/servicos/labial-hidra.jpg'
) s
JOIN CATEGORIA cat ON cat.id_clinica = @clinica AND cat.nome = s.categoria
WHERE @clinica IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM SERVICO x WHERE x.id_clinica = @clinica AND x.nome = s.nome);

-- ---------- 5. Horário de funcionamento ----------
-- Segunda a sábado: 09:00–12:00 e 13:00–19:00 (almoço 12h–13h). Domingo fechado.
INSERT INTO HORARIO (id_clinica, dia_semana, hora_inicio, hora_fim, ativo)
SELECT @clinica, d.dia, f.inicio, f.fim, TRUE
FROM (
    SELECT 'SEGUNDA' AS dia UNION ALL SELECT 'TERCA' UNION ALL SELECT 'QUARTA'
    UNION ALL SELECT 'QUINTA' UNION ALL SELECT 'SEXTA' UNION ALL SELECT 'SABADO'
) d
CROSS JOIN (
    SELECT '09:00:00' AS inicio, '12:00:00' AS fim UNION ALL SELECT '13:00:00', '19:00:00'
) f
WHERE @clinica IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM HORARIO x WHERE x.id_clinica = @clinica);

-- ---------- 6. Cliente da clínica ----------
-- Jamily é RECORRENTE (isenta de sinal): os agendamentos dela nascem PENDENTES
-- e ela confirma a presença até 24h antes — serve para testar essa regra.
-- (Para testar o fluxo com sinal, cadastre uma cliente nova pela vitrine.)
INSERT INTO USUARIO (id_clinica, nome, data_nascimento, whatsapp, email, senha, tipo, recorrente, status)
SELECT @clinica, 'Jamily Souza', '1998-07-22', '11985048943', 'jamily@email.com',
       '$2a$10$y0WugwRu5Xr5hQpHfH/exu/OOj4rBNRPsdY0XNLjMFcFeRO/N37bm', 'CLIENTE', TRUE, 'ATIVO'
WHERE @clinica IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM USUARIO WHERE email = 'jamily@email.com' OR whatsapp = '11985048943');

SET @cliente = (SELECT id_usuario FROM USUARIO WHERE email = 'jamily@email.com' AND id_clinica = @clinica);

-- Correção: uma versão anterior deste script criava a Jamily como cliente nova.
UPDATE USUARIO SET recorrente = TRUE WHERE id_usuario = @cliente AND recorrente = FALSE;

-- Ficha de saúde da cliente
INSERT INTO FICHA_ANAMNESE (id_usuario, alergias, observacoes_medicas, respostas)
SELECT @cliente, 'Nenhuma', 'Nenhuma', '{}'
WHERE @cliente IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM FICHA_ANAMNESE WHERE id_usuario = @cliente);

-- ---------- 7. Agendamentos de exemplo ----------
-- Datas relativas ao dia em que o banco foi populado (pulando domingo, que é
-- fechado). Só são criados se a cliente ainda não tiver nenhum agendamento.
--   - atendimento passado (concluído), para o histórico
--   - próximo atendimento CONFIRMADO (sinal pago quando ela ainda era cliente nova)
--   - atendimento PENDENTE daqui a ~3 dias: ela precisa confirmar até 24h antes,
--     senão o sistema cancela sozinho
SET @sem_agendamentos = (SELECT COUNT(*) = 0 FROM AGENDAMENTO WHERE id_usuario = @cliente);

INSERT INTO AGENDAMENTO (id_usuario, id_servico, nome_procedimento, valor_servico, data, hora, valor_sinal, status)
SELECT @cliente, s.id_servico, s.nome, s.preco, a.data, a.hora, a.sinal, a.status
FROM (
    SELECT 'Design Personalizado' AS servico,
           DATE_SUB(CURDATE(), INTERVAL 5 + (DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL 5 DAY)) = 1) DAY) AS data,
           '10:00:00' AS hora, NULL AS sinal, 'CONCLUIDO' AS status
    UNION ALL
    SELECT 'Volume Brasileiro',
           DATE_ADD(CURDATE(), INTERVAL 1 + (DAYOFWEEK(DATE_ADD(CURDATE(), INTERVAL 1 DAY)) = 1) DAY),
           '10:00:00', 51.00, 'CONFIRMADO'
    UNION ALL
    SELECT 'Brow Lamination',
           DATE_ADD(CURDATE(), INTERVAL 3 + (DAYOFWEEK(DATE_ADD(CURDATE(), INTERVAL 3 DAY)) = 1) DAY),
           '14:00:00', NULL, 'PENDENTE'
) a
JOIN SERVICO s ON s.id_clinica = @clinica AND s.nome = a.servico
WHERE @cliente IS NOT NULL AND @sem_agendamentos = 1;

-- Modelo "Confirmação" virou "Pedido de confirmação" (a cliente confirma pelo
-- site até 24h antes). Atualiza só quem ainda tem o texto antigo, sem edição.
UPDATE MODELO_MENSAGEM
SET nome = 'Pedido de confirmação',
    texto = 'Olá, {nome}! Seu horário de {procedimento} está reservado para {data} às {horario}. Para garantir a sua vaga, confirme sua presença pelo nosso site até {prazo}: {link} Sem a confirmação, o horário é liberado para outra cliente. Te esperamos! — {clinica}'
WHERE finalidade = 'CONFIRMACAO'
  AND texto = 'Olá, {nome}! Seu agendamento de {procedimento}, marcado para {data} às {horario}, está confirmado. Será um prazer receber você! — {clinica}';
