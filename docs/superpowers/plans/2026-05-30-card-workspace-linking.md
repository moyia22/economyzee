# Vínculo de Cartões Pessoal ↔ Workspace — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um usuário, dentro de um workspace compartilhado, vincule seus cartões pessoais (em massa via "Definir cartões padrão" com auto-vínculo persistente, ou individualmente), de modo que gastos no workspace contem no mesmo limite/fatura do cartão pessoal — visível e utilizável apenas pelo próprio usuário.

**Architecture:** O `Card` continua pertencendo ao org Pessoal. Duas tabelas novas (`CardWorkspaceLink`, `WorkspaceCardPreference`) registram quais cartões pessoais aparecem em quais workspaces, por usuário, com um flag de auto-vínculo. Uma função pura (`resolveLinkedCardIds`) calcula o "conjunto efetivo" (auto-link + overrides). A agregação de uso/fatura já soma por `cardId` sem filtrar org, então limite/fatura ficam unificados automaticamente. O backend expõe os cartões vinculados no `GET /cards` e endpoints de gestão; `resolvePayment` passa a aceitar cartões pessoais vinculados ao lançar transações.

**Tech Stack:** Backend NestJS + Prisma (PostgreSQL). Frontend React 19 + TanStack Router/Query + Radix UI + Tailwind. Spec: `docs/superpowers/specs/2026-05-30-card-workspace-linking-design.md`.

## Convenções e realidade do projeto

- **Org pessoal** = org da associação (`OrganizationMember`) mais antiga do usuário (`createdAt asc`). NÃO usar `org.type === 'PERSONAL'` (não é confiável: `POST /organizations` cria qualquer workspace como `PERSONAL`).
- **Sem framework de testes** no projeto (nem backend nem frontend). Estratégia: a lógica pura central (`resolveLinkedCardIds`/`effectiveLinked`) é coberta por **teste unitário** com o runner nativo `node:test` rodado via `tsx` (já é devDependency — nenhuma dependência nova). Camadas de DB/HTTP/UI são verificadas **manualmente** com passos explícitos.
- **Git:** o diretório não é um repositório git. Os passos "Commit" são **opcionais** — rode `git init` antes se quiser usá-los, ou pule-os.
- Caminhos relativos à raiz do repo. Backend roda a partir de `backend/`.

## Estrutura de arquivos

**Criar:**
- `backend/src/modules/cards/card-links.util.ts` — funções puras `effectiveLinked` e `resolveLinkedCardIds`, e helper `getPersonalOrgId(prisma, userId)`.
- `backend/src/modules/cards/card-links.util.test.ts` — testes unitários das funções puras.
- `src/components/modals/LinkedCardsModal.tsx` — diálogo de gestão de cartões pessoais no workspace.

**Modificar:**
- `backend/prisma/schema.prisma` — 2 models novos + relações inversas em `User`, `Card`, `Organization`.
- `backend/package.json` — script `test:unit`.
- `backend/src/modules/cards/cards.service.ts` — `findAll(orgId, userId)` + `getLinkState` + `setAutoLink` + `setCardLink`.
- `backend/src/modules/cards/cards.controller.ts` — injetar `req.user.id` + endpoints `GET /cards/links`, `PUT /cards/links/auto`, `PUT /cards/links/:cardId`.
- `backend/src/modules/transactions/transactions.service.ts` — `resolvePayment` aceita cartão pessoal vinculado.
- `src/services/api-client.ts` — adicionar método `put`.
- `src/services/cards.service.ts` — `getCardLinks`, `setAutoLinkDefault`, `setCardLink`.
- `src/routes/accounts.tsx` — botão de gestão + selo "Pessoal" + "Desvincular" nos cartões vinculados.

---

### Task 1: Schema Prisma — tabelas de vínculo + migração

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar relações inversas nos models existentes**

No model `User`, imediatamente antes da linha `@@map("users")`, adicione:

```prisma
  cardWorkspaceLinks       CardWorkspaceLink[]
  workspaceCardPreferences WorkspaceCardPreference[]
```

No model `Card`, imediatamente antes da linha `@@map("cards")`, adicione:

```prisma
  workspaceLinks CardWorkspaceLink[]
```

No model `Organization`, imediatamente antes da linha `@@map("organizations")` (junto às outras relações como `cards`), adicione:

```prisma
  cardWorkspaceLinks       CardWorkspaceLink[]
  workspaceCardPreferences WorkspaceCardPreference[]
```

- [ ] **Step 2: Adicionar os dois models novos**

No fim de `backend/prisma/schema.prisma`, adicione:

```prisma
// Vínculo individual de um cartão pessoal a um workspace, por usuário.
// linked = true  -> vínculo explícito (cartão aparece no workspace)
// linked = false -> exclusão explícita (override do auto-link)
model CardWorkspaceLink {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  cardId    String   @map("card_id")
  orgId     String   @map("org_id")
  linked    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, cardId, orgId])
  @@index([userId, orgId])
  @@map("card_workspace_links")
}

// Preferência de auto-vínculo de cartões pessoais por (usuário, workspace).
model WorkspaceCardPreference {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  orgId     String   @map("org_id")
  autoLinkPersonalCards Boolean @default(false) @map("auto_link_personal_cards")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
  @@map("workspace_card_preferences")
}
```

- [ ] **Step 3: Validar o schema**

Run (a partir de `backend/`): `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Gerar a migração e o client**

Garanta que o banco está acessível (se usar Docker local: `npm run docker:up`).
Run (a partir de `backend/`): `npx prisma migrate dev --name add_card_workspace_links`
Expected: cria `backend/prisma/migrations/<timestamp>_add_card_workspace_links/` e termina com `✔ Generated Prisma Client`. As tabelas `card_workspace_links` e `workspace_card_preferences` passam a existir.

- [ ] **Step 5 (opcional, se usar git): Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): add card_workspace_links and workspace_card_preferences"
```

---

### Task 2: Função pura do "conjunto efetivo" + testes

**Files:**
- Create: `backend/src/modules/cards/card-links.util.ts`
- Test: `backend/src/modules/cards/card-links.util.test.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/src/modules/cards/card-links.util.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveLinked, resolveLinkedCardIds } from './card-links.util';

test('effectiveLinked: sem override segue o autoLink', () => {
  assert.equal(effectiveLinked(undefined, true), true);
  assert.equal(effectiveLinked(undefined, false), false);
});

test('effectiveLinked: override vence o autoLink', () => {
  assert.equal(effectiveLinked(false, true), false);
  assert.equal(effectiveLinked(true, false), true);
});

test('resolveLinkedCardIds: autoLink off, sem links -> vazio', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [], false);
  assert.deepEqual([...result].sort(), []);
});

test('resolveLinkedCardIds: autoLink on, sem links -> todos', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [], true);
  assert.deepEqual([...result].sort(), ['a', 'b']);
});

test('resolveLinkedCardIds: autoLink on com override linked=false exclui o cartão', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [{ cardId: 'b', linked: false }], true);
  assert.deepEqual([...result].sort(), ['a']);
});

test('resolveLinkedCardIds: autoLink off com override linked=true inclui só esse', () => {
  const result = resolveLinkedCardIds(['a', 'b'], [{ cardId: 'a', linked: true }], false);
  assert.deepEqual([...result].sort(), ['a']);
});

test('resolveLinkedCardIds: override de cardId inexistente é ignorado', () => {
  const result = resolveLinkedCardIds(['a'], [{ cardId: 'zzz', linked: true }], false);
  assert.deepEqual([...result].sort(), []);
});
```

- [ ] **Step 2: Adicionar o script de teste no `backend/package.json`**

Em `backend/package.json`, no bloco `"scripts"`, adicione (após `"format": ...`):

```json
    "test:unit": "node --import tsx --test \"src/**/*.test.ts\""
```

(Requer Node 20.6+. Se a versão for menor, rode o arquivo direto: `node --import tsx --test src/modules/cards/card-links.util.test.ts`.)

- [ ] **Step 3: Rodar o teste e ver falhar**

Run (a partir de `backend/`): `npm run test:unit`
Expected: FALHA com erro de importação tipo `Cannot find module './card-links.util'` (o arquivo ainda não existe).

- [ ] **Step 4: Implementar as funções**

Crie `backend/src/modules/cards/card-links.util.ts`:

```ts
import type { PrismaService } from '../../database/prisma.service';

export interface CardLinkRow {
  cardId: string;
  linked: boolean;
}

/**
 * Vínculo efetivo de UM cartão: o override explícito (se houver) vence;
 * caso contrário, segue o flag de auto-vínculo do workspace.
 */
export function effectiveLinked(override: boolean | undefined, autoLink: boolean): boolean {
  return override === undefined ? autoLink : override;
}

/**
 * Dado o conjunto de cartões pessoais, as linhas de override de um workspace e o
 * flag de auto-vínculo, retorna o conjunto de cardIds efetivamente vinculados.
 * Overrides de cartões que não pertencem ao conjunto pessoal são ignorados.
 */
export function resolveLinkedCardIds(
  personalCardIds: string[],
  links: CardLinkRow[],
  autoLink: boolean,
): Set<string> {
  const overrides = new Map(links.map((l) => [l.cardId, l.linked]));
  const result = new Set<string>();
  for (const cardId of personalCardIds) {
    if (effectiveLinked(overrides.get(cardId), autoLink)) {
      result.add(cardId);
    }
  }
  return result;
}

/**
 * Org pessoal do usuário = org da associação mais antiga (criada no signup).
 * NÃO depende de Organization.type, que não distingue o pessoal dos demais.
 */
export async function getPersonalOrgId(
  prisma: PrismaService,
  userId: string,
): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run (a partir de `backend/`): `npm run test:unit`
Expected: PASS — todos os testes verdes (`# pass 7`).

- [ ] **Step 6 (opcional, se usar git): Commit**

```bash
git add backend/src/modules/cards/card-links.util.ts backend/src/modules/cards/card-links.util.test.ts backend/package.json
git commit -m "feat(cards): pure resolver for effective card links + unit tests"
```

---

### Task 3: cards.service — listar vinculados e gerir estado

**Files:**
- Modify: `backend/src/modules/cards/cards.service.ts`

- [ ] **Step 1: Importar utilitários e tipos**

No topo de `backend/src/modules/cards/cards.service.ts`, ajuste os imports:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { effectiveLinked, getPersonalOrgId, resolveLinkedCardIds } from './card-links.util';
```

- [ ] **Step 2: Trocar a assinatura de `findAll` para incluir cartões pessoais vinculados**

Substitua o método `findAll(orgId: string)` inteiro (linhas atuais 8-45) por:

```ts
  async findAll(orgId: string, userId: string) {
    const ownCards = await this.prisma.card.findMany({ where: { orgId } });

    // Em workspace (org != pessoal), anexa os cartões pessoais efetivamente vinculados.
    const linkedCards: any[] = [];
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (personalOrgId && orgId !== personalOrgId) {
      const personalCards = await this.prisma.card.findMany({ where: { orgId: personalOrgId } });
      const [links, pref] = await Promise.all([
        this.prisma.cardWorkspaceLink.findMany({ where: { userId, orgId } }),
        this.prisma.workspaceCardPreference.findUnique({
          where: { userId_orgId: { userId, orgId } },
        }),
      ]);
      const linkedIds = resolveLinkedCardIds(
        personalCards.map((c) => c.id),
        links.map((l) => ({ cardId: l.cardId, linked: l.linked })),
        pref?.autoLinkPersonalCards ?? false,
      );
      for (const c of personalCards) {
        if (linkedIds.has(c.id)) {
          linkedCards.push({ ...c, isLinkedPersonal: true, sourceOrgId: personalOrgId });
        }
      }
    }

    const cards = [...ownCards, ...linkedCards];

    // Calcula uso real a partir das transações do mês corrente.
    // A agregação é por cardId SEM filtrar org -> limite/fatura ficam unificados.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const enriched = await Promise.all(cards.map(async (card) => {
      const usage = await this.prisma.transaction.aggregate({
        where: {
          cardId: card.id,
          deletedAt: null,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountInCents: true },
      });

      return {
        ...card,
        usedInCents: usage._sum.amountInCents || 0,
        invoiceInCents: usage._sum.amountInCents || 0,
      };
    }));

    return enriched;
  }
```

(Observação: o cálculo de `usage` e `invoiceTotal` no código original era idêntico; consolidado em uma única agregação `usage`.)

- [ ] **Step 3: Adicionar os métodos de gestão de vínculo no fim da classe**

Antes da última `}` da classe `CardsService` (depois de `getInvoices`), adicione:

```ts
  async getLinkState(orgId: string, userId: string) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      return { isPersonalContext: true, autoLink: false, cards: [] as any[] };
    }

    const personalCards = await this.prisma.card.findMany({
      where: { orgId: personalOrgId },
      orderBy: { createdAt: 'asc' },
    });
    const [links, pref] = await Promise.all([
      this.prisma.cardWorkspaceLink.findMany({ where: { userId, orgId } }),
      this.prisma.workspaceCardPreference.findUnique({
        where: { userId_orgId: { userId, orgId } },
      }),
    ]);
    const autoLink = pref?.autoLinkPersonalCards ?? false;
    const linkedIds = resolveLinkedCardIds(
      personalCards.map((c) => c.id),
      links.map((l) => ({ cardId: l.cardId, linked: l.linked })),
      autoLink,
    );

    return {
      isPersonalContext: false,
      autoLink,
      cards: personalCards.map((c) => ({
        id: c.id,
        name: c.name,
        last4: c.last4,
        brand: c.brand,
        color: c.color,
        linked: linkedIds.has(c.id),
      })),
    };
  }

  async setAutoLink(orgId: string, userId: string, enabled: boolean) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      throw new BadRequestException('O contexto pessoal não suporta vínculo de cartões.');
    }

    // Liga/desliga o auto-vínculo e LIMPA os overrides individuais (estado limpo).
    await this.prisma.$transaction([
      this.prisma.workspaceCardPreference.upsert({
        where: { userId_orgId: { userId, orgId } },
        create: { userId, orgId, autoLinkPersonalCards: enabled },
        update: { autoLinkPersonalCards: enabled },
      }),
      this.prisma.cardWorkspaceLink.deleteMany({ where: { userId, orgId } }),
    ]);

    return this.getLinkState(orgId, userId);
  }

  async setCardLink(orgId: string, userId: string, cardId: string, linked: boolean) {
    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || orgId === personalOrgId) {
      throw new BadRequestException('O contexto pessoal não suporta vínculo de cartões.');
    }

    const card = await this.prisma.card.findFirst({ where: { id: cardId, orgId: personalOrgId } });
    if (!card) {
      throw new BadRequestException('Cartão pessoal não encontrado.');
    }

    await this.prisma.cardWorkspaceLink.upsert({
      where: { userId_cardId_orgId: { userId, cardId, orgId } },
      create: { userId, cardId, orgId, linked },
      update: { linked },
    });

    return this.getLinkState(orgId, userId);
  }
```

- [ ] **Step 4: Compilar o backend para checar tipos**

Run (a partir de `backend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros relacionados a `cards.service.ts`. (Se `tsconfig.json` não tiver `noEmit`, use `npm run build` e confirme que compila.)

- [ ] **Step 5 (opcional, se usar git): Commit**

```bash
git add backend/src/modules/cards/cards.service.ts
git commit -m "feat(cards): surface linked personal cards and manage link state"
```

---

### Task 4: cards.controller — injetar userId + endpoints de vínculo

**Files:**
- Modify: `backend/src/modules/cards/cards.controller.ts`

- [ ] **Step 1: Substituir o controller inteiro**

Substitua todo o conteúdo de `backend/src/modules/cards/cards.controller.ts` por:

```ts
import { Controller, Get, Post, Patch, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private svc: CardsService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId, req.user.id); }

  // ---- Vínculo de cartões pessoais ao workspace (rotas estáticas antes das com :id) ----
  @Get('links')
  getLinks(@Request() req: any) {
    return this.svc.getLinkState(req.user.orgId, req.user.id);
  }

  @Put('links/auto')
  setAutoLink(@Request() req: any, @Body() body: { enabled?: boolean }) {
    return this.svc.setAutoLink(req.user.orgId, req.user.id, !!body?.enabled);
  }

  @Put('links/:cardId')
  setCardLink(@Request() req: any, @Param('cardId') cardId: string, @Body() body: { linked?: boolean }) {
    return this.svc.setCardLink(req.user.orgId, req.user.id, cardId, !!body?.linked);
  }
  // ---------------------------------------------------------------------------------------

  @Post()
  create(@Request() req: any, @Body() body: any) { return this.svc.create(req.user.orgId, body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Get(':id/invoices')
  getInvoices(@Param('id') id: string) { return this.svc.getInvoices(id); }
}
```

- [ ] **Step 2: Compilar e checar tipos**

Run (a partir de `backend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros em `cards.controller.ts`.

- [ ] **Step 3: Verificação manual dos endpoints**

Suba o backend (`npm run start:dev`). Com um token válido e o workspace ativo (header `x-organization-id` = id de um workspace **não** pessoal), rode:

```bash
# Estado inicial (deve listar seus cartões pessoais com linked=false e autoLink=false)
curl -s -H "Authorization: Bearer <TOKEN>" -H "x-organization-id: <WORKSPACE_ID>" \
  http://localhost:3333/api/cards/links | jq

# Definir cartões padrão (liga auto-link)
curl -s -X PUT -H "Authorization: Bearer <TOKEN>" -H "x-organization-id: <WORKSPACE_ID>" \
  -H "Content-Type: application/json" -d '{"enabled":true}' \
  http://localhost:3333/api/cards/links/auto | jq

# Remover um cartão individual (override linked=false)
curl -s -X PUT -H "Authorization: Bearer <TOKEN>" -H "x-organization-id: <WORKSPACE_ID>" \
  -H "Content-Type: application/json" -d '{"linked":false}' \
  http://localhost:3333/api/cards/links/<CARD_ID> | jq
```

Expected:
- `GET /cards/links` retorna `{ isPersonalContext: false, autoLink: false, cards: [...] }` (todos `linked:false`).
- Após `PUT .../auto {enabled:true}`: `autoLink:true` e todos os cartões `linked:true`.
- Após `PUT .../<CARD_ID> {linked:false}`: aquele cartão volta a `linked:false`, os demais seguem `true`.
- `GET /cards` (mesmo workspace) passa a incluir os cartões pessoais vinculados, marcados com `isLinkedPersonal:true`.
- Repetindo `GET /cards/links` com `x-organization-id` = org **pessoal**: retorna `{ isPersonalContext: true, cards: [] }`.

- [ ] **Step 4 (opcional, se usar git): Commit**

```bash
git add backend/src/modules/cards/cards.controller.ts
git commit -m "feat(cards): endpoints to manage personal-card links in a workspace"
```

---

### Task 5: transactions.service — aceitar cartão pessoal vinculado

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

- [ ] **Step 1: Importar os helpers de vínculo**

No topo de `backend/src/modules/transactions/transactions.service.ts`, adicione ao bloco de imports:

```ts
import { effectiveLinked, getPersonalOrgId } from '../cards/card-links.util';
```

- [ ] **Step 2: Ajustar `resolvePayment` para considerar cartões vinculados**

Em `resolvePayment(orgId, data)` (transactions.service.ts:172), substitua o bloco exato abaixo
(linhas atuais 176-207 — do `Promise.all` até o fim do `if (card) { ... }`):

```ts
    const [card, account] = await Promise.all([
      cardId ? this.prisma.card.findFirst({ where: { id: cardId, orgId } }) : null,
      accountId ? this.prisma.account.findFirst({ where: { id: accountId, orgId } }) : null,
    ]);

    if (cardId && !card) {
      throw new BadRequestException('Cartao nao encontrado neste workspace.');
    }

    if (accountId && !account) {
      throw new BadRequestException('Conta nao encontrada neste workspace.');
    }

    let paymentMethod = this.normalizePaymentMethod(data.paymentMethod);

    if (card) {
      const inferred = card.cardType === 'DEBIT'
        ? PaymentMethod.DEBIT_CARD
        : PaymentMethod.CREDIT_CARD;

      if (
        paymentMethod &&
        CARD_PAYMENT_METHODS.includes(paymentMethod) &&
        paymentMethod !== inferred
      ) {
        throw new BadRequestException(
          `Voce selecionou ${paymentMethod === PaymentMethod.CREDIT_CARD ? 'credito' : 'debito'}, mas o cartao e de ${card.cardType === 'DEBIT' ? 'debito' : 'credito'}.`,
        );
      }

      paymentMethod = inferred;
    }
```

por (note `resolvedCard` substituindo `card` no bloco de inferência):

```ts
    const [card, account] = await Promise.all([
      cardId ? this.prisma.card.findFirst({ where: { id: cardId, orgId } }) : null,
      accountId ? this.prisma.account.findFirst({ where: { id: accountId, orgId } }) : null,
    ]);

    // Cartão do próprio workspace OU cartão pessoal vinculado a este workspace.
    let resolvedCard = card;
    if (cardId && !resolvedCard) {
      resolvedCard = await this.resolveLinkedPersonalCard(orgId, data.userId, cardId);
    }

    if (cardId && !resolvedCard) {
      throw new BadRequestException('Cartao nao encontrado neste workspace.');
    }

    if (accountId && !account) {
      throw new BadRequestException('Conta nao encontrada neste workspace.');
    }

    let paymentMethod = this.normalizePaymentMethod(data.paymentMethod);

    if (resolvedCard) {
      const inferred = resolvedCard.cardType === 'DEBIT'
        ? PaymentMethod.DEBIT_CARD
        : PaymentMethod.CREDIT_CARD;

      if (
        paymentMethod &&
        CARD_PAYMENT_METHODS.includes(paymentMethod) &&
        paymentMethod !== inferred
      ) {
        throw new BadRequestException(
          `Voce selecionou ${paymentMethod === PaymentMethod.CREDIT_CARD ? 'credito' : 'debito'}, mas o cartao e de ${resolvedCard.cardType === 'DEBIT' ? 'debito' : 'credito'}.`,
        );
      }

      paymentMethod = inferred;
    }
```

O `return { accountId, cardId, paymentMethod }` no fim do método permanece igual (usa `cardId`, não `card`).

- [ ] **Step 3: Adicionar o helper privado `resolveLinkedPersonalCard`**

Logo após o método `resolvePayment` (antes do próximo método), adicione:

```ts
  /**
   * Retorna o cartão pessoal do usuário se ele estiver efetivamente vinculado
   * a este workspace; caso contrário, null.
   */
  private async resolveLinkedPersonalCard(orgId: string, userId: string | undefined, cardId: string) {
    if (!userId) return null;

    const personalOrgId = await getPersonalOrgId(this.prisma, userId);
    if (!personalOrgId || personalOrgId === orgId) return null;

    const card = await this.prisma.card.findFirst({ where: { id: cardId, orgId: personalOrgId } });
    if (!card) return null;

    const link = await this.prisma.cardWorkspaceLink.findUnique({
      where: { userId_cardId_orgId: { userId, cardId, orgId } },
    });

    let autoLink = false;
    if (!link) {
      const pref = await this.prisma.workspaceCardPreference.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });
      autoLink = pref?.autoLinkPersonalCards ?? false;
    }

    return effectiveLinked(link?.linked, autoLink) ? card : null;
  }
```

- [ ] **Step 4: Confirmar que `data.userId` chega aqui**

Verifique que `TransactionInput` tem `userId?: string` (já tem) e que o controller passa `userId: req.user.sub` no `create` (já passa, em `transactions.controller.ts:29`). Nenhuma mudança necessária — apenas confirme.

- [ ] **Step 5: Compilar e checar tipos**

Run (a partir de `backend/`): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros em `transactions.service.ts`.

- [ ] **Step 6: Verificação manual (gasto no workspace com cartão pessoal vinculado)**

Com o backend rodando e um cartão pessoal vinculado ao workspace (Task 4):

```bash
curl -s -X POST -H "Authorization: Bearer <TOKEN>" -H "x-organization-id: <WORKSPACE_ID>" \
  -H "Content-Type: application/json" \
  -d '{"type":"EXPENSE","description":"Teste cartao pessoal","amountInCents":5000,"categoryId":"<CAT_ID>","paymentMethod":"CREDIT_CARD","cardId":"<PERSONAL_CARD_ID>","userId":"<USER_ID>"}' \
  http://localhost:3333/api/transactions | jq
```

Expected:
- Sucesso (HTTP 201), transação criada com `cardId` = cartão pessoal e `orgId` = workspace.
- `GET /cards` no workspace mostra o uso do cartão refletindo o gasto.
- `GET /cards` no **pessoal** mostra o MESMO uso aumentado (limite unificado por `cardId`).
- Tentar o mesmo POST com um `cardId` pessoal **não** vinculado → erro `Cartao nao encontrado neste workspace.`

- [ ] **Step 7 (opcional, se usar git): Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): accept linked personal cards when paying in a workspace"
```

---

### Task 6: Frontend — api-client `put` + serviço de vínculos

**Files:**
- Modify: `src/services/api-client.ts`
- Modify: `src/services/cards.service.ts`

- [ ] **Step 1: Adicionar `put` ao api-client**

Em `src/services/api-client.ts`, no objeto `export const api = { ... }`, adicione a linha do `put` após o `patch`:

```ts
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Adicionar funções de vínculo em `cards.service.ts`**

No fim de `src/services/cards.service.ts`, adicione:

```ts
export interface CardLinkItem {
  id: string;
  name: string;
  last4: string;
  brand: string;
  color: string;
  linked: boolean;
}

export interface CardLinkState {
  isPersonalContext: boolean;
  autoLink: boolean;
  cards: CardLinkItem[];
}

export async function getCardLinks() {
  return api.get<CardLinkState>('/cards/links');
}

export async function setAutoLinkDefault(enabled: boolean) {
  return api.put<CardLinkState>('/cards/links/auto', { enabled });
}

export async function setCardLink(cardId: string, linked: boolean) {
  return api.put<CardLinkState>(`/cards/links/${cardId}`, { linked });
}
```

- [ ] **Step 3: Checar tipos do frontend**

Run (a partir da raiz): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros em `api-client.ts` nem `cards.service.ts`.

- [ ] **Step 4 (opcional, se usar git): Commit**

```bash
git add src/services/api-client.ts src/services/cards.service.ts
git commit -m "feat(web): card-link service functions + api put"
```

---

### Task 7: Frontend — diálogo de gestão de cartões pessoais

**Files:**
- Create: `src/components/modals/LinkedCardsModal.tsx`

- [ ] **Step 1: Criar o componente do diálogo**

Crie `src/components/modals/LinkedCardsModal.tsx`:

```tsx
import { useState } from "react";
import { Link2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCardLinks, setAutoLinkDefault, setCardLink } from "@/services/cards.service";
import { toast } from "sonner";

export function LinkedCardsModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["card-links"],
    queryFn: () => getCardLinks().catch(() => null),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["card-links"] });
    queryClient.invalidateQueries({ queryKey: ["cards"] });
  };

  const autoMutation = useMutation({
    mutationFn: (enabled: boolean) => setAutoLinkDefault(enabled),
    onSuccess: (_res, enabled) => {
      toast.success(enabled ? "Todos os cartões pessoais vinculados!" : "Cartões pessoais desvinculados.");
      invalidate();
    },
    onError: () => toast.error("Erro ao atualizar vínculo."),
  });

  const cardMutation = useMutation({
    mutationFn: ({ cardId, linked }: { cardId: string; linked: boolean }) => setCardLink(cardId, linked),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao atualizar cartão."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" /> Cartões pessoais
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cartões pessoais neste workspace</DialogTitle>
          <DialogDescription>
            Vincule seus cartões pessoais para usá-los aqui. Os gastos contam no mesmo limite/fatura do cartão.
            Apenas você vê e usa estes cartões neste workspace.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={autoMutation.isPending}
                onClick={() => autoMutation.mutate(true)}
              >
                Definir cartões padrão (vincular todos)
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={autoMutation.isPending}
                onClick={() => autoMutation.mutate(false)}
              >
                Desvincular todos
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.autoLink
                ? "Auto-vínculo ativo: novos cartões pessoais entram automaticamente neste workspace."
                : "Auto-vínculo inativo: adicione cartões individualmente abaixo."}
            </p>

            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {data.cards.length > 0 ? data.cards.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.brand} •••• {c.last4}</p>
                  </div>
                  <Switch
                    checked={c.linked}
                    disabled={cardMutation.isPending}
                    onCheckedChange={(checked) => cardMutation.mutate({ cardId: c.id, linked: checked })}
                  />
                </div>
              )) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Você não tem cartões pessoais cadastrados.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Checar tipos**

Run (a partir da raiz): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros em `LinkedCardsModal.tsx`.

- [ ] **Step 3 (opcional, se usar git): Commit**

```bash
git add src/components/modals/LinkedCardsModal.tsx
git commit -m "feat(web): LinkedCardsModal to manage personal-card links"
```

---

### Task 8: Frontend — integrar na página de Contas & Cartões

**Files:**
- Modify: `src/routes/accounts.tsx`

- [ ] **Step 1: Importar o modal, o serviço de links e o ícone**

Em `src/routes/accounts.tsx`, adicione aos imports:

```ts
import { getCards, deleteCard, getCardLinks, setCardLink } from "@/services/cards.service";
import { LinkedCardsModal } from "@/components/modals/LinkedCardsModal";
```

(Substitua a linha de import existente de `cards.service` para incluir `getCardLinks` e `setCardLink`.)

- [ ] **Step 2: Buscar o estado de vínculo no componente**

Dentro de `AccountsPage`, após a query `cards`, adicione:

```ts
  const { data: linkState } = useQuery({
    queryKey: ["card-links"],
    queryFn: () => getCardLinks().catch(() => null),
  });
  const isWorkspaceContext = !!linkState && !linkState.isPersonalContext;
```

- [ ] **Step 3: Mostrar o botão de gestão no cabeçalho da seção de cartões**

Substitua o bloco:

```tsx
      {/* Cards */}
      <div className="mt-6">
        <CardTitle title="Cartões de crédito" />
      </div>
```

por:

```tsx
      {/* Cards */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <CardTitle title="Cartões de crédito" />
        {isWorkspaceContext && <LinkedCardsModal />}
      </div>
```

- [ ] **Step 4: Selo "Pessoal" e botão "Desvincular" nos cartões vinculados**

No `.map` dos cartões, dentro do cabeçalho colorido do cartão (bloco que mostra `cardType` e `c.brand`), adicione um selo quando `c.isLinkedPersonal`. Substitua o trecho:

```tsx
                    <span className="text-xs font-medium tracking-wider opacity-90">{c.brand || "Cartão"}</span>
```

por:

```tsx
                    <span className="text-xs font-medium tracking-wider opacity-90">{c.brand || "Cartão"}</span>
                    {c.isLinkedPersonal && (
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Pessoal
                      </span>
                    )}
```

Em seguida, troque o botão "Remover" para virar "Desvincular" quando for cartão pessoal vinculado. Substitua o `<Button ...>Remover</Button>` (o que chama `deleteCard`) por:

```tsx
                    {c.isLinkedPersonal ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Desvincular este cartão pessoal deste workspace? Os gastos já lançados continuam existindo.')) {
                            setCardLink(c.id, false).then(() => {
                              toast.success('Cartão desvinculado!');
                              queryClient.invalidateQueries({ queryKey: ['cards'] });
                              queryClient.invalidateQueries({ queryKey: ['card-links'] });
                            }).catch(() => toast.error('Erro ao desvincular.'));
                          }
                        }}
                        className="text-warning hover:text-warning"
                      >Desvincular</Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Deseja remover este cartão?')) {
                            deleteCard(c.id).then(() => {
                              toast.success('Cartão removido!');
                              queryClient.invalidateQueries({ queryKey: ['cards'] });
                            }).catch(() => toast.error('Erro ao remover.'));
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >Remover</Button>
                    )}
```

- [ ] **Step 5: Checar tipos e build**

Run (a partir da raiz): `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros em `accounts.tsx`.

- [ ] **Step 6: Verificação manual end-to-end**

Suba frontend (`npm run dev`) e backend. Logado:
1. Troque para um **workspace** (não pessoal) no seletor do topo.
2. Vá em "Contas & Cartões". O botão **"Cartões pessoais"** aparece ao lado do título "Cartões de crédito".
3. Abra o modal → clique **"Definir cartões padrão (vincular todos)"**. Os cartões pessoais aparecem na grade com selo **"Pessoal"**.
4. Crie uma transação (botão "Nova" no topo) com pagamento em cartão → o picker mostra os cartões pessoais vinculados. Lance um gasto.
5. O limite/uso do cartão reflete o gasto, tanto no workspace quanto ao voltar para o **Pessoal** (unificado).
6. No modal, desligue o `Switch` de um cartão (ou use "Desvincular" na grade) → ele some da grade e do picker.
7. Troque para o **Pessoal**: o botão "Cartões pessoais" **não** aparece.

- [ ] **Step 7 (opcional, se usar git): Commit**

```bash
git add src/routes/accounts.tsx
git commit -m "feat(web): manage and surface linked personal cards on Accounts page"
```

---

## Revisão final (cobertura do spec)

- ✅ Modelo de dados (2 tabelas) + regra do conjunto efetivo → Tasks 1, 2.
- ✅ Org pessoal por associação mais antiga → Task 2 (`getPersonalOrgId`), usado em Tasks 3 e 5.
- ✅ `findAll` expõe vinculados; uso/fatura unificados → Task 3.
- ✅ Endpoints `GET /cards/links`, `PUT /cards/links/auto`, `PUT /cards/links/:cardId` → Task 4.
- ✅ `resolvePayment` aceita cartão pessoal vinculado → Task 5.
- ✅ Botão "Definir cartões padrão" + auto-vínculo persistente + add/remove individual → Tasks 4, 7, 8.
- ✅ Selo "Pessoal", "Desvincular" (não apaga) → Task 8.
- ✅ Privacidade por usuário (todas as queries filtram por `userId`) → Tasks 3, 4, 5.
- ✅ Contexto pessoal esconde a UI (`isPersonalContext`) → Tasks 3, 4, 8.

## Fora de escopo (do spec)
- Direção Workspace → Pessoal.
- Visibilidade dos cartões vinculados para outros membros.
- Gestão de vínculo via Telegram (a agregação unificada já o beneficia).
