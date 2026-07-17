# Deploy no Railway

O projeto fica todo no Railway: base de dados PostgreSQL, backend (FastAPI) e frontend (React), cada um como um serviço do mesmo projeto.

## Passo 1 — Criar o projeto

1. Abrir https://railway.com/new e escolher **Deploy from GitHub repo** → `mprphone/moda-flow`.
2. O Railway vai tentar criar um serviço único a partir da raiz — vamos configurá-lo como backend no passo 3.

## Passo 2 — Base de dados

1. No projeto, **Create → Database → Add PostgreSQL**.
2. Não é preciso configurar nada; o Railway cria a variável `DATABASE_URL` no serviço Postgres.

## Passo 3 — Backend

1. No serviço criado a partir do repositório: **Settings → Source → Root Directory** = `backend`.
2. Em **Variables**, acrescentar:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao serviço Postgres) |
| `SECRET_KEY` | valor aleatório longo (32+ carateres) |
| `SEED_USER_PASSWORD` | palavra-passe inicial dos utilizadores do seed |
| `CORS_ORIGINS` | o domínio do frontend (passo 4), ex. `https://moda-flow-frontend.up.railway.app` |

3. **Settings → Networking → Generate Domain** e anotar o URL (ex. `https://moda-flow-backend.up.railway.app`).
4. O arranque aplica as migrações e cria os dados de demonstração e utilizadores automaticamente. O healthcheck (`/api/health`) já está configurado em `backend/railway.json`.

## Passo 4 — Frontend

1. **Create → GitHub Repo** → o mesmo repositório, e em **Settings → Source → Root Directory** = `frontend`.
2. Em **Variables**, acrescentar (usada no *build*, embebida nos ficheiros estáticos):

| Variável | Valor |
|---|---|
| `VITE_API_URL` | o domínio do backend + `/api`, ex. `https://moda-flow-backend.up.railway.app/api` |

3. **Settings → Networking → Generate Domain** — este é o URL que a equipa vai usar.
4. Voltar ao backend e confirmar que `CORS_ORIGINS` tem exatamente este domínio (sem barra final). Alterar `CORS_ORIGINS` reinicia o backend automaticamente.

## Ordem importante

`VITE_API_URL` só é lida durante o build do frontend. Se mudar o domínio do backend, é preciso **redeploy** do frontend (Deployments → Redeploy).

## Depois do deploy

- Entrar com o email do utilizador do seed e a palavra-passe definida em `SEED_USER_PASSWORD`.
- Cada `git push` para `main` faz redeploy automático dos dois serviços.
- Os dados ficam no Postgres do Railway (persistente); o seed só corre se a base estiver vazia.
