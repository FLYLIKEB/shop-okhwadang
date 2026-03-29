import { DataSource } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL,
  charset: 'utf8mb4',
  synchronize: false,
  migrations: isProd
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  entities: isProd
    ? ['dist/modules/**/*.entity.js']
    : ['src/modules/**/*.entity.ts'],
});
