module.exports = {
  apps: [{
    name: 'commerce',
    cwd: __dirname,
    script: './dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      ADMIN_LOG_PM2_APP_NAME: 'commerce',
      ADMIN_LOG_PM2_LOG_DIR: '/var/log/pm2',
      PM2_APP_NAME: 'commerce',
      PM2_LOG_DIR: '/var/log/pm2',
    },
    max_memory_restart: '512M',
    out_file: '/var/log/pm2/commerce-out.log',
    error_file: '/var/log/pm2/commerce-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
