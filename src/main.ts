import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerService } from './docs/swagger/swagger.service';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { GlobalExceptionFilter } from './common/utils/postgres-exception.filter';
import { SocketIoAdapter } from './realtime/adapters/socket-io.adapter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', 1); // ✅ Render/proxy

  const corsEnv = config.get<string>('CORS_ORIGINS') || 'http://localhost:8100';
  const allowedOrigins = corsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // ✅ Set para lookup O(1)
  const allowSet = new Set(allowedOrigins);

  // ✅ Detectar entorno (ajusta si usas otra env)
  const nodeEnv =
    config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  // ✅ Patrones SOLO en DEV para no estar cambiando IPs (live reload)
  const devOriginPatterns: RegExp[] = [
    /^capacitor:\/\/localhost$/i,
    /^ionic:\/\/localhost$/i,

    // localhost con/sin puerto
    /^http:\/\/localhost(?::\d+)?$/i,

    // Android emulator host loopback
    /^http:\/\/10\.0\.2\.2(?::\d+)?$/i,

    // LAN típicas (ajusta a tus rangos reales)
    /^http:\/\/192\.168\.227\.\d{1,3}(?::\d+)?$/i,
    /^http:\/\/192\.168\.155\.\d{1,3}(?::\d+)?$/i,

    // por si tu red cae en 10.x.x.x
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,

    // CUALQUIER IP PRIVADA (192.168.x.x, 10.x.x.x, 172.16.x.x, etc.)
    // Esta regex captura el formato estándar de IP con puerto opcional
    /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  ];

  const isOriginAllowed = (origin: string): boolean => {
    if (allowSet.has(origin)) return true;
    if (!isProd && devOriginPatterns.some((r) => r.test(origin))) return true;
    return false;
  };

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // ✅ Swagger controlado por env
  if (config.get<string>('SWAGGER_ENABLED') === 'true') {
    const swagger = app.get(SwaggerService);
    swagger.setup(app);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ✅ CORS robusto para live reload + IPs variables
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin)) return callback(null, true);

      return callback(new Error(`CORS policy violation: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
