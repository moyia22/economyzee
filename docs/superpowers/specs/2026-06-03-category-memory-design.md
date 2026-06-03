# Memória de Categorização por Usuário — Design

**Data:** 2026-06-03
**Status:** Aprovado para implementação

## Problema

Quando o usuário envia um lançamento com um termo desconhecido (ex.: `"gasto de 110 com o claude"`), o parser não encontra palavra-chave em [`category-rules.ts`](../../../backend/src/modules/financial-parser/category-rules.ts), cai para `Outros` e a IA chuta uma categoria errada (no caso do print, `Moradia`). O usuário corrige manualmente para `Assinaturas` via botão **Mudar Categoria**, mas a correção **não é persistida** — então o próximo `"claude"` erra de novo.

## Objetivo

O sistema deve **aprender** a correção de categoria do usuário e, no próximo lançamento que contenha o mesmo termo, **aplicar a categoria aprendida automaticamente** (ir direto, sem depender de chute da IA).

## Decisões de produto (confirmadas com o usuário)

| Decisão | Escolha |
|---|---|
| Escopo | **Por usuário**, válido em todos os workspaces |
| Gatilho de aprendizado | **Sempre que o usuário corrigir** a categoria |
| Chave a memorizar | **Token limpo** da descrição (ex.: `"claude"`) |
| Frase com múltiplos termos | Aprende **apenas um token principal** (o mais significativo) |
| Precedência | **Memória do usuário > regras fixas > chute da IA** (a correção manual sempre vence) |

## Abordagem escolhida

Tabela de "memória de categoria" por usuário + consulta determinística no fluxo do bot do Telegram. Sem custo de IA, rápida e transparente. (Alternativas descartadas: injetar exemplos no prompt da IA — probabilístico e custoso; mutar `CATEGORY_RULES` em runtime — seria global, não por usuário.)

## Arquitetura

### 1. Modelo de dados — `UserCategoryMemory` (Prisma)

```prisma
model UserCategoryMemory {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String                          // normalizado, ex.: "claude"
  category  String                          // ex.: "Assinaturas"
  hitCount  Int      @default(0) @map("hit_count")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token])
  @@index([userId])
  @@map("user_category_memory")
}
```

Adicionar `userCategoryMemories UserCategoryMemory[]` na relação do model `User`.

### 2. Extração do token — util novo

Função pura `extractMemoryToken(rawText: string): string | null` (arquivo novo em `financial-parser/`, ex.: `category-memory.util.ts`), reaproveitando a lógica de limpeza de `enhanceDescription`:

1. Normaliza: minúsculas, remove acentos (`NFD`), colapsa espaços.
2. Remove valores/números, verbos (`gastei|paguei|comprei|gasto|gastar|paguei`), conectores/stopwords (`de|com|no|na|o|a|um|uma|pra|para|em|reais|conto`) e palavras de pagamento (`pix|dinheiro|cartao|credito|debito`).
3. Seleciona **um** token principal: o termo significativo restante mais longo (desempate: o último na frase).
4. Validação: token final precisa ter **≥ 3 caracteres**. Se vazio/curto → retorna `null` (não aprende, não aplica).

`extractMemoryToken("gasto de 110 com o claude")` → `"claude"`.

### 3. Serviço — `CategoryMemoryService` (módulo novo)

Módulo `category-memory/` com `CategoryMemoryService` (injeta Prisma). Métodos:

- **`applyTo(userId: string, draft): Promise<boolean>`** — leitura.
  Extrai o token do `draft.rawText`; busca `(userId, token)`. Se achar e a categoria diferir da atual, sobrescreve `draft.category` com a aprendida e incrementa `hitCount`. Retorna `true` se aplicou. Tudo em try/catch — nunca lança.

- **`learn(userId: string, rawText: string, category: string): Promise<void>`** — escrita.
  Extrai o token; se token válido e categoria não-genérica (≠ `Outros`/vazio), faz `upsert` de `(userId, token)` → `category` (no insert `hitCount = 1`). Re-correção sobrescreve. try/catch — nunca lança.

### 4. Pontos de integração no [`telegram.service.ts`](../../../backend/src/modules/telegram/telegram.service.ts)

**Aplicação (leitura) — chokepoint único:** chamar `categoryMemory.applyTo(draft.userId, draft)` em `handleParseResult`, antes de montar a tela de confirmação, **somente para transações novas** (não em fluxos de correção já em andamento). Como a memória vence regras e IA, aplica-se após o parser produzir a categoria.

**Captura (escrita):**
- Ao criar o draft de uma nova transação, gravar `draft.originalCategory = draft.category` (campo novo no `TransactionDraft` em [`redis.service.ts`](../../../backend/src/modules/redis/redis.service.ts)).
- Os dois pontos de correção já existentes apenas alteram `draft.category` como hoje: botão **Mudar Categoria** ([~L621](../../../backend/src/modules/telegram/telegram.service.ts#L621)) e `handleDraftCorrection` ([~L929](../../../backend/src/modules/telegram/telegram.service.ts#L929)).
- A gravação acontece **em `saveTransaction`** (ao confirmar): se `draft.category !== draft.originalCategory`, chama `categoryMemory.learn(draft.userId, draft.rawText, draft.category)`. Correções descartadas (sem confirmação) não poluem a memória.

> Nota: o `rawText` recebe sufixos de correção (`appendCorrectionToRawText`). A extração do token deve usar a **descrição original**/primeira linha do `rawText` (antes de `\nCorrecao:`), para memorizar `"claude"` e não o texto da correção (`"Assinaturas"`).

### 5. Erros e bordas

- Token vazio/curto → não grava nem aplica.
- Categoria genérica (`Outros`) → não grava.
- Toda a memória é best-effort: qualquer falha é logada e **nunca** interrompe o lançamento.
- Upsert garante idempotência; re-correção do mesmo token atualiza a categoria e o `updatedAt`.

## Testes

- **Unitários `extractMemoryToken`**: `"gasto de 110 com o claude"` → `"claude"`; frases multi-termo retornam um token; entradas curtas/vazias → `null`.
- **`CategoryMemoryService`** (Prisma mockado):
  - `learn` faz upsert correto e ignora `Outros`/token inválido.
  - `applyTo` sobrescreve a categoria quando há memória e incrementa `hitCount`; não altera quando não há.
  - Cenário do print ponta-a-ponta (nível serviço): após `learn(user, "gasto 110 com o claude", "Assinaturas")`, um novo draft com `"gasto de 40 com o claude"` recebe `category = "Assinaturas"` via `applyTo`.

## Fora de escopo (YAGNI)

- UI/web para gerenciar a memória aprendida.
- Memória por workspace ou override por workspace.
- Aprender múltiplos tokens por frase.
- Aplicar a memória fora do canal Telegram (web app).
