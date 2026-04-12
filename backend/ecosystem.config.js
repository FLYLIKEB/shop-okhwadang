module.exports = {
  apps: [{
    name: 'commerce',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/pm2/commerce-error.log',
    out_file: '/var/log/pm2/commerce-out.log',
    merge_logs: true,
  }]
};