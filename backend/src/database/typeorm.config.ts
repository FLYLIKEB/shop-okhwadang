import * as fs from 'fs';
import { DataSource } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';
const ssl = process.env.DB_SSL_ENABLED === 'true'
  ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH!) }
  : false;

export default new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL,
  charset: 'utf8mb4',
  synchronize: false,
  ssl,
  logging: isProd ? ['error', 'warn'] : false,
  migrations: isProd
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  entities: isProd
    ? ['dist/modules/**/*.entity.js']
    : ['src/modules/**/*.entity.ts'],
});
