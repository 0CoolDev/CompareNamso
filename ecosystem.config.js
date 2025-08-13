module.exports = {
  apps: [{
    name: 'cardgenius',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '300M',
    error_file: '/opt/cardgenius/logs/error.log',
    out_file: '/opt/cardgenius/logs/output.log',
    time: true
  }]
};
