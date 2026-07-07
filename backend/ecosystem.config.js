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
    },
    max_memory_restart: '512M',
    merge_logs: true,
  }]
};