# Memória de Categorização por Usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o bot aprender a categoria que o usuário corrige (ex.: "claude" → Assinaturas) e aplicá-la automaticamente nos próximos lançamentos com o mesmo termo.

**Architecture:** Tabela Prisma `UserCategoryMemory` (`userId` + `token` → `category`). Um util puro extrai o token principal da frase; um `CategoryMemoryService` lê a memória antes da confirmação (`applyTo`) e grava ao salvar uma correção (`learn`). Integração em dois pontos do `telegram.service.ts`. Memória do usuário tem prioridade sobre regras fixas e IA.

**Tech Stack:** NestJS, Prisma (PostgreSQL/Supabase), TypeScript, test runner nativo do Node (`node --test` via tsx).

**⚠️ Ambiente:** `prisma migrate dev` / `prisma generate` falham localmente (bloqueio pré-existente de ambiente, não de código — ver memória `backend-db-env-blockers`). Os testes deste plano são unitários e **não dependem do banco nem do client gerado** (usam Prisma falso via `any` e tsx, que transpila sem type-check). A migration é escrita aqui; sua aplicação real no banco fica para quando o ambiente estiver disponível.

Todos os caminhos relativos abaixo partem de `backend/`.

---

### Task 1: Modelo Prisma `UserCategoryMemory`

**Files:**
- Modify: `prisma/schema.prisma` (model `User` ~L110-116; adicionar model novo após o model `User`)

- [ ] **Step 1: Adicionar a relação no model `User`**

Em `prisma/schema.prisma`, dentro do model `User`, junto às outras relações (logo após a linha `workspaceCardPreferences WorkspaceCardPreference[]`), adicionar:

```prisma
  userCategoryMemories     UserCategoryMemory[]
```

- [ ] **Step 2: Adicionar o model novo**

Imediatamente após o fechamento do model `User` (após a linha `@@map("users")` e sua `}`), adicionar:

```prisma
model UserCategoryMemory {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String
  category  String
  hitCount  Int      @default(0) @map("hit_count")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token])
  @@index([userId])
  @@map("user_category_memory")
}
```

- [ ] **Step 3: Criar a migration SQL manualmente**

Como `prisma migrate dev` está bloqueado no ambiente, criar o arquivo de migration à mão.
Create: `prisma/migrations/20260603120000_user_category_memory/migration.sql`

```sql
-- CreateTable
CREATE TABLE "user_category_memory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_category_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_category_memory_user_id_token_key" ON "user_category_memory"("user_id", "token");

-- CreateIndex
CREATE INDEX "user_category_memory_user_id_idx" ON "user_category_memory"("user_id");

-- AddForeignKey
ALTER TABLE "user_category_memory" ADD CONSTRAINT "user_category_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260603120000_user_category_memory/migration.sql
git commit -m "feat(db): add UserCategoryMemory model + migration"
```

---

### Task 2: Util `extractMemoryToken` (função pura)

**Files:**
- Create: `src/modules/financial-parser/category-memory.util.ts`
- Test: `src/modules/financial-parser/category-memory.util.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create: `src/modules/financial-parser/category-memory.util.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMemoryToken } from './category-memory.util';

test('extrai o termo desconhecido do gasto', () => {
  assert.equal(extractMemoryToken('gasto de 110 com o claude'), 'claude');
  assert.equal(extractMemoryToken('gasto de 40 com o claude'), 'claude');
});

test('ignora valor, verbos e conectores', () => {
  assert.equal(extractMemoryToken('gastei 50 reais no spotify'), 'spotify');
  assert.equal(extractMemoryToken('paguei 30 pix netflix'), 'netflix');
});

test('escolhe o token mais longo quando há vários', () => {
  assert.equal(extractMemoryToken('uber e claude'), 'claude');
  assert.equal(extractMemoryToken('mercado pao'), 'mercado');
});

test('usa só a primeira linha, ignorando a correção anexada', () => {
  assert.equal(extractMemoryToken('gasto de 110 com o claude\nCorrecao: Assinaturas'), 'claude');
});

test('retorna null quando não sobra token significativo', () => {
  assert.equal(extractMemoryToken('gastei 110'), null);
  assert.equal(extractMemoryToken('110'), null);
  assert.equal(extractMemoryToken(''), null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test:unit -- --test-name-pattern="extrai o termo"`
(ou simplesmente `npm run test:unit`)
Expected: FALHA com erro de import (`extractMemoryToken` não existe / arquivo não encontrado).

- [ ] **Step 3: Implementar o util**

Create: `src/modules/financial-parser/category-memory.util.ts`

```ts
/**
 * Extrai o "token principal" de um lançamento em texto livre, para ser usado
 * como chave da memória de categorização por usuário.
 *
 * Ex.: "gasto de 110 com o claude" -> "claude"
 */

const STOPWORDS = new Set([
  'de', 'com', 'no', 'na', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'pra', 'para', 'em', 'do', 'da', 'dos', 'das', 'ao', 'aos',
  'reais', 'real', 'conto', 'contos', 'rs',
  'pix', 'dinheiro', 'especie', 'cartao', 'credito', 'debito', 'via',
  'gastei', 'gasto', 'gastar', 'gastando', 'paguei', 'pagar', 'pago', 'pagamento',
  'comprei', 'comprar', 'compra', 'valor', 'foi', 'era', 'que', 'meu', 'minha',
]);

export function extractMemoryToken(rawText: string | undefined | null): string | null {
  if (!rawText) return null;

  // Usa apenas a primeira linha — ignora sufixos "\nCorrecao: ..." anexados.
  const firstLine = rawText.split('\n')[0];

  const normalized = firstLine
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // remove acentos
    .replace(/r\$/g, ' ')               // remove símbolo de moeda
    .replace(/\d+([.,]\d+)?/g, ' ')     // remove números
    .replace(/[^a-z\s]/g, ' ')          // remove pontuação/símbolos
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  if (tokens.length === 0) return null;

  // Token principal: o mais longo; empate -> o último na frase (>= faz o último vencer).
  let best = tokens[0];
  for (const t of tokens) {
    if (t.length >= best.length) best = t;
  }
  return best;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test:unit`
Expected: PASS (todos os testes de `category-memory.util.test.ts` verdes).

- [ ] **Step 5: Commit**

```bash
git add src/modules/financial-parser/category-memory.util.ts src/modules/financial-parser/category-memory.util.test.ts
git commit -m "feat(parser): extractMemoryToken util + tests"
```

---

### Task 3: `CategoryMemoryService` (leitura/escrita) + módulo

**Files:**
- Create: `src/modules/category-memory/category-memory.service.ts`
- Create: `src/modules/category-memory/category-memory.module.ts`
- Test: `src/modules/category-memory/category-memory.service.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create: `src/modules/category-memory/category-memory.service.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryMemoryService } from './category-memory.service';

// Prisma falso em memória, tipado como any para o construtor.
function makeFakePrisma(rows: any[] = []) {
  return {
    rows,
    userCategoryMemory: {
      async findUnique({ where }: any) {
        const { userId, token } = where.userId_token;
        return rows.find((r) => r.userId === userId && r.token === token) || null;
      },
      async update({ where, data }: any) {
        const { userId, token } = where.userId_token;
        const row = rows.find((r) => r.userId === userId && r.token === token);
        if (row && data.hitCount?.increment) row.hitCount += data.hitCount.increment;
        if (row && data.category) row.category = data.category;
        return row;
      },
      async upsert({ where, create, update }: any) {
        const { userId, token } = where.userId_token;
        const row = rows.find((r) => r.userId === userId && r.token === token);
        if (row) {
          Object.assign(row, update);
          return row;
        }
        const created = { hitCount: 0, ...create };
        rows.push(created);
        return created;
      },
    },
  };
}

test('learn grava o token -> categoria', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto de 110 com o claude', 'Assinaturas');
  assert.equal(prisma.rows.length, 1);
  assert.deepEqual(
    { userId: prisma.rows[0].userId, token: prisma.rows[0].token, category: prisma.rows[0].category },
    { userId: 'u1', token: 'claude', category: 'Assinaturas' },
  );
});

test('learn ignora categoria genérica Outros', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto com o claude', 'Outros');
  assert.equal(prisma.rows.length, 0);
});

test('learn ignora quando não há token válido', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gastei 110', 'Assinaturas');
  assert.equal(prisma.rows.length, 0);
});

test('applyTo sobrescreve a categoria e incrementa hitCount', async () => {
  const prisma = makeFakePrisma([
    { userId: 'u1', token: 'claude', category: 'Assinaturas', hitCount: 0 },
  ]);
  const svc = new CategoryMemoryService(prisma as any);
  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  const applied = await svc.applyTo('u1', draft);
  assert.equal(applied, true);
  assert.equal(draft.category, 'Assinaturas');
  assert.equal(prisma.rows[0].hitCount, 1);
});

test('applyTo não faz nada quando não há memória', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  const applied = await svc.applyTo('u1', draft);
  assert.equal(applied, false);
  assert.equal(draft.category, 'Moradia');
});

test('cenário do print: aprende e aplica no próximo lançamento', async () => {
  const prisma = makeFakePrisma();
  const svc = new CategoryMemoryService(prisma as any);
  await svc.learn('u1', 'gasto de 110 com o claude', 'Assinaturas');

  const draft: any = { rawText: 'gasto de 40 com o claude', category: 'Moradia' };
  await svc.applyTo('u1', draft);
  assert.equal(draft.category, 'Assinaturas');
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test:unit`
Expected: FALHA com erro de import (`CategoryMemoryService` não existe).

- [ ] **Step 3: Implementar o serviço**

Create: `src/modules/category-memory/category-memory.service.ts`

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { extractMemoryToken } from '../financial-parser/category-memory.util';

@Injectable()
export class CategoryMemoryService {
  private readonly logger = new Logger(CategoryMemoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lê a memória do usuário e, se houver um token aprendido, sobrescreve
   * `draft.category`. Retorna true se aplicou. Nunca lança.
   */
  async applyTo(userId: string, draft: { rawText: string; category: string }): Promise<boolean> {
    try {
      const token = extractMemoryToken(draft.rawText);
      if (!token) return false;

      const mem = await this.prisma.userCategoryMemory.findUnique({
        where: { userId_token: { userId, token } },
      });
      if (!mem || mem.category === draft.category) return false;

      draft.category = mem.category;
      await this.prisma.userCategoryMemory.update({
        where: { userId_token: { userId, token } },
        data: { hitCount: { increment: 1 } },
      });
      this.logger.log(`[CategoryMemory] Aplicado: "${token}" -> ${mem.category} (user ${userId})`);
      return true;
    } catch (e: any) {
      this.logger.warn(`[CategoryMemory] applyTo falhou: ${e.message}`);
      return false;
    }
  }

  /**
   * Aprende/atualiza o mapeamento token -> categoria do usuário.
   * Ignora categorias genéricas e tokens inválidos. Nunca lança.
   */
  async learn(userId: string, rawText: string, category: string): Promise<void> {
    try {
      const token = extractMemoryToken(rawText);
      if (!token) return;
      if (!category || category.trim().toLowerCase() === 'outros') return;

      await this.prisma.userCategoryMemory.upsert({
        where: { userId_token: { userId, token } },
        create: { userId, token, category, hitCount: 1 },
        update: { category },
      });
      this.logger.log(`[CategoryMemory] Aprendido: "${token}" -> ${category} (user ${userId})`);
    } catch (e: any) {
      this.logger.warn(`[CategoryMemory] learn falhou: ${e.message}`);
    }
  }
}
```

- [ ] **Step 4: Criar o módulo**

Create: `src/modules/category-memory/category-memory.module.ts`

```ts
import { Module } from '@nestjs/common';
import { CategoryMemoryService } from './category-memory.service';

// PrismaModule é @Global, então PrismaService está disponível sem import explícito.
@Module({
  providers: [CategoryMemoryService],
  exports: [CategoryMemoryService],
})
export class CategoryMemoryModule {}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test:unit`
Expected: PASS (todos os testes de `category-memory.service.test.ts` verdes).

- [ ] **Step 6: Commit**

```bash
git add src/modules/category-memory/
git commit -m "feat(category-memory): CategoryMemoryService (applyTo/learn) + module + tests"
```

---

### Task 4: Campo `originalCategory` no `TransactionDraft`

**Files:**
- Modify: `src/modules/redis/redis.service.ts` (interface `TransactionDraft`, ~L44-46)

- [ ] **Step 1: Adicionar o campo**

Em `src/modules/redis/redis.service.ts`, dentro da interface `TransactionDraft`, logo antes do fechamento `}` (após `targetMemberId?: string;`), adicionar:

```ts
  // Categoria sugerida pelo parser ANTES da memória/correção — usada para detectar
  // se o usuário corrigiu a categoria (gatilho de aprendizado).
  originalCategory?: string;
```

- [ ] **Step 2: Verificar compilação dos testes (sem regressão)**

Run: `npm run test:unit`
Expected: PASS (nenhum teste quebra; mudança é só de tipo).

- [ ] **Step 3: Commit**

```bash
git add src/modules/redis/redis.service.ts
git commit -m "feat(telegram): add originalCategory to TransactionDraft"
```

---

### Task 5: Wiring + aplicação da memória (leitura) no Telegram

**Files:**
- Modify: `src/modules/telegram/telegram.module.ts` (imports)
- Modify: `src/modules/telegram/telegram.service.ts` (constructor ~L?; `handleParseResult` início ~L1011)

- [ ] **Step 1: Importar o módulo no `TelegramModule`**

Em `src/modules/telegram/telegram.module.ts`, adicionar o import no topo (junto aos outros):

```ts
import { CategoryMemoryModule } from '../category-memory/category-memory.module';
```

E adicionar `CategoryMemoryModule` ao array `imports` do `@Module` (após `AnalyticsModule,`):

```ts
    AnalyticsModule,
    CategoryMemoryModule,
```

- [ ] **Step 2: Importar e injetar o serviço no `TelegramService`**

Em `src/modules/telegram/telegram.service.ts`, adicionar o import (junto aos demais imports de serviços):

```ts
import { CategoryMemoryService } from '../category-memory/category-memory.service';
```

No `constructor`, adicionar o parâmetro logo após `private redis: RedisService,`:

```ts
    private categoryMemory: CategoryMemoryService,
```

- [ ] **Step 3: Aplicar a memória no início de `handleParseResult`**

Em `src/modules/telegram/telegram.service.ts`, na primeira linha do corpo de `handleParseResult` (logo após `private async handleParseResult(draft: any, ctx: Context, chatId: string, messageId?: number) {`), inserir:

```ts
    // Memória de categorização: na primeira passagem por este draft, registra a
    // categoria sugerida pelo parser e aplica a memória do usuário (se houver).
    // Em re-renderizações (após correção) originalCategory já está setado -> não reaplica,
    // preservando a correção manual recém-feita.
    if (draft.originalCategory === undefined) {
      draft.originalCategory = draft.category || 'Outros';
      if (draft.userId) {
        await this.categoryMemory.applyTo(draft.userId, draft);
      }
    }
```

- [ ] **Step 4: Rodar os testes unitários (sanidade)**

Run: `npm run test:unit`
Expected: PASS (testes existentes continuam verdes; mudança no telegram não é coberta por unit test, validação manual na Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/modules/telegram/telegram.module.ts src/modules/telegram/telegram.service.ts
git commit -m "feat(telegram): apply user category memory before confirmation"
```

---

### Task 6: Captura do aprendizado (escrita) no `saveTransaction`

**Files:**
- Modify: `src/modules/telegram/telegram.service.ts` (`saveTransaction`, no fim do bloco de sucesso ~L1796)

- [ ] **Step 1: Chamar `learn` após o salvamento bem-sucedido**

Em `src/modules/telegram/telegram.service.ts`, dentro de `saveTransaction`, logo após a linha `this.logger.log('[Supabase] Fim: Sucesso');` (antes do `await ctx.reply(...sucesso...)`), inserir:

```ts
      // Aprendizado: se a categoria final difere da sugerida pelo parser,
      // o usuário corrigiu -> memoriza token -> categoria. Best-effort.
      const original = (draft as any).originalCategory;
      if (original !== undefined && draft.category && draft.category !== original) {
        await this.categoryMemory.learn(draft.userId, draft.rawText, draft.category);
      }
```

- [ ] **Step 2: Rodar os testes unitários (sanidade)**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/telegram/telegram.service.ts
git commit -m "feat(telegram): learn category correction on save"
```

---

### Task 7: Verificação manual (smoke test) — quando o ambiente/banco estiver disponível

> Esta task não tem teste automatizado; depende do banco e do bot rodando.
> Requer a migration da Task 1 aplicada (`prisma migrate deploy` ou execução do SQL) e o Prisma Client regenerado (`npx prisma generate`) — ambos dependem do desbloqueio de ambiente (`backend-db-env-blockers`).

- [ ] **Step 1: Aplicar migration e regenerar client**

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```
Expected: tabela `user_category_memory` criada; client com `prisma.userCategoryMemory` disponível.

- [ ] **Step 2: Reproduzir o cenário do print no Telegram**

1. Enviar: `gasto de 110 com o claude` → categoria sugerida (ex.: Moradia).
2. Tocar em **Mudar Categoria** → digitar `Assinaturas` → **Confirmar**.
3. Enviar: `gasto de 40 com o claude`.

Expected: no passo 3, a conferência já mostra **Categoria: Assinaturas** automaticamente (sem precisar corrigir).

- [ ] **Step 3: Verificar persistência**

```bash
# via psql / Supabase SQL editor
SELECT user_id, token, category, hit_count FROM user_category_memory;
```
Expected: uma linha com `token = 'claude'`, `category = 'Assinaturas'`, `hit_count >= 1`.

---

## Notas de execução

- **Ordem:** Tasks 1→6 podem ser feitas/commitadas em sequência. Task 7 fica para quando o banco estiver acessível.
- **Sem regressão de testes:** rodar `npm run test:unit` ao final de cada task que toca código.
- **Precedência confirmada:** a memória vence regras fixas e IA porque `applyTo` roda em `handleParseResult` depois do parser já ter definido a categoria, sobrescrevendo-a.
