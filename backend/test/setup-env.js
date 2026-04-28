const { generateKeyPairSync } = require('crypto');

process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
const testDbPort = process.env.TEST_DB_PORT || '3308';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  `mysql://root:__REDACTED_ROOT_PW__@127.0.0.1:${testDbPort}/commerce_test`;

if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
}

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PAYMENT_GATEWAY = 'mock';
process.env.STORAGE_PROVIDER = 'local';
process.env.THROTTLE_GLOBAL_LIMIT = '10000';
process.env.THROTTLE_AUTH_LIMIT = '10000';
process.env.THROTTLE_FORGOT_PASSWORD_LIMIT = '10000';
