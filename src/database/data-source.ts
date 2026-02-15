import { DataSource } from 'typeorm';
import * as Joi from 'joi';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().uri().optional(),

  DB_HOST: Joi.when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DB_PASSWORD: Joi.when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DB_NAME: Joi.when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),

  DB_LOGGING: Joi.boolean().default(false),
  RUN_MIGRATIONS: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
}).unknown(true);

const { value: env, error } = schema.validate(process.env);
if (error) throw new Error(`Config validation error: ${error.message}`);

const isProd = env.NODE_ENV === 'production';
const root = process.cwd();

const sslOptions = env.DB_SSL ? { rejectUnauthorized: false } : undefined;

const dataSource = new DataSource({
  type: 'postgres',
  ...(env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      }),

  // ✅ Neon/cloud cuando DB_SSL=true
  ...(sslOptions ? { ssl: sslOptions } : {}),
  extra: sslOptions ? { ssl: sslOptions } : undefined, // ✅ pg a veces respeta más extra.ssl

  logging: env.DB_LOGGING,
  synchronize: false,

  // ✅ Rutas robustas (no dependen de __dirname)
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

  migrationsRun: env.RUN_MIGRATIONS,
  migrationsTableName: 'migrations_history',
});

export default dataSource;