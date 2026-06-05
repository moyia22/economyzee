# EconomyZee — Deploy Checklist para VPS Hostinger

## Pré-requisitos na VPS

- [ ] Ubuntu 22.04+ ou Debian 12+
- [ ] Acesso SSH com chave RSA
- [ ] Domínio `economyzee.com` apontando para o IP da VPS (DNS A Record)
- [ ] Domínio `www.economyzee.com` apontando para o IP da VPS (DNS A Record ou CNAME)

---

## 1. Configuração Inicial do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node -v  # v20.x
npm -v

# Instalar PM2 globalmente
sudo npm install -g pm2
```

---

## 2. Instalar Docker (PostgreSQL + Redis)

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Logout e login novamente para aplicar o grupo docker
exit
# reconecte via SSH

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin

# Verificar
docker --version
docker compose version
```

---

## 3. Clonar e Preparar o Projeto

```bash
# Criar diretório
sudo mkdir -p /var/www/economyzee
sudo chown $USER:$USER /var/www/economyzee

# Clonar repositório
cd /var/www/economyzee
git clone <SEU_REPOSITORIO_GIT> .

# Ou copiar via SCP
# scp -r ./backend ./deploy user@IP_VPS:/var/www/economyzee/
```

---

## 4. Configurar Backend

```bash
cd /var/www/economyzee/backend

# Instalar dependências
npm ci --production=false

# Copiar e editar .env
cp .env.example .env
nano .env
# ⚠️ CONFIGURE TODAS AS VARIÁVEIS (veja seção "Variáveis de Ambiente" abaixo)

# Iniciar PostgreSQL + Redis
cd /var/www/economyzee
docker compose up -d

# Aguardar containers ficarem saudáveis
docker compose ps

# Executar migrations do Prisma
cd /var/www/economyzee/backend
npx prisma generate
npx prisma migrate deploy

# Executar seed (se necessário)
npx tsx prisma/seed.ts

# Compilar o backend
npm run build
```

---

## 5. Build do Frontend

```bash
cd /var/www/economyzee

# Instalar dependências do frontend
npm ci --production=false

# Build SPA com variáveis de produção
npm run build:spa
# O output estará em ./dist-spa/
```

---

## 6. Configurar Nginx

```bash
# Copiar configuração do Nginx
sudo cp /var/www/economyzee/deploy/nginx.conf /etc/nginx/sites-available/economyzee.conf
sudo ln -s /etc/nginx/sites-available/economyzee.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Antes do SSL — comentar temporariamente as linhas ssl_certificate no nginx.conf
# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 7. Configurar SSL (Certbot)

```bash
# Obter certificado SSL
sudo certbot --nginx -d economyzee.com -d www.economyzee.com

# Verificar renovação automática
sudo certbot renew --dry-run

# Adicionar cron para renovação
sudo crontab -e
# Adicionar: 0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 8. Iniciar Backend com PM2

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/economyzee
sudo chown $USER:$USER /var/log/economyzee

# Iniciar com PM2
cd /var/www/economyzee
pm2 start deploy/ecosystem.config.js

# Verificar status
pm2 status
pm2 logs economyzee-backend

# Salvar configuração PM2 para restart automático
pm2 save
pm2 startup
# Execute o comando que o PM2 sugerir (sudo env PATH=...)
```

---

## 9. Registrar Webhook do Telegram

```bash
# Substituir <TOKEN> pelo seu TELEGRAM_BOT_TOKEN
# Substituir <SECRET> pelo seu WEBHOOK_SECRET
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://economyzee.com/api/integrations/telegram/webhook",
    "secret_token": "<SECRET>"
  }'

# Verificar webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## 10. Verificação Final

- [ ] `https://economyzee.com` carrega o frontend
- [ ] `https://economyzee.com/api/health` retorna status OK
- [ ] Login com Supabase Auth funciona
- [ ] Criar transação manual funciona
- [ ] Bot do Telegram responde no chat
- [ ] Webhook do Telegram está configurado corretamente
- [ ] Envio de email de convite funciona
- [ ] SSE (real-time sync) atualiza o dashboard
- [ ] WebSocket (Socket.IO) conecta
- [ ] Swagger está acessível em `https://economyzee.com/docs`

---

## Variáveis de Ambiente — Produção (`backend/.env`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:SENHA_FORTE@localhost:5432/economyzee` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Segredo JWT (mín. 32 chars) | Gere com `openssl rand -hex 32` |
| `JWT_EXPIRATION` | Expiração do token | `7d` |
| `TELEGRAM_BOT_TOKEN` | Token do BotFather | `123456:ABC-DEF...` |
| `WEBHOOK_SECRET` | Segredo do webhook Telegram | Gere com `openssl rand -hex 16` |
| `TELEGRAM_WEBHOOK_URL` | URL do webhook | `https://economyzee.com/api/integrations/telegram/webhook` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase | `eyJ...` |
| `SUPABASE_JWT_SECRET` | JWT secret do Supabase | `xxx` |
| `APP_URL` | URL do backend | `https://economyzee.com` |
| `APP_PORT` | Porta do backend | `3333` |
| `FRONTEND_URL` | URL do frontend | `https://economyzee.com` |
| `FRONTEND_ORIGINS` | Origens CORS permitidas | `https://economyzee.com,https://www.economyzee.com` |
| `NODE_ENV` | Ambiente | `production` |
| `TZ` | Timezone | `America/Sao_Paulo` |
| `RESEND_API_KEY` | Chave API do Resend | `re_xxx` |
| `EMAIL_FROM` | Remetente de emails | `EconomyZee <no-reply@economyzee.com>` |

### Variáveis do Frontend (`.env.production`)

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `/api` |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

---

## Comandos Úteis de Manutenção

```bash
# Ver logs do backend
pm2 logs economyzee-backend

# Restart do backend
pm2 restart economyzee-backend

# Verificar status
pm2 status

# Recarregar Nginx
sudo systemctl reload nginx

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Atualizar código
cd /var/www/economyzee
git pull
cd backend && npm ci && npm run build
pm2 restart economyzee-backend
cd .. && npm ci && npm run build:spa
sudo systemctl reload nginx
```

---

## ⚠️ Checklist de Segurança

- [ ] Altere `JWT_SECRET` para um valor forte (mín. 32 chars aleatórios)
- [ ] Altere `WEBHOOK_SECRET` para um valor forte
- [ ] Altere a senha do PostgreSQL no Docker Compose e na `DATABASE_URL`
- [ ] Configure firewall (ufw): permitir apenas 22, 80, 443
- [ ] `.env` NÃO deve estar no git (verifique `.gitignore`)
- [ ] Desabilite acesso root SSH
- [ ] Configure fail2ban para proteção contra brute force
