module.exports = {
  apps: [{
    name: 'commerce',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      STORAGE_PROVIDER: 's3',
      AWS_REGION: 'ap-northeast-2',
      AWS_S3_BUCKET_NAME: 'okhwadang-assets',
      AWS_CDN_URL: 'https://dt24i8idwxww1.cloudfront.net',
      JWT_PRIVATE_KEY_FILE: '/app/shop-okhwadang/shop-okhwadang/backend/keys/jwt-private.pem',
    },
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};