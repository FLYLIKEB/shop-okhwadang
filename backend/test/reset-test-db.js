const mysql = require('mysql2/promise');

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');

  if (!database) {
    throw new Error('TEST_DATABASE_URL must include a database name');
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

async function main() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL is required');
  }

  const config = parseDatabaseUrl(url);
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  await connection.query(`DROP DATABASE IF EXISTS \`${config.database}\``);
  await connection.query(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
