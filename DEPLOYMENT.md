# CardGenius Zero-Downtime Deployment

## Overview
This document describes the zero-downtime deployment setup for CardGenius application.

## Scripts Created

### 1. `update-cardgenius.sh`
Main deployment script that performs zero-downtime updates with automatic rollback on failure.

**Features:**
- Git pull with commit tracking
- Safe dependency installation
- Build process with error handling
- Database migrations (Drizzle)
- PM2 zero-downtime reload
- Automatic rollback on failure
- Health check verification

**Usage:**
```bash
# Manual update
ssh -p 9922 nulladmin@95.217.132.221
cd /opt/cardgenius
./update-cardgenius.sh

# Or run directly via SSH
ssh -p 9922 nulladmin@95.217.132.221 "/opt/cardgenius/update-cardgenius.sh"
```

### 2. `rollback-cardgenius.sh`
Emergency rollback script for reverting to previous versions.

**Usage:**
```bash
# Rollback to previous commit
./rollback-cardgenius.sh

# Rollback to specific commit
./rollback-cardgenius.sh <commit-hash>
```

### 3. `monitor-cardgenius.sh`
Health monitoring script with auto-restart capabilities.

**Features:**
- PM2 process monitoring
- Health endpoint checking
- Memory usage monitoring
- Automatic restart on failure
- Optional Slack notifications

### 4. GitHub Actions Workflow
Located in `.github/workflows/deploy.yml`

**Setup Required:**
1. Add SSH private key to GitHub secrets as `SSH_PRIVATE_KEY`
2. Workflow triggers on push to main/master branch
3. Can also be triggered manually

## Automation Options

### Option 1: GitHub Actions (Recommended)
Already configured in `.github/workflows/deploy.yml`

**Setup:**
```bash
# In your GitHub repository settings:
# 1. Go to Settings > Secrets > Actions
# 2. Add new secret: SSH_PRIVATE_KEY
# 3. Paste your private SSH key content
```

### Option 2: Git Hooks
Use the provided `post-receive-hook.sh` on your Git server.

**Setup on Git server:**
```bash
# In your bare repository
cp post-receive-hook.sh hooks/post-receive
chmod +x hooks/post-receive
```

### Option 3: Cron Job for Monitoring
Add monitoring to crontab:

```bash
# Edit crontab
crontab -e

# Add monitoring every 5 minutes
*/5 * * * * /opt/cardgenius/monitor-cardgenius.sh >> /var/log/cardgenius-monitor.log 2>&1
```

### Option 4: Webhook-based Deployment
You can set up a webhook endpoint in your application:

```javascript
// Example webhook endpoint (add to your Express app)
app.post('/webhook/deploy', (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret === process.env.WEBHOOK_SECRET) {
    exec('/opt/cardgenius/update-cardgenius.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('Deployment failed:', error);
        res.status(500).json({ error: 'Deployment failed' });
      } else {
        console.log('Deployment successful:', stdout);
        res.json({ message: 'Deployment successful' });
      }
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

## Best Practices

1. **Always test in staging first** before deploying to production
2. **Monitor logs** after deployment: `pm2 logs cardgenius`
3. **Keep backups** of your database before migrations
4. **Use health checks** to verify successful deployments
5. **Document rollback procedures** for your team

## Troubleshooting

### Application won't start after update
```bash
# Check PM2 logs
pm2 logs cardgenius --lines 100

# Check error logs
pm2 show cardgenius

# Manual restart
pm2 restart cardgenius
```

### Database migration failed
```bash
# Check migration status
npx drizzle-kit studio

# Manually run migrations
npx drizzle-kit push

# Or generate and review SQL
npx drizzle-kit generate:pg
```

### Rollback needed
```bash
# Quick rollback to previous version
./rollback-cardgenius.sh

# Rollback to specific version
./rollback-cardgenius.sh abc123def
```

## Security Notes

- Keep SSH keys secure and use key-based authentication only
- Use environment variables for sensitive data
- Implement webhook secrets if using webhook deployments
- Regularly update dependencies for security patches
- Monitor access logs for unauthorized attempts

## Future Improvements

- [ ] Implement blue-green deployment strategy
- [ ] Add automated testing before deployment
- [ ] Set up staging environment
- [ ] Implement canary deployments
- [ ] Add performance testing
- [ ] Set up centralized logging
- [ ] Implement deployment notifications (Slack/Email)
