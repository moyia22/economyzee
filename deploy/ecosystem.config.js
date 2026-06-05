// ============================================================
// EconomyZee — PM2 Ecosystem Configuration
// Gerencia o backend NestJS em produção
// ============================================================

module.exports = {
  apps: [
    {
      name: 'economyzee-backend',
      script: 'dist/main.js',
      cwd: '/var/www/economyzee/backend',
      instances: 1,               // Use 'max' para cluster mode (multi-core)
      exec_mode: 'fork',          // Use 'cluster' se instances > 1
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        APP_PORT: 3333,
        TZ: 'America/Sao_Paulo',
      },
      // Logs
      error_file: '/var/log/economyzee/error.log',
      out_file: '/var/log/economyzee/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart strategy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
