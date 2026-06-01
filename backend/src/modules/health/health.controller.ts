import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check application health status' })
  async check() {
    let databaseStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      databaseStatus = 'disconnected';
    }

    const redisConnected = await this.redis.isConnected();
    const redisStatus = redisConnected ? 'connected' : 'unavailable';

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'error',
      database: databaseStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
