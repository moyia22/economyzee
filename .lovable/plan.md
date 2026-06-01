# EconomyZee — Premium Financial Dashboard

A complete dark-mode fintech dashboard inspired by Stripe, Linear and Mercury. All screens fully built with realistic mocked data, ready to plug into the NestJS + PostgreSQL + Gemini + Telegram backend later.

## Visual Direction

- **Theme**: Fintech Dark Premium — deep near-black background, elevated dark-gray cards, soft borders
- **Accent**: Fintech green `#22c55e` for positive values, balances, CTAs; red for expenses; amber for alerts
- **Typography**: Inter, strong hierarchy, generous whitespace (16/24px rhythm)
- **Feel**: Calm, confident, data-dense but readable; subtle hovers, smooth transitions, no flashy gradients

## Global Layout

- **Collapsible sidebar** (icon-only when collapsed) with sections: Overview, Transactions, Analytics, Accounts & Cards, Bills, Budgets, Shared, Reports, Settings
- **Topbar**: global search (⌘K style), workspace switcher (Personal / Couple / Business), notifications bell with badge, user avatar menu
- **Main**: 12-column responsive grid, consistent card system
- Mobile-friendly (sidebar becomes drawer)

## Screens

### 1. Dashboard (Home)
KPI cards (Total Balance, Income, Expenses, Projected Balance with trend deltas), financial evolution area chart, category donut, latest transactions list, upcoming bills, smart alerts panel ("You spent 42% more on dining this month"), live Telegram activity feed ("You added R$ 50 via Telegram • 2 min ago").

### 2. Transactions
Full table with date / description / category / account / member / amount / origin badge (Telegram / Manual / Import). Filters (date range, category, account, member, type), search, inline edit drawer, bulk actions, pagination.

### 3. Analytics
Spending by category (bar), monthly trend line, month-over-month comparison, top 5 categories, top 10 expenses, cashflow waterfall.

### 4. Accounts & Cards
Bank accounts list with balances, credit cards as visual card components showing limit usage progress, current invoice, installment breakdown.

### 5. Bills (Payable / Receivable)
List view + monthly calendar view, status pills (Paid / Pending / Overdue), quick mark-as-paid action.

### 6. Budgets
Per-category limits with progress bars, color-coded thresholds (green / amber / red), overspend alerts, monthly reset indicator.

### 7. Shared Workspace
Member list with avatars and roles (Admin / Member / Viewer), per-member spending breakdown, invite member CTA.

### 8. Reports
Pre-built report cards (Monthly Summary, Tax Year, Category Deep-dive), preview area, export buttons (PDF / CSV — visual only).

### 9. Settings
Tabs: Profile, Categories (CRUD UI), Accounts, Notifications, Telegram Integration (shows connected bot status, connect-bot flow with QR/deep-link visual, recent bot messages).

## Telegram Integration (Visual Layer)

- "Telegram" badge with paper-plane icon on every transaction sourced from the bot
- Live activity feed widget on Dashboard
- Settings → Telegram page showing connection status, sample commands, last sync timestamp
- Subtle "synced" pulse animation on new entries

## Component System

Reusable: `KpiCard`, `ChartCard`, `TransactionRow`, `OriginBadge`, `StatusPill`, `ProgressBar`, `MemberAvatar`, `WorkspaceSwitcher`, `SmartAlert`, `EmptyState`, `ErrorState`, `SkeletonCard`. Built on existing shadcn/ui primitives.

## States (every screen)

- **Loading**: realistic skeleton screens matching final layout
- **Empty**: friendly illustration + copy + CTA referencing Telegram ("Send your first expense to @EconomyZeeBot")
- **Error**: clear message, "Try again" + "Go back" buttons, professional styling

## Mocked Data

Realistic seed data in `src/lib/mock-data.ts`: ~80 transactions across 3 months, 4 accounts, 2 cards, 12 categories, 3 members, 6 budgets, 8 upcoming bills, alerts, Telegram feed. Numbers internally consistent so charts and KPIs reconcile.

## Technical Notes

- TanStack Start file-based routes: `index.tsx`, `transactions.tsx`, `analytics.tsx`, `accounts.tsx`, `bills.tsx`, `budgets.tsx`, `shared.tsx`, `reports.tsx`, `settings.tsx` (+ shared `_app.tsx` layout pattern via root with sidebar/topbar shell)
- Charts via `recharts` (already in shadcn chart component)
- Theme tokens added to `src/styles.css` (dark fintech palette as default, Inter font import)
- Each route has `head()` metadata, `errorComponent`, `notFoundComponent`
- All data served from typed mock modules with the same shape a future API would return — easy swap to real fetch/server functions later

## Out of Scope (this iteration)

- Real auth, real Telegram bot, real Gemini calls, real DB — all wired as next step after visual approval
- PDF/CSV export actually generating files (buttons present, no-op)
