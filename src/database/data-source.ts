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
  ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
  logging: env.DB_LOGGING,
  synchronize: false,

  entities: [
    isProd
      ? join(__dirname, '**', '*.entity.js')
      : join(__dirname, 'src', '**', '*.entity.ts'),
  ],
  migrations: [
    isProd
      ? join(__dirname, 'database', 'migrations', '*.js')
      : join(__dirname, 'src', 'database', 'migrations', '*.ts'),
  ],
  migrationsRun: env.RUN_MIGRATIONS,
  migrationsTableName: 'migrations_history',
});

export default dataSource;