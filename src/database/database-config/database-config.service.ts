import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { join } from 'path';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProd = nodeEnv === 'production';

    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    const runMigrations =
      this.configService.get<string>('RUN_MIGRATIONS', 'false') === 'true';

    const dbLogging =
      this.configService.get<string>('DB_LOGGING', 'false') === 'true';

    const dbSynchronize =
      !isProd && this.configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true';

    const migrationsGlob = isProd
      ? join(__dirname, '..', 'migrations', '*.js')
      : join(__dirname, '..', 'migrations', '*.ts');

    const sslEnabled =
      this.configService.get<string>('DB_SSL', 'false') === 'true';

    const base: TypeOrmModuleOptions = {
      type: 'postgres',
      synchronize: dbSynchronize,
      logging: dbLogging,
      autoLoadEntities: true,
      migrationsRun: runMigrations,
      migrations: [migrationsGlob],
      migrationsTableName: 'migrations_history',
      ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
    };

    if (databaseUrl) {
      return { ...base, url: databaseUrl };
    }

    return {
      ...base,
      host: this.configService.get<string>('DB_HOST'),
      port: Number(this.configService.get<string>('DB_PORT', '5432')),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
    };
  }
}


