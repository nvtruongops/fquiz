const path = require('path')
const fs = require('fs')

// Attempt to load .env.production if it exists
const envFile = path.resolve(__dirname, '.env.production')
let prodEnv = {}

if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      prodEnv[key] = val
    }
  })
}

module.exports = {
  apps: [
    {
      name: 'fquiz-web',
      cwd: './apps/web',
      script: '../../node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
        ...prodEnv,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
        ...prodEnv,
      },
    },
    {
      name: 'fquiz-admin',
      cwd: './apps/admin',
      script: '../../node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '750M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
        ...prodEnv,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
        ...prodEnv,
      },
    },
    {
      name: 'fquiz-quiz-stats-worker',
      cwd: './apps/web',
      script: '../../node_modules/tsx/dist/cli.mjs',
      args: '--tsconfig tsconfig.json scripts/quiz-stats-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      kill_timeout: 10000,
      exp_backoff_restart_delay: 1000,
      env: {
        ...prodEnv,
        NODE_ENV: 'production',
        MONGODB_MAX_POOL_SIZE: 2,
        MONGODB_WAIT_QUEUE_TIMEOUT_MS: 2000,
      },
      env_production: {
        ...prodEnv,
        NODE_ENV: 'production',
        MONGODB_MAX_POOL_SIZE: 2,
        MONGODB_WAIT_QUEUE_TIMEOUT_MS: 2000,
      },
    },
  ],
}
