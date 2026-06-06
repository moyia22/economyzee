import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_CATEGORIES } from '../../common/default-categories';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async requireCategoryInOrg(id: string, orgId: string) {
    const category = await this.prisma.category.findFirst({ where: { id, orgId } });
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada.');
    }
    return category;
  }

  async findAll(orgId: string) {
    const categories = await this.prisma.category.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
    if (categories.length > 0) return categories;
    await this.restoreDefaults(orgId);
    return this.prisma.category.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
  }

  create(orgId: string, data: { name: string; icon?: string; color?: string }) {
    return this.prisma.category.create({ data: { ...data, orgId } });
  }

  async restoreDefaults(orgId: string) {
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, orgId })),
      skipDuplicates: true,
    });
    return this.prisma.category.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
  }

  async update(id: string, orgId: string, data: { name?: string; icon?: string; color?: string; active?: boolean }) {
    await this.requireCategoryInOrg(id, orgId);
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string, orgId: string) {
    await this.requireCategoryInOrg(id, orgId);
    return this.prisma.category.delete({ where: { id } });
  }
}
