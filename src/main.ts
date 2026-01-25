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

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS policy violation'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  const port = Number(process.env.PORT ?? 3000); 
  await app.listen(port, '0.0.0.0');
}
bootstrap();