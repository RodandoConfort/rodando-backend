import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { join } from 'path';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  private bool(key: string, fallback = false): boolean {
    const v = this.configService.get(key);

    if (v === undefined || v === null) return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;

    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      return ['true', '1', 'yes', 'y', 'on'].includes(s);
    }

    return fallback;
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProd = nodeEnv === 'production';

    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    // ✅ FIX: leer booleanos correctamente
    const runMigrations = this.bool('RUN_MIGRATIONS', false);
    const dbLogging = this.bool('DB_LOGGING', false);
    const sslEnabled = this.bool('DB_SSL', false);
    const dbSynchronize = !isProd && this.bool('DB_SYNCHRONIZE', false);

    const migrationsGlob = isProd
      ? join(__dirname, '..', 'migrations', '*.js')
      : join(__dirname, '..', 'migrations', '*.ts');

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


