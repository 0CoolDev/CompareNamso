module.exports = {
  apps: [{
    name: 'cardgenius',
    script: './dist/index.js',
    cwd: '/opt/cardgenius',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://cardgenius:cardgenius123@localhost:5432/cardgenius',
      SESSION_SECRET: process.env.SESSION_SECRET
    },
    error_file: '/home/nulladmin/.pm2/logs/cardgenius-error.log',
    out_file: '/home/nulladmin/.pm2/logs/cardgenius-out.log',
    merge_logs: true,
    time: true,
    kill_timeout: 5000,
    listen_timeout: 5000,
    shutdown_with_message: true
  }]
};
