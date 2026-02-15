import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import * as Joi from 'joi';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().uri().required(),
  DB_SSL: Joi.boolean().default(true),
  DB_LOGGING: Joi.boolean().default(false),
}).unknown(true);

const { value: env, error } = schema.validate(process.env);
if (error) throw new Error(`Config validation error: ${error.message}`);

const isProd = env.NODE_ENV === 'production';
const root = process.cwd();

const sslOptions = env.DB_SSL ? { rejectUnauthorized: false } : undefined;

const dataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,

  ...(sslOptions ? { ssl: sslOptions } : {}),
  extra: sslOptions ? { ssl: sslOptions } : undefined,

  logging: env.DB_LOGGING,
  synchronize: false,

  entities: [
    isProd
      ? join(root, 'dist', '**', '*.entity.js')
      : join(root, 'src', '**', '*.entity.ts'),
  ],
  migrations: [
    isProd
      ? join(root, 'dist', 'database', 'migrations', '*.js')
      : join(root, 'src', 'database', 'migrations', '*.ts'),
  ],

  migrationsTableName: 'migrations_history',
});

export default dataSource;