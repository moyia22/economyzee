import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CardsModule } from './modules/cards/cards.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BillsModule } from './modules/bills/bills.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AuditModule } from './modules/audit/audit.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AIModule } from './modules/ai/ai.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './modules/redis/redis.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { HealthModule } from './modules/health/health.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Event Emitter for SSE & internal events
    EventEmitterModule.forRoot(),

    // BullMQ / Redis
    // Suporta REDIS_URL (Railway/Upstash) com fallback para HOST/PORT (Docker local)
    BullModule.forRoot(
      process.env.REDIS_URL
        ? {
            redis: process.env.REDIS_URL as any,
          }
        : {
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
              password: process.env.REDIS_PASSWORD,
              username: process.env.REDIS_USERNAME,
            },
          },
    ),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CategoriesModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    BillsModule,
    BudgetsModule,
    AnalyticsModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    RemindersModule,
    AuditModule,
    TelegramModule,
    AIModule,
    QueuesModule,
    RedisModule,
    ReceiptsModule,
    HealthModule,
    RealtimeModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
