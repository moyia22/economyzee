# EconomyZee — Como Rodar

## Arquitetura

```
[Usuário] → [Nginx (HTTPS)] → [Frontend SPA] ─── HTML/JS/CSS
                             → [Backend NestJS (porta 3333)] → [PostgreSQL + Redis]
                             → [Telegram Bot Webhook]
```

### Componentes

- **Frontend**: SPA React (Vite + TanStack Router), servido como arquivos estáticos pelo Nginx
- **Backend**: NestJS na porta 3333, acessível via `https://economyzee.com/api`
- **Banco de Dados**: PostgreSQL 15 (via Docker)
- **Cache/Filas**: Redis 7 (via Docker)
- **Reverse Proxy**: Nginx com SSL (Certbot/Let's Encrypt)
- **Process Manager**: PM2

---

## Desenvolvimento Local

### Requisitos

- Node.js 20+
- Docker Desktop (para PostgreSQL e Redis)
- npm

### 1. Iniciar Docker (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 2. Configurar Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
# Em desenvolvimento, use NODE_ENV=development

npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### 3. Iniciar Frontend

```bash
# Na raiz do projeto
npm install
npm run dev
```

### URLs de Desenvolvimento

| Serviço      | URL                           |
|--------------|-------------------------------|
| Frontend     | http://localhost:5173          |
| Backend API  | http://localhost:3333/api      |
| Swagger Docs | http://localhost:3333/docs     |
| PostgreSQL   | localhost:5432                 |
| Redis        | localhost:6379                 |

### Variáveis de Ambiente (Dev)

**Frontend (`.env`)**:
```
VITE_API_URL=http://localhost:3333
```

**Backend (`backend/.env`)**:
```
NODE_ENV=development
APP_URL=http://localhost:3333
APP_PORT=3333
```

> Em `NODE_ENV=development`, o bot do Telegram usa **polling** (não precisa de webhook).

---

## Deploy em Produção (VPS)

Consulte o arquivo [`deploy/deploy-checklist.md`](deploy/deploy-checklist.md) para instruções completas de deploy.

### URLs de Produção

| Serviço              | URL                                                          |
|----------------------|--------------------------------------------------------------|
| Frontend             | https://economyzee.com                                       |
| Backend API          | https://economyzee.com/api                                   |
| Swagger Docs         | https://economyzee.com/docs                                  |
| Telegram Webhook     | https://economyzee.com/api/integrations/telegram/webhook     |

### Build para Produção

```bash
# Frontend
npm run build:spa
# Output: ./dist-spa/

# Backend
cd backend
npm run build
# Output: ./dist/
```

### PM2

```bash
pm2 start deploy/ecosystem.config.js
pm2 status
pm2 logs economyzee-backend
```

---

## Troubleshooting

### Frontend não carrega
→ Verifique se o Nginx está rodando: `sudo systemctl status nginx`
→ Verifique se os arquivos do frontend estão em `/var/www/economyzee/frontend/dist-spa/`

### API retorna 502
→ Verifique se o backend está rodando: `pm2 status`
→ Verifique logs: `pm2 logs economyzee-backend`

### Telegram bot não responde
→ Verifique `NODE_ENV=production` no `.env`
→ Verifique webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
→ Verifique logs do backend: `pm2 logs economyzee-backend --lines 50`

### Emails não são enviados
→ Verifique `RESEND_API_KEY` no `.env`
→ Verifique se o domínio está verificado em https://resend.com/domains
