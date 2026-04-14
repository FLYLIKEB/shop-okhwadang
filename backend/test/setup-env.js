process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mysql://root:__REDACTED_ROOT_PW__@127.0.0.1:3307/commerce_test';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PAYMENT_GATEWAY = 'mock';
process.env.STORAGE_PROVIDER = 'local';
