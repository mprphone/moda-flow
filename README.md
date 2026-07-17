# Moda Flow

MVP completo e funcional para gestão de desenvolvimento de moda, mantendo a lógica visual do Trello, mas com pipeline automático, PostgreSQL, sugestões inteligentes, classificação de clientes/fornecedores, produções e shopping.

## Arranque rápido

1. Copie `.env.example` para `.env`.
2. Execute:

```bash
docker compose up --build
```

3. Abra:

- Aplicação: http://localhost:5173
- API: http://localhost:8000/docs

A base de dados é criada automaticamente (migrações Alembic) e recebe dados de demonstração no primeiro arranque.

## Acesso

A aplicação exige início de sessão. O utilizador inicial é criado automaticamente no arranque:

- Email: `isabel.fernandes@cunharibeiro.com`
- Palavra-passe inicial: o valor de `SEED_USER_PASSWORD` no `.env` (por omissão `ModaFlow2026!`); deve ser alterada após o primeiro acesso

Novos utilizadores são acrescentados à lista `DEFAULT_USERS` em `backend/app/seed.py` (até existir gestão de utilizadores na interface).

> Nota: se já tinha uma base de dados antiga com `amount`/`estimated_value` em Float, faça `make reset` (apaga o volume) ou aplique manualmente a alteração para `NUMERIC(12,2)`.

## Princípios

- Visual familiar: quadros, colunas, cartões, etiquetas, imagens e arrastar/largar.
- Poucos cliques: criar desenvolvimento com poucos campos e mover cartões diretamente.
- Automatismos: tempos, histórico, próxima ação, alertas e passagem entre fases.
- Informação opcional: nada bloqueia o trabalho por falta de dados acessórios.
- Código modular: modelos, rotas, serviços, pontuações e regras em ficheiros separados.

## Módulos incluídos

- Início de sessão com utilizadores e tokens JWT
- Hoje / prioridades ordenadas automaticamente (prazo, risco, bloqueios, valor)
- Quadro Kanban de desenvolvimento com pesquisa, filtros e etiquetas
- Pipeline automático com histórico por fase e previsão de conclusão (ETA)
- Sugestões inteligentes baseadas em regras
- Classificação automática de clientes e fornecedores
- Produções ligadas a desenvolvimentos aprovados, com estados atualizáveis
- Shopping com registo de compras, devoluções automáticas ao passar o prazo, notas de crédito e reembolsos
- Estatísticas de fases e deteção de gargalos (`GET /api/stats/stages`)
- Migrações de base de dados com Alembic
- API REST documentada
- PostgreSQL + Docker Compose

## Nota

Este projeto é um MVP técnico pronto para evoluir. Antes de uso real devem ser acrescentados gestão de utilizadores na interface, permissões por papel, backups, armazenamento de ficheiros (S3/MinIO), envio real de emails e testes de aceitação com a equipa.
