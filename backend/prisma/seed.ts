import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function daysAgo(n: number, h = 12) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, (n * 7) % 60, 0, 0); return d;
}
function cents(v: number) { return Math.round(v * 100); }

async function main() {
  console.log('🌱 Seeding EconomyZee database...');

  // Clean
  await prisma.auditLog.deleteMany();
  await prisma.aIProcessingLog.deleteMany();
  await prisma.telegramEvent.deleteMany();
  await prisma.smartAlert.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.card.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.organizationMember.deleteMany();

  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const hash = await bcrypt.hash('economyzee123', 10);
  const lara = await prisma.user.create({ 
    data: { 
      id: 'u-lara', 
      email: 'lara@economyzee.app', 
      name: 'Lara Mendes', 
      passwordHash: hash, 
      phone: '+5511999990000',
      telegramUserId: '8632294329',
      telegramChatId: '8632294329',
      telegramFirstName: 'Lara',
      telegramUsername: 'larasantos',
      telegramLinkedAt: new Date(),
    } 
  });
  const leo = await prisma.user.create({ data: { id: 'u-leo', email: 'leo@economyzee.app', name: 'Léo Cardoso', passwordHash: hash } });
  const ana = await prisma.user.create({ data: { id: 'u-ana', email: 'ana@economyzee.app', name: 'Ana Souza', passwordHash: hash } });

  // Organization
  const org = await prisma.organization.create({ data: { id: 'org-1', name: 'Casal • Lara & Léo', type: 'COUPLE', initials: 'CL' } });

  await prisma.organization.update({ where: { id: org.id }, data: { createdById: lara.id } });

  // Members
  const mLara = await prisma.organizationMember.create({ data: { id: 'm-lara', userId: lara.id, orgId: org.id, role: 'OWNER', avatarColor: '#22c55e' } });
  const mLeo = await prisma.organizationMember.create({ data: { id: 'm-leo', userId: leo.id, orgId: org.id, role: 'MEMBER', avatarColor: '#3b82f6' } });
  const mAna = await prisma.organizationMember.create({ data: { id: 'm-ana', userId: ana.id, orgId: org.id, role: 'MEMBER', avatarColor: '#f59e0b' } });


  // Categories
  const catData = [
    { id: 'c-food', name: 'Alimentação', icon: 'UtensilsCrossed', color: 'var(--chart-1)' },
    { id: 'c-transport', name: 'Transporte', icon: 'Car', color: 'var(--chart-2)' },
    { id: 'c-housing', name: 'Moradia', icon: 'Home', color: 'var(--chart-3)' },
    { id: 'c-leisure', name: 'Lazer', icon: 'Music', color: 'var(--chart-4)' },
    { id: 'c-health', name: 'Saúde', icon: 'HeartPulse', color: 'var(--chart-5)' },
    { id: 'c-personal', name: 'Cuidados pessoais', icon: 'Scissors', color: 'var(--chart-4)' },
    { id: 'c-shopping', name: 'Compras', icon: 'ShoppingBag', color: 'var(--chart-2)' },
    { id: 'c-subs', name: 'Assinaturas', icon: 'Repeat', color: 'var(--chart-4)' },
    { id: 'c-edu', name: 'Educação', icon: 'GraduationCap', color: 'var(--chart-3)' },
    { id: 'c-salary', name: 'Salário', icon: 'Wallet', color: 'var(--chart-1)' },
    { id: 'c-freelance', name: 'Freelance', icon: 'Briefcase', color: 'var(--chart-1)' },
    { id: 'c-invest', name: 'Investimentos', icon: 'TrendingUp', color: 'var(--chart-2)' },
    { id: 'c-misc', name: 'Outros', icon: 'Sparkles', color: 'var(--chart-5)' },
  ];
  for (const c of catData) { await prisma.category.create({ data: { ...c, orgId: org.id } }); }

  // Accounts
  const accData = [
    { id: 'a-nu', name: 'Conta Principal', bank: 'Nubank', type: 'CHECKING' as const, balance: 0, color: '#820AD1' },
    { id: 'a-itau', name: 'Itaú Corrente', bank: 'Itaú', type: 'CHECKING' as const, balance: 0, color: '#EC7000' },
    { id: 'a-pou', name: 'Poupança', bank: 'Caixa', type: 'SAVINGS' as const, balance: 0, color: '#0070AF' },
    { id: 'a-xp', name: 'XP Investimentos', bank: 'XP', type: 'INVESTMENT' as const, balance: 0, color: '#FFCB05' },
  ];
  for (const a of accData) { await prisma.account.create({ data: { ...a, orgId: org.id } }); }

  // Cards
  await prisma.card.create({ data: { id: 'card-nu', name: 'Nubank Ultravioleta', brand: 'MASTERCARD', last4: '4421', limitInCents: cents(12000), usedInCents: 0, invoiceDue: addDays(new Date(), 9), invoiceInCents: 0, color: 'linear-gradient(135deg, #2a2a2a, #111)', orgId: org.id } });
  await prisma.card.create({ data: { id: 'card-itau', name: 'Itaú Personnalité', brand: 'VISA', last4: '8810', limitInCents: cents(18000), usedInCents: 0, invoiceDue: addDays(new Date(), 16), invoiceInCents: 0, color: 'linear-gradient(135deg, #EC7000, #7a3a00)', orgId: org.id } });

  // 🚫 Dados fake (transações, bills, alerts) foram removidos para garantir um ambiente de produção limpo.

  console.log('✅ Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
