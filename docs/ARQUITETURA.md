# Arquitetura

## Frontend

React + TypeScript + Vite. A interface conserva a lógica de quadros, colunas, cartões, etiquetas, imagens e arrastar/largar.

- `components/`: componentes visuais reutilizáveis.
- `pages/`: uma página por módulo.
- `api/`: cliente HTTP centralizado.
- `constants/`: pipeline e etiquetas.
- `styles/`: estilos pastel e responsivos.

## Backend

FastAPI + SQLAlchemy. As responsabilidades estão divididas:

- `models/`: uma entidade por ficheiro.
- `schemas/`: contratos de entrada e saída.
- `repositories/`: consultas de dados.
- `services/pipeline/`: movimento, tempos e próxima ação.
- `services/scoring/`: classificação de clientes e fornecedores.
- `services/suggestions/`: regras inteligentes.
- `api/routes/`: uma rota por domínio.

## Autenticação

Login por email/palavra-passe com tokens JWT (`app/core/security.py`, rotas em `api/routes/auth.py`). Palavras-passe com hash bcrypt. Todas as rotas exceto `/health` e `/auth/*` exigem token. Os utilizadores iniciais são criados pelo seed (`DEFAULT_USERS` em `app/seed.py`).

## Base de dados

PostgreSQL 16, persistente através de volume Docker. O esquema é gerido por migrações Alembic (`backend/migrations/`), aplicadas automaticamente no arranque; a primeira revisão é um bootstrap que também adota bases criadas antes do Alembic. Novas alterações ao esquema devem gerar-se com `alembic revision --autogenerate`.

## Analytics

`services/analytics/stage_stats.py` calcula tempos médios reais por fase a partir do histórico (`StageEvent`), identifica o gargalo do pipeline e estima a data de conclusão (ETA) de cada desenvolvimento. O dashboard "Hoje" ordena o trabalho por uma pontuação de prioridade (prazo, risco, bloqueio, valor estimado).

## Evoluções previstas

- gestão de utilizadores e permissões na interface;
- upload de anexos para MinIO/S3;
- leitura automática de faturas e etiquetas (OCR/IA);
- integração de email e lembretes acionáveis a fornecedores;
- importação do Trello;
- notificações em tempo real;
- quadro Kanban próprio para produções;
- modelos de IA treinados com histórico real.
