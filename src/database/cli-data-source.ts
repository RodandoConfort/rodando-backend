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

const dataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,

  // ✅ Render external suele requerir SSL
  ...(env.DB_SSL ? { ssl: { rejectUnauthorized: false } } : {}),

  logging: env.DB_LOGGING,
  synchronize: false,

  // ✅ Tu proyecto: entidades están en src/** y en dist/**
  entities: [
    isProd
      ? join(__dirname, '..', '**', '*.entity.js')  // dist/**
      : join(__dirname, '..', '**', '*.entity.ts'), // src/**
  ],

  // ✅ Migraciones están en src/database/migrations
  migrations: [
    isProd
      ? join(__dirname, 'migrations', '*.js') // dist/database/migrations
      : join(__dirname, 'migrations', '*.ts'), // src/database/migrations
  ],

  migrationsTableName: 'migrations_history',
});

export default dataSource;