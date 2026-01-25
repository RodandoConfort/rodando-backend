// src/database/database.module.ts
import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { DatabaseConfigService } from './database-config/database-config.service';
import { DatabaseInitService } from './database-init/database-init.service';

/**
 * Módulo global para inicializar y configurar la base de datos con TypeORM.
 */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const isProd = nodeEnv === 'production';

    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,

          // En Render no hay .env: usas env vars del dashboard.
          // Local: puedes usar .env.development / .env.production (NO commitearlos)
          ignoreEnvFile: isProd,
          envFilePath: !isProd ? [`.env.${nodeEnv}`, '.env'] : undefined,

          validationSchema: Joi.object({
            NODE_ENV: Joi.string()
              .valid('development', 'production', 'test')
              .default('development'),

            // APP_ENV: Joi.string()
            //   .valid('dev', 'staging', 'prod')
            //   .default('dev'),
            // MODE: Joi.string().valid('DEV', 'QA', 'PROD').default('DEV'),

            // opcionales útiles
            PORT: Joi.number().optional(),
            CORS_ORIGINS: Joi.string().allow('').optional(),

            // Soporta DATABASE_URL (Render) o variables separadas (local/docker)
            DATABASE_URL: Joi.string().uri().optional(),

            DB_HOST: Joi.when('DATABASE_URL', {
              is: Joi.exist(),
              then: Joi.optional(),
              otherwise: Joi.required(),
            }),
            DB_PORT: Joi.number().default(5432),
            DB_USER: Joi.when('DATABASE_URL', {
              is: Joi.exist(),
              then: Joi.optional(),
              otherwise: Joi.required(),
            }),
            DB_PASSWORD: Joi.when('DATABASE_URL', {
              is: Joi.exist(),
              then: Joi.optional(),
              otherwise: Joi.required(),
            }),
            DB_NAME: Joi.when('DATABASE_URL', {
              is: Joi.exist(),
              then: Joi.optional(),
              otherwise: Joi.required(),
            }),

            DB_DEFAULT: Joi.string().default('postgres'),

            DB_SYNCHRONIZE: Joi.boolean().default(false),
            DB_LOGGING: Joi.boolean().default(false),

            RUN_MIGRATIONS: Joi.boolean().default(false),
            DB_AUTO_CREATE: Joi.boolean().default(false),
            DB_SSL: Joi.boolean().default(false),
          }).unknown(true),
        }),

        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            return new DatabaseConfigService(
              configService,
            ).createTypeOrmOptions();
          },
        }),
      ],
      providers: [DatabaseConfigService, DatabaseInitService],
      exports: [TypeOrmModule],
    };
  }
}
