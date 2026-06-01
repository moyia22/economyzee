import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_WALLETS = [
  {
    name: 'Carteira',
    bank: 'Dinheiro Fisico',
    type: 'CHECKING',
    balance: 0,
    color: '#22c55e',
  },
  {
    name: 'Carteira Digital (PIX)',
    bank: 'PIX',
    type: 'CHECKING',
    balance: 0,
    color: '#0ea5e9',
  },
] as const;

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    await this.ensureDefaultWallets(orgId);
    return this.prisma.account.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.account.findUnique({ where: { id } });
  }

  create(orgId: string, data: {
    name: string;
    bank: string;
    type?: any;
    balance?: number;
    balanceInCents?: number;
    color?: string;
  }) {
    return this.prisma.account.create({
      data: {
        name: data.name,
        bank: data.bank,
        type: data.type || 'CHECKING',
        balance: this.resolveBalanceInCents(data),
        color: data.color,
        orgId,
      },
    });
  }

  async update(orgId: string, id: string, data: {
    name?: string;
    bank?: string;
    type?: any;
    balance?: number;
    balanceInCents?: number;
    color?: string;
  }) {
    await this.requireAccountInOrg(orgId, id);

    return this.prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.bank !== undefined ? { bank: data.bank } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.balance !== undefined || data.balanceInCents !== undefined
          ? { balance: this.resolveBalanceInCents(data) }
          : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
    });
  }

  async delete(orgId: string, id: string) {
    await this.requireAccountInOrg(orgId, id);
    return this.prisma.account.delete({ where: { id } });
  }

  private async requireAccountInOrg(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, orgId } });
    if (!account) {
      throw new NotFoundException('Conta nao encontrada.');
    }

    return account;
  }

  private async ensureDefaultWallets(orgId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { orgId },
      select: { name: true, bank: true },
    });
    const normalizedAccounts = accounts.map((account) => ({
      name: this.normalizeText(account.name),
      bank: this.normalizeText(account.bank),
    }));

    for (const wallet of DEFAULT_WALLETS) {
      const walletName = this.normalizeText(wallet.name);
      const walletBank = this.normalizeText(wallet.bank);
      const exists = normalizedAccounts.some((account) => {
        if (walletBank === 'pix') {
          return account.name === walletName || account.bank === 'pix';
        }

        return account.name === walletName;
      });

      if (!exists) {
        await this.prisma.account.create({
          data: {
            ...wallet,
            orgId,
          },
        });
        normalizedAccounts.push({ name: walletName, bank: walletBank });
      }
    }
  }

  private normalizeText(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private resolveBalanceInCents(data: { balance?: number; balanceInCents?: number }) {
    const rawValue = data.balanceInCents ?? data.balance ?? 0;
    const value = Number(rawValue);
    return Number.isFinite(value) ? Math.round(value) : 0;
  }
}
