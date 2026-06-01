# Como Rodar o EconomyZee

## Arquitetura

```
[Usuário] → [Vercel (Frontend)] → [ngrok] → [NestJS Backend (local:3333)] → [PostgreSQL + Redis]
                                                    ↑
                                          [Telegram Webhook]
```

- **Frontend**: hospedado no Vercel, faz chamadas para o backend via ngrok
- **Backend**: roda localmente na porta 3333, exposto pela internet via ngrok
- **ngrok domain**: `improvise-climatic-frequency.ngrok-free.dev` (estático, gratuito)

---

## Pré-requisitos

- Node.js 18+
- Docker Desktop (para PostgreSQL + Redis)
- ngrok instalado e autenticado (`ngrok config add-authtoken SEU_TOKEN`)
- Vercel CLI (`npm i -g vercel`) — opcional, para deploy manual

---

## Rodar em desenvolvimento (modo rápido)

Dê dois cliques no arquivo:

```
start-dev.bat
```

Isso abre dois terminais:
1. **ngrok** — túnel para `https://improvise-climatic-frequency.ngrok-free.dev`
2. **Backend NestJS** — servidor na porta 3333 com hot-reload

> O banco e o Redis precisam estar rodando antes. Veja a seção abaixo.

---

## Subir banco de dados e Redis

Na pasta raiz do projeto:

```bash
cd backend
docker-compose up -d
```

Isso sobe PostgreSQL (5432) e Redis (6379).

Para parar:
```bash
docker-compose down
```

---

## Rodar manualmente

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### ngrok (em outro terminal)
```bash
ngrok http --domain=improvise-climatic-frequency.ngrok-free.dev 3333
```

---

## Deploy no Vercel

O frontend já está configurado para subir no Vercel automaticamente via Git.

### Deploy manual
```bash
npm install
vercel --prod
```

### O que o Vercel usa
- **Build command**: `npm run build:spa`
- **Output dir**: `dist-spa`
- **VITE_API_URL**: `https://improvise-climatic-frequency.ngrok-free.dev` (definido em `vercel.json`)

> **Se trocar o domínio ngrok**, atualize `VITE_API_URL` em:
> 1. `vercel.json` → campo `env.VITE_API_URL`
> 2. `.env.production` → campo `VITE_API_URL`
> 3. `backend/.env` → campos `TELEGRAM_WEBHOOK_URL` e `APP_URL`

---

## Configurar o Webhook do Telegram

Após iniciar o backend e o ngrok, registre o webhook no Telegram:

```bash
curl -X POST "https://api.telegram.org/bot8698753526:AAF9q1t0xgH0fldngQMwGiZTR3frDX-FxDI/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://improvise-climatic-frequency.ngrok-free.dev/integrations/telegram/webhook",
    "secret_token": "random-webhook-secret-string"
  }'
```

Para verificar se está registrado:
```bash
curl "https://api.telegram.org/bot8698753526:AAF9q1t0xgH0fldngQMwGiZTR3frDX-FxDI/getWebhookInfo"
```

---

## URLs úteis

| Serviço         | URL                                                                 |
|-----------------|---------------------------------------------------------------------|
| Frontend (prod) | https://economyzee-smart-finance-hub-main.vercel.app                |
| Backend local   | http://localhost:3333                                               |
| Swagger/Docs    | http://localhost:3333/docs                                          |
| ngrok público   | https://improvise-climatic-frequency.ngrok-free.dev                 |
| ngrok dashboard | http://localhost:4040                                               |

---

## Troubleshooting

### Frontend diz "Network Error" ou não carrega dados
→ Verifique se o ngrok está rodando: acesse http://localhost:4040  
→ Verifique se o backend está na porta 3333

### Telegram não recebe mensagens
→ Registre o webhook novamente (comando curl acima)  
→ Certifique-se de que o ngrok está ativo

### Erro de CORS
→ O backend está com `origin: true` — aceita qualquer origem. Se persistir, reinicie o backend.

### Banco de dados não conecta
→ Rode `docker-compose up -d` na pasta `backend`  
→ Verifique se o Docker Desktop está aberto
