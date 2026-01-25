import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientConfig } from 'pg';

@Injectable()
export class DatabaseInitService {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly configService: ConfigService) {}

  public async ensureDatabaseExists(): Promise<void> {
    const autoCreate =
      this.configService.get<string>('DB_AUTO_CREATE', 'false') === 'true';

    if (!autoCreate) return;

    const dbName = this.getTargetDbName();

    const clientConfig = this.getAdminClientConfig(); // conecta a postgres (o el default)
    const client = new Client(clientConfig);

    try {
      await client.connect();
      await client.query(`CREATE DATABASE "${dbName}"`);
      this.logger.log(`Database "${dbName}" created.`);
    } catch (error: unknown) {
      this.processError(error, dbName);
    } finally {
      await client.end();
    }
  }

  private getTargetDbName(): string {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (databaseUrl) {
      const u = new URL(databaseUrl);
      const name = u.pathname.replace('/', '');
      if (!name) throw new Error('DATABASE_URL missing db name in path');
      return name;
    }
    return this.getEnv('DB_NAME');
  }

  private getAdminClientConfig(): ClientConfig {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const sslEnabled =
      this.configService.get<string>('DB_SSL', 'false') === 'true';
    const defaultDb = this.configService.get<string>('DB_DEFAULT', 'postgres');

    if (databaseUrl) {
      const u = new URL(databaseUrl);
      // conectamos al db "postgres" para poder CREATE DATABASE
      u.pathname = `/${defaultDb}`;

      return {
        connectionString: u.toString(),
        ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    }

    return {
      host: this.getEnv('DB_HOST'),
      port: Number(this.getEnv('DB_PORT', '5432')),
      user: this.getEnv('DB_USER'),
      password: this.getEnv('DB_PASSWORD'),
      database: defaultDb,
      ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  private getEnv(key: string, fallback?: string): string {
    const value = this.configService.get<string>(key);
    if (value) return value;
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing environment variable: ${key}`);
  }

  private processError(error: unknown, dbName: string): void {
    if (this.isDatabaseExistsError(error)) {
      this.logger.log(`Database "${dbName}" already exists.`);
      return;
    }
    if (error instanceof Error) {
      this.logger.error(`Error creating database: ${error.message}`);
      throw error;
    }
    this.logger.error('Unknown error while creating database.');
    throw new Error('Unknown error while creating database.');
  }

  private isDatabaseExistsError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === '42P04'
    );
  }
}
