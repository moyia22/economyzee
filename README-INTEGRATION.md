# EconomyZee — Guia de Integração Backend

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Telegram    │────▶│  NestJS API  │────▶│ PostgreSQL  │
│  Bot         │     │  :3000       │     │  :5432      │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
┌─────────────┐     ┌──────┴───────┐     ┌─────────────┐
│  Dashboard   │────▶│  Gemini AI   │     │   Redis     │
│  Vite :8080  │     │  (Google)    │     │   :6379     │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Pré-requisitos

- **Node.js** ≥ 18
- **Docker Desktop** (para PostgreSQL e Redis)
- **Telegram Bot Token** (de @BotFather)
- **Google Gemini API Key** (de aistudio.google.com)

## Setup Rápido

### 1. Subir infraestrutura (PostgreSQL + Redis)

```bash
docker compose up -d
```

### 2. Configurar variáveis de ambiente

```bash
cd backend
cp .env.example .env
# Edite .env com seus tokens:
# - TELEGRAM_BOT_TOKEN
# - GEMINI_API_KEY
```

### 3. Instalar dependências do backend

```bash
cd backend
npm install
```

### 4. Criar banco e popular dados

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Iniciar o backend

```bash
cd backend
npm run start:dev
```

O backend estará em: **http://localhost:3000**
Swagger docs: **http://localhost:3000/docs**

### 6. Iniciar o frontend (já funciona com mocks)

```bash
# Na raiz do projeto
npm run dev
```

### 7. Trocar para API real (opcional)

Crie/edite o arquivo `.env` na raiz do projeto:

```env
VITE_API_MODE=api
VITE_API_URL=http://localhost:3000
```

Reinicie o frontend. Ele agora consumirá a API real.

## Credenciais de teste (após seed)

| Email | Senha | Papel |
|---|---|---|
| lara@economyzee.app | economyzee123 | Admin |
| leo@economyzee.app | economyzee123 | Member |
| ana@economyzee.app | economyzee123 | Viewer |

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/login | Login (retorna JWT) |
| GET | /api/dashboard/summary | KPIs + gráficos |
| GET | /api/transactions | Transações (paginado) |
| POST | /api/transactions | Criar transação |
| GET | /api/analytics/summary | Resumo analítico |
| GET | /api/analytics/monthly-evolution | Evolução mensal |
| GET | /api/analytics/category-breakdown | Gastos por categoria |
| GET | /api/accounts | Contas bancárias |
| GET | /api/cards | Cartões de crédito |
| GET | /api/bills | Contas a pagar |
| POST | /api/bills/:id/mark-paid | Marcar como paga |
| GET | /api/budgets | Orçamentos |
| GET | /api/reports | Relatórios |
| GET | /telegram/status | Status do bot |
| POST | /telegram/webhook | Webhook Telegram |

## Bot Telegram

### Comandos

| Comando | Ação |
|---|---|
| /start | Boas-vindas + instruções |
| /help | Lista de comandos |
| /resumo | Resumo financeiro do mês |
| /gastos | Últimos 5 gastos |
| /receitas | Últimas 5 receitas |

### Mensagens naturais

- "Gastei 50 no mercado" → Registra despesa
- "Recebi 2000 de salário" → Registra receita
- "Uber 30 reais" → Despesa de transporte
- Foto de cupom → IA extrai dados
- PDF de fatura → IA analisa

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React + TanStack Router + Recharts |
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL 16 + Prisma ORM |
| Filas | Redis 7 + BullMQ |
| Bot | Grammy (Telegram) |
| IA | Google Gemini 2.0 Flash |
| Infra | Docker Compose |

## Troubleshooting

### Erro de conexão com PostgreSQL
```bash
docker compose ps  # Verificar se está rodando
docker compose logs postgres  # Ver logs
```

### Erro de conexão com Redis
```bash
docker compose logs redis
```

### Prisma: erro de migração
```bash
cd backend
npx prisma migrate reset  # CUIDADO: apaga todos os dados
npx prisma db seed
```

### Frontend não conecta no backend
Verifique se `VITE_API_URL` está correto e o backend está rodando.
