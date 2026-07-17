# Instalação no Windows

1. Instalar Docker Desktop.
2. Extrair o ZIP para uma pasta sem acentos no caminho.
3. Abrir PowerShell nessa pasta.
4. Executar:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

5. Abrir `http://localhost:5173` e iniciar sessão com o utilizador criado automaticamente (ver secção "Acesso" no README).

Para parar:

```powershell
docker compose down
```

Para apagar todos os dados de teste e começar novamente:

```powershell
docker compose down -v
docker compose up --build
```
