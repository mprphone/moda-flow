# Auditoria do Moda Flow

Data: 18 de julho de 2026

## Conclusão executiva

O Moda Flow é um MVP sólido e coerente para uma equipa pequena. A separação React/FastAPI/PostgreSQL é adequada, o domínio já cobre desenvolvimento, malhas, produção, shopping e parceiros, e os automatismos atuais resolvem problemas reais. A aplicação ainda não deve, porém, ser tratada como pronta para operação crítica: faltam robustez de segurança, validação de dados, observabilidade, backups, testes do frontend e algumas garantias de integridade.

O termo “inteligente” descreve hoje regras fixas, não aprendizagem ou IA. Isso não é um defeito: regras transparentes são o ponto de partida certo. O próximo salto deve começar por melhorar a qualidade dos dados e automatizar ações concretas; só depois faz sentido acrescentar modelos preditivos ou um assistente com IA.

### Avaliação resumida

| Área | Avaliação | Observação |
|---|---:|---|
| Adequação funcional | 7/10 | Bom conjunto de módulos para um MVP |
| Arquitetura e legibilidade | 7/10 | Estrutura modular simples e compreensível |
| Experiência e produtividade | 6/10 | Kanban eficaz, mas há controlos inativos e fluxos incompletos |
| “Inteligência” | 4/10 | Prioridades, risco e scoring são heurísticas fixas |
| Segurança e prontidão operacional | 4/10 | Dependências vulneráveis, defaults inseguros, sem backups/monitorização |
| Qualidade e testes | 6/10 | Backend com boa base; frontend sem testes nem lint |

## O que foi verificado

- Estrutura completa do frontend, backend, modelos, migrações, rotas, serviços e documentação.
- `npm run build`: passou; bundle principal com cerca de 253 kB (77 kB gzip).
- Backend: 16 testes passaram.
- Cobertura do backend: 81% global, mas produções 34%, uploads 43%, shopping 45% e scoring de fornecedores 15%.
- Não existem testes automatizados de frontend, lint, testes E2E nem pipeline de CI.
- `npm audit`: zero vulnerabilidades conhecidas nas dependências atuais do frontend.
- `pip-audit` sobre o `requirements.txt`: 28 ocorrências de avisos em quatro pacotes (`python-multipart`, `PyJWT`, `pytest` e `Starlette`, esta última transitiva).
- O `.env` não está versionado e o repositório estava limpo no início da auditoria.

Limitações: o Docker Desktop estava parado e não existia um browser controlável nesta sessão, portanto não foi possível fazer uma passagem visual/E2E sobre a aplicação levantada. Os testes locais também correram num ambiente Python mais recente do que as versões fixadas no `requirements.txt`; o artefacto exato de produção não ficou validado.

## Pontos fortes

1. Domínio bem dividido em modelos, repositórios, serviços e rotas.
2. Dinheiro guardado em `NUMERIC`, evitando erros típicos de `float` em valores monetários.
3. Carregamento antecipado das relações principais, reduzindo vários problemas N+1.
4. Histórico de fases, tempos, ETA, prioridades e sugestões já centralizados em serviços reutilizáveis.
5. Atualizações otimistas dos quadros com reversão em caso de falha.
6. Autenticação, papéis, migrações e testes de integração já existem.
7. A interface privilegia poucos campos obrigatórios e poucos cliques.

## Achados prioritários

### P0 — corrigir antes de confiar dados reais ao sistema

1. **Dependências do backend com avisos de segurança.** O Docker instala versões antigas fixadas no `requirements.txt`. O ambiente local está muito mais atualizado, por isso os testes verdes não validam o conjunto que será publicado. Deve ser criado um conjunto compatível e testado, atualizar pelo menos `python-multipart`, `PyJWT` e FastAPI/Starlette e separar dependências de desenvolvimento (`pytest`, `httpx`, cobertura e auditoria).

2. **Segredos e credenciais default.** Existem uma chave JWT e uma palavra-passe inicial conhecidas como valores por omissão. Em produção, o arranque deve falhar se estes defaults estiverem ativos. Deve existir convite/redefinição com token temporário e obrigação de trocar a palavra-passe no primeiro acesso.

3. **Uploads não são validados pelo conteúdo.** O backend confia no `Content-Type`, lê até 15 MB integralmente em memória e publica o ficheiro numa rota estática sem autenticação. É necessário validar magic bytes, descodificar e regravar a imagem, impor dimensões, fazer streaming, guardar em S3/MinIO e eliminar ficheiros órfãos. A documentação Railway também não configura o volume de uploads referido no código.

4. **Sem backups nem recuperação testada.** Há persistência PostgreSQL, mas não há política de snapshots, exportações, retenção ou ensaio de restauro. Definir RPO/RTO, backup diário e teste mensal de recuperação.

5. **Eliminação de desenvolvimento ligado a malhas pode falhar no PostgreSQL.** A rota trata produções e shopping, mas a FK de `fabric_requests.development_id` não tem cascade/set-null e a relação não é limpa antes do `DELETE`. O resultado provável é uma violação de FK e erro 500. Definir explicitamente `ON DELETE SET NULL` ou bloquear a eliminação com uma mensagem clara.

### P1 — primeira sprint de robustez

1. **Validação de domínio insuficiente.** Quantidades, preços e valores negativos são aceites pela API; estados de desenvolvimento e shopping podem receber texto arbitrário; strings não têm limites úteis no contrato; emails usam apenas `str`. Usar enums, `Field` com limites, `EmailStr`, validação de datas e constraints no PostgreSQL.

2. **Falta de auditoria e identidade real nas alterações.** O autor do comentário vem do pedido do browser e pode ser falsificado. Movimentos, mudanças de estado, eliminações e alterações financeiras não registam quem fez o quê. Criar `audit_events`, usar sempre o utilizador autenticado e guardar valores anterior/novo.

3. **Permissões muito largas.** Fora da gestão de contas, qualquer utilizador autenticado pode criar, alterar ou eliminar praticamente tudo. Definir uma matriz simples: administrador, gestor, designer e leitura; restringir eliminações e operações financeiras.

4. **Login sem proteção contra abuso.** Não há rate limiting, bloqueio progressivo, revogação de sessões, refresh token nem 2FA. O token de 12 horas fica no `localStorage`, aumentando o impacto de XSS. Preferir cookie `HttpOnly`/`Secure` com CSRF adequado ou tokens curtos com refresh e rotação.

5. **Erros e concorrência.** Duplicados concorrentes e FKs inválidas podem terminar em 500; não há tratamento global de `IntegrityError` nem `rollback` explícito. Também não existe controlo de versão, pelo que duas pessoas podem sobrescrever alterações. Adicionar respostas 409/422, `updated_at`/version para optimistic locking e transações de serviço.

6. **Migrações no arranque de cada instância.** Isto pode criar corridas durante deploy com vários processos. Executar Alembic numa etapa única de release e tornar a aplicação apenas responsável por arrancar.

7. **Healthcheck superficial.** `/health` responde sempre `ok`, mesmo sem base de dados. Separar liveness de readiness e testar DB, migrações e armazenamento.

### P2 — produtividade, UX e escala

1. A pesquisa global e o sino da topbar são apenas elementos visuais, sem comportamento.
2. Não há URLs/deep links, navegação do browser nem ligação direta de “Hoje” ao cartão correspondente.
3. O endpoint de estatísticas e gargalos existe, mas não há página que o apresente.
4. Produções não têm detalhe, edição completa, criação autónoma na interface, histórico, checklist ou controlo de qualidade.
5. Vários fluxos usam `prompt`/`confirm`; devem passar para formulários com validação, ajuda e estado de gravação.
6. Há uma inconsistência em Malhas: a página diz “duplo clique abre”, mas o cartão usa clique simples.
7. Drag-and-drop precisa de alternativa por botão/menu, suporte de teclado e melhor comportamento móvel.
8. Modais não têm semântica de diálogo, focus trap, fecho por Escape nem gestão de foco.
9. As listas carregam tudo e filtram no browser. Adicionar paginação, filtros e ordenação no servidor antes do crescimento dos dados.
10. A página “Hoje” e outros módulos só atualizam ao montar; não há sincronização entre separadores/utilizadores. Adotar cache de queries e invalidação, polling leve ou eventos em tempo real.
11. O cálculo de datas usa UTC como data civil. Em Lisboa, no horário de verão, alertas podem mudar de dia entre 00:00 e 01:00. Usar `Europe/Lisbon` para regras de negócio e timestamps UTC com timezone explícito.
12. Há artefactos TypeScript gerados versionados (`vite.config.js`, `.d.ts` e `.tsbuildinfo`); o `.js` pode sobrepor a configuração `.ts`. Remover estes ficheiros e ignorá-los.

## Porque a inteligência atual ainda é limitada

- Risco é inferido pela presença de certas palavras nas sugestões.
- Prioridade é uma soma manual de prazo, risco, espera, dias e valor.
- ETA usa médias globais em dias corridos, sem carga de trabalho, fins de semana, confiança estatística ou comportamento por fornecedor/cliente.
- Clientes com pouco ou nenhum histórico recebem uma nota aparentemente definitiva.
- Fornecedores sem dados recebem uma pontuação base; a interface não mostra “dados insuficientes”.
- O modelo tem `promised_at`, mas a API/interface não permitem registar esse prazo. Assim, parte principal do scoring de fornecedor só é alimentada pelos dados de demonstração.
- O lead time de malha é texto livre e não entra no cálculo de atraso.

Antes de IA, recolher: utilizador responsável por ID, prazos prometidos estruturados, resultado de cada amostra, motivo normalizado de rejeição/bloqueio, versões, carga/capacidade, custos reais, margem, datas completas e feedback sobre sugestões.

## Funcionalidades recomendadas

### Ganhos rápidos — 1 a 2 semanas

1. Pesquisa global funcional com resultados agrupados e atalhos.
2. Centro de notificações com tarefas vencidas, respostas pendentes e devoluções.
3. Página de analytics usando o endpoint existente: tempo por fase, WIP, throughput, gargalo e cumprimento de prazos.
4. Abrir diretamente o desenvolvimento a partir de “Hoje”.
5. Formulários completos de edição e histórico para produção, shopping, clientes e fornecedores.
6. Filtros guardados por utilizador e vistas “meus cartões”, “atrasados” e “esta semana”.
7. Exportação CSV/Excel e resumo semanal por email.

### Operação do atelier — 2 a 6 semanas

1. Tarefas atribuíveis com responsável, prazo, checklist e dependências.
2. Calendário de entregas, aprovações, devoluções e capacidade da equipa.
3. Portal/link de aprovação do cliente com imagem, versões e comentário.
4. Pedido a fornecedores com prazo prometido, lembrete, resposta e comparação de propostas.
5. Produção com BOM, consumos, tamanhos/cores, amostra aprovada, QC, incidências e expedição.
6. Shopping com anexos de fatura/nota de crédito e reconciliação do reembolso.
7. Pesquisa e reutilização de ficha técnica, malha ou fornecedor de modelos semelhantes.
8. Importação Trello assistida, validação de duplicados e relatório de qualidade dos dados.

### IA com retorno prático — depois da base de dados estar preparada

1. **OCR de etiquetas e faturas:** fotografia preenche composição, gramagem, largura, referência, valor, número e prazo; o utilizador confirma antes de guardar.
2. **Assistente operacional:** “o que devo tratar hoje?”, “quais modelos da Zara estão bloqueados?” e “cria um rascunho de lembrete ao fornecedor”, sempre com fontes e confirmação antes de alterar/enviar.
3. **ETA probabilístico:** previsão por fase/fornecedor/cliente, dias úteis e carga atual, com intervalo de confiança e explicação dos fatores.
4. **Risco e anomalias:** detetar fase anormalmente longa, custo/quantidade fora do padrão e acumulação de WIP.
5. **Similaridade visual e técnica:** encontrar modelos/malhas semelhantes, sugerir ficha, fornecedor e tempos observados.
6. **Resumo automático:** condensar comentários, decisões e alterações numa passagem de turno ou email semanal.
7. **Rascunhos de comunicação:** email/WhatsApp ao cliente ou fornecedor a partir do contexto, nunca com envio autónomo inicial.

## Roadmap recomendado

### Fase 1 — Segurança e confiança (1 sprint)

- Atualizar e separar dependências; criar CI reproduzível.
- Corrigir defaults, uploads, FK de malhas e validações.
- Criar audit log, RBAC básico, readiness e backups.
- Acrescentar testes de produção, shopping, uploads, permissões e erros.

### Fase 2 — Fluidez operacional (1 a 2 sprints)

- Pesquisa, notificações, deep links, edição completa e mobile/a11y.
- Paginação e filtros no backend; cache/sincronização no frontend.
- Prazos prometidos estruturados, calendário e tarefas atribuíveis.
- Dashboard de analytics e dados suficientes/insuficientes no scoring.

### Fase 3 — Automação (2 a 4 sprints)

- Email/WhatsApp com rascunho e confirmação.
- OCR de etiquetas/faturas.
- Portais de aprovação e fornecedor.
- Produção/BOM/QC e reconciliação financeira.

### Fase 4 — IA preditiva

- Treinar e validar ETA/risco apenas quando existir histórico limpo suficiente.
- Medir precisão, falsos alertas, tempo poupado e taxa de aceitação das sugestões.
- Manter regras simples como fallback e mostrar sempre por que razão surgiu uma recomendação.

## Critérios de sucesso sugeridos

- Zero vulnerabilidades altas/críticas no build publicado.
- Restauro de backup testado e documentado.
- 100% das alterações críticas com utilizador e timestamp.
- Menos de 2% de erros de API e monitorização de latência.
- Cobertura dos fluxos críticos acima de 80%, incluindo frontend E2E.
- Redução do tempo médio por fase e das devoluções perdidas.
- Sugestões aceites/úteis em mais de 60% dos casos antes de avançar para modelos mais complexos.

