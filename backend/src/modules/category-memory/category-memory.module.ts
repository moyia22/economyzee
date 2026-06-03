import { Module } from '@nestjs/common';
import { CategoryMemoryService } from './category-memory.service';

// PrismaModule é @Global, então PrismaService está disponível sem import explícito.
@Module({
  providers: [CategoryMemoryService],
  exports: [CategoryMemoryService],
})
export class CategoryMemoryModule {}
