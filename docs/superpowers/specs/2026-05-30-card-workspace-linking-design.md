# Vínculo de Cartões entre Pessoal e Workspace — Design

**Data:** 2026-05-30
**Status:** Aprovado para planejamento

## Problema

Hoje um cartão pertence a uma única organização (`Card.orgId`). O limite/uso/fatura é
calculado somando as transações daquele cartão. Quando o usuário está num workspace
compartilhado (casal/empresa), ele só vê e só pode lançar gastos nos cartões daquele
workspace — não consegue usar um cartão **pessoal** num gasto do workspace. E mesmo que
conseguisse, o gasto não contaria no mesmo limite/fatura do cartão pessoal: são mundos
separados.

O usuário quer **interligar** os cartões pessoais dentro de um workspace, de modo que o
gasto feito no workspace conte no **mesmo limite/fatura** do cartão pessoal, com:

- um botão "Definir cartões padrão" que vincula todos os cartões pessoais de uma vez;
- vínculo **persistente** (cartões pessoais criados no futuro entram automaticamente);
- adicionar e remover cartões individualmente.

## Decisões do usuário (brainstorming)

1. **Privacidade: máxima.** O cartão pessoal vinculado aparece e é utilizável **apenas
   pelo próprio usuário** dentro do workspace. Outros membros do workspace **não veem** o
   cartão nem seus dados. O vínculo é por usuário.
2. **Botão "Definir cartões padrão": persistente.** Liga um auto-vínculo que abrange
   todos os cartões pessoais atuais **e futuros** daquele usuário naquele workspace. O
   usuário ainda pode remover individualmente.
3. **Direção:** apenas Pessoal → Workspace (cartões pessoais expostos em workspaces).
   Não há o inverso.

## Abordagem escolhida (A): tabela de vínculo + flag de auto-vínculo

O `Card` permanece pertencendo ao org Pessoal (sem duplicação). As transações do workspace
apenas apontam para o mesmo `cardId` pessoal. Como a agregação de uso/fatura já soma por
`cardId` **sem filtrar org** (ver `cards.service.ts` `findAll`), o limite/uso/fatura sai
**unificado automaticamente**.

Abordagens descartadas:
- **B (espelhar/copiar o cartão no workspace):** duplica dados, exige sincronização de
  limite/nome/cor, agregação mais complexa, privacidade mais difícil.
- **C (cartão N:N com organizações):** migração enorme, mexe em tudo e quebra o requisito
  "privado por usuário" (o vínculo seria do workspace inteiro).

## Modelo de dados (Prisma)

Duas tabelas novas. `Card` fica intocado.

```prisma
// Vínculo individual de um cartão pessoal a um workspace, por usuário.
model CardWorkspaceLink {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  cardId    String   @map("card_id")
  orgId     String   @map("org_id")   // workspace onde o cartão pessoal é exposto
  linked    Boolean  @default(true)   // true = vínculo explícito · false = exclusão explícita (override do auto-link)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, cardId, orgId])
  @@index([userId, orgId])
  @@map("card_workspace_links")
}

// Preferência de auto-vínculo por (usuário, workspace).
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

Relações inversas a adicionar em `User`, `Card` e `Organization`
(`cardWorkspaceLinks`, `workspaceCardPreferences` conforme aplicável).

### Regra do "conjunto efetivo" (núcleo da feature)

Para um cartão pessoal `C`, usuário `U`, workspace `W`:

1. Se existe `CardWorkspaceLink(U, C, W)` → o vínculo efetivo é o valor de `linked` dela.
2. Senão → segue `WorkspaceCardPreference(U, W).autoLinkPersonalCards` (default `false`).

Cartões vinculados = cartões pessoais de `U` cujo vínculo efetivo é `true`.

Consequências:
- **Auto-vincular futuros "de graça":** um cartão pessoal novo não tem linha de vínculo →
  herda o flag → já aparece vinculado nos workspaces com auto-link ligado, sem nenhum
  código no momento da criação do cartão.
- **Remover individual com auto-link ligado:** cria/atualiza linha `linked = false`
  (override), e o cartão fica de fora mesmo com o flag ligado.
- **"Definir cartões padrão":** liga o flag e **apaga todas as linhas de override** daquele
  (usuário, workspace) → tudo (atual e futuro) passa a vinculado.

A função de resolução do conjunto efetivo deve ser uma **função pura testável**
(ex.: `resolveLinkedCardIds(personalCards, links, autoLink)`).

## Backend

Contexto da requisição = workspace ativo, via header `x-organization-id` → `req.user.orgId`.
O usuário acionante = `req.user.id`.

### Helper de org pessoal

`getPersonalOrgId(userId)`: o org da **associação (`OrganizationMember`) mais antiga** do
usuário (`createdAt asc`, o primeiro) — o org criado no signup (`createInitialWorkspace`).

> **Atenção:** NÃO usar `org.type === 'PERSONAL'` para isso. O endpoint
> `POST /organizations` (`createOrganization`) cria **qualquer** workspace novo também com
> `type: 'PERSONAL'`, então o `type` não distingue o org pessoal dos demais. A associação
> mais antiga é confiável: a do org pessoal é criada no signup; orgs criados depois ou
> aceitos por convite têm `OrganizationMember.createdAt` posterior.

### `cards.service` / `cards.controller`

- `findAll(orgId, userId)`:
  - Cartões do próprio `orgId` (como hoje).
  - Se `orgId` **não** é o Pessoal do usuário (é workspace): também resolve os cartões
    pessoais efetivamente vinculados a `(userId, orgId)` e os anexa, marcados com
    `isLinkedPersonal: true` (e `sourceOrgId`).
  - **Enriquecimento de uso/fatura não muda** — já agrega por `cardId` sem filtrar org →
    totais unificados.
  - O controller passa a injetar `req.user.id` além de `req.user.orgId`.
- Novos endpoints (todos guardados por `SupabaseAuthGuard`, operam sobre o workspace ativo
  e o `req.user.id`):
  - `GET /cards/links` → `{ isPersonalContext: boolean, autoLink: boolean, cards: [{ id, name, last4, brand, color, linked }] }`
    onde `linked` é o vínculo **efetivo** de cada cartão pessoal do usuário.
    `isPersonalContext` é `true` quando o org ativo É o pessoal (nesse caso `cards: []` e o
    frontend esconde a UI de vínculo).
  - `PUT /cards/links/auto` body `{ enabled: boolean }` → define
    `WorkspaceCardPreference.autoLinkPersonalCards`; ao chamar, **apaga as linhas de
    override** de `(userId, orgId)` (limpa o estado). `enabled:true` = "Definir cartões
    padrão"; `enabled:false` = "Desvincular todos".
  - `PUT /cards/links/:cardId` body `{ linked: boolean }` → upsert de
    `CardWorkspaceLink(userId, cardId, orgId)` com o `linked` informado (add/remove
    individual). Valida que `cardId` pertence ao org Pessoal do usuário.

### `transactions.service.resolvePayment`

Hoje: `prisma.card.findFirst({ where: { id: cardId, orgId } })` e rejeita se o cartão for
de outro org ("Cartão não encontrado neste workspace").

Mudança: aceitar o cartão se **qualquer** condição for verdadeira:
1. `card.orgId === orgId` (cartão do próprio workspace — como hoje); ou
2. o cartão pertence ao org Pessoal do usuário acionante **e** está efetivamente vinculado
   a `(userId, orgId)`.

Caso contrário, continua rejeitando. `resolvePayment` precisa do `userId` acionante
(disponível em `data.userId`/`req.user.id`; ajustar a assinatura se necessário).

`updateCardUsage(cardId)` permanece igual.

## Frontend

### `cards.service.ts`

`getCardLinks()`, `setAutoLinkDefault(enabled: boolean)`, `setCardLink(cardId, linked)`.

### `accounts.tsx`

A UI de vínculo só aparece quando o org ativo **não** é o pessoal. Para evitar depender do
`type` (não confiável, ver Backend), o frontend usa o flag `isPersonalContext` retornado
por `GET /cards/links`: se `true`, esconde toda a UI de vínculo.

- No cabeçalho da seção "Cartões de crédito": botão **"Definir cartões padrão"** e botão
  **"Cartões pessoais"** que abre um diálogo de gestão.
- Diálogo de gestão:
  - Master toggle "Vincular automaticamente todos os cartões pessoais (inclusive novos)" →
    `setAutoLinkDefault`.
  - Lista de todos os cartões pessoais, cada um com um `Switch` refletindo o vínculo
    efetivo → `setCardLink(cardId, linked)`.
- Na grade de cartões, os vinculados ganham selo **"Pessoal"**; o botão "Remover" deles
  vira **"Desvincular"** (chama `setCardLink(cardId, false)`, **não** apaga o cartão).
  Edição fica desabilitada (edita-se no Pessoal).
- Invalidar `["cards"]` e `["card-links"]` após cada mutação.

### `TransactionModal`

Sem mudanças. Já chama `getCards()`, que passa a incluir os cartões pessoais vinculados;
o picker de cartão os oferece automaticamente.

## Casos de borda (comportamento definido)

- **Contexto Pessoal:** nenhuma UI de vínculo (não se vincula cartão pessoal a ele mesmo).
- **Desvincular** cartão com gastos já lançados no workspace: **não apaga** as transações;
  elas continuam existindo no workspace e continuam somando no limite unificado (agregação
  por `cardId`). O cartão só some da lista/picker do workspace.
- **"Ver gastos"** de um cartão vinculado, dentro do workspace, mostra apenas os
  lançamentos **daquele workspace** (a query `getTransactions` é escopada por org), com uma
  nota explicativa; a barra de limite mostra o total **unificado**. Intencional.
- **Auto-link é por workspace:** o usuário pode ter auto-link ligado num workspace e
  desligado em outro (preferência por `(userId, orgId)`).
- **Excluir um cartão pessoal** vinculado: as linhas de `CardWorkspaceLink` somem por
  `onDelete: Cascade`. (Comportamento de exclusão de cartão em si fica como já é hoje.)
- **Telegram:** se beneficia da agregação unificada (gastos por `cardId`), mas não recebe
  UI de gestão de vínculo nesta entrega.

## Estratégia de testes

- **Unitário (prioritário):** a função pura de "conjunto efetivo"
  (`resolveLinkedCardIds`) — combinações de auto-link on/off com overrides `linked=true`/
  `linked=false`/ausente.
- **Backend:** `resolvePayment` aceita cartão vinculado e rejeita cartão de outro org não
  vinculado; endpoints `GET/PUT /cards/links*` (auto-link, override individual, limpeza de
  overrides ao alternar o flag).
- **Frontend (onde houver valor):** diálogo de gestão reflete o estado efetivo e dispara as
  mutações corretas; grade mostra selo "Pessoal" e "Desvincular".

## Fora de escopo

- Vínculo Workspace → Pessoal (direção inversa).
- Visibilidade de cartões vinculados para outros membros do workspace (privacidade máxima
  já decidida).
- Gestão de vínculo via Telegram.
