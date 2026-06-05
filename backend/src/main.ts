import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cluster from 'cluster';
import * as os from 'os';
import { AppModule } from './app.module';

// ── Allowed origins (frontend URLs) ────────────────────────────────
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:5050',
  'https://economyzee.com',
  'https://www.economyzee.com',
  'https://economyzee-smart-finance-hub-main.vercel.app',
];

// Regex pra liberar previews da Vercel (qualquer deploy preview)
const VERCEL_PREVIEW_REGEX = /^https:\/\/economyzee-smart-finance-hub-main-[a-z0-9-]+\.vercel\.app$/;

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-organization-id',
];

function parseOriginList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function getAllowedOrigins(config: ConfigService): string[] {
  const configuredOrigins = [
    ...parseOriginList(config.get<string>('FRONTEND_ORIGINS')),
    ...parseOriginList(config.get<string>('FRONTEND_URL')),
  ];

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]));
}

async function bootstrap() {
  console.log('=== BACKEND STARTING ===');
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const config = app.get(ConfigService);
  // Railway/Heroku/etc injetam PORT automaticamente. APP_PORT é fallback do dev local.
  const port = parseInt(process.env.PORT || '', 10) || config.get<number>('APP_PORT', 3000);
  const allowedOrigins = getAllowedOrigins(config);

  // ── 1. Enable CORS with dynamic whitelist ──────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, server-to-server)
      if (!origin) {
        logger.log('[CORS] allowed request without origin');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || VERCEL_PREVIEW_REGEX.test(origin)) {
        logger.log(`[CORS] allowed origin: ${origin}`);
        return callback(null, true);
      }

      logger.warn(`[CORS] blocked origin: ${origin}`);
      return callback(new Error('Blocked by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use((req, _res, next) => {
    logger.log(
      `[HTTP] ${req.method} ${req.originalUrl} | origin=${req.headers.origin || 'none'}`,
    );
    next();
  });

  // ── 2. Helmet (AFTER CORS so it cannot strip CORS headers) ─────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── 4. Global validation ───────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EconomyZee API')
    .setDescription('Backend API for the EconomyZee smart finance hub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(
    `🚀 EconomyZee API running on http://localhost:${port} [Worker ${process.pid}]`,
  );
  logger.log(`✅ CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

function startCluster() {
  const numCPUs = os.cpus().length;
  const logger = new Logger('Cluster');

  if ((cluster as any).isMaster) {
    logger.log(`Master process ${process.pid} is running`);
    logger.log(`Spawning ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
      (cluster as any).fork();
    }

    (cluster as any).on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died. Spawning a new one...`);
      (cluster as any).fork();
    });
  } else {
    bootstrap();
  }
}

const configService = new ConfigService();
const turboEnabled =
  configService.get<string>('ECONOMYZEE_TURBO_MODE') === 'true';

if (turboEnabled) {
  startCluster();
} else {
  bootstrap();
}
