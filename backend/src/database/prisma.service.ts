import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('\n' + '='.repeat(50));
      console.error('❌ ERRO AO CONECTAR NO POSTGRESQL');
      console.error('PostgreSQL não encontrado em localhost:5432.');
      console.error('Dica: Verifique se o Docker está rodando e execute:');
      console.error('npm run docker:up');
      console.error('='.repeat(50) + '\n');
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
