# 🚀 CI/CD Deployment Guide

Complete CI/CD setup for ChittyPro Streamlink with GitHub Actions for automatic deployment to derail.me.

## 🔧 Required GitHub Secrets

Configure these secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

### Production Server Secrets
```
PRODUCTION_HOST=derail.me              # Your server IP or domain
PRODUCTION_USER=ubuntu                 # SSH username (usually ubuntu, root, or deploy)
PRODUCTION_SSH_KEY=-----BEGIN...       # Your private SSH key
PRODUCTION_PORT=22                     # SSH port (default: 22)
```

### Optional Service Integrations
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/...     # Slack notifications
HEALTH_CHECK_WEBHOOK=https://your-monitor.com/... # Health check alerts
RAILWAY_TOKEN=your_railway_token                  # For staging deployment
RENDER_API_KEY=your_render_key                   # Alternative staging
RENDER_SERVICE_ID=srv-xxxxx                      # Render service ID
```

## 📋 Server Setup

### 1. Prepare Your Production Server

**Create deployment user**:
```bash
# On your server (derail.me)
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

**Set up SSH key authentication**:
```bash
# On your local machine
ssh-keygen -t ed25519 -C "deployment@derail.me"
# Copy the public key to your server

# On your server
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Prepare application directory**:
```bash
# On your server
sudo mkdir -p /var/www/chittypro-streamlink
sudo chown deploy:deploy /var/www/chittypro-streamlink
```

### 2. Initial Server Setup

**Run the deployment script once manually**:
```bash
# SSH to your server
ssh deploy@derail.me

# Clone and setup
git clone https://github.com/your-username/chittypro-streamlink.git /var/www/chittypro-streamlink
cd /var/www/chittypro-streamlink

# Run initial setup
chmod +x scripts/deploy-derail.sh
./scripts/deploy-derail.sh full
```

## 🔄 CI/CD Workflows

### Production Deployment (`deploy-production.yml`)
**Triggers**: Push to `main` or `master` branch
**Target**: https://derail.me

**Process**:
1. ✅ Run tests and TypeScript checks
2. ✅ Build application
3. ✅ SSH to production server
4. ✅ Pull latest code
5. ✅ Install dependencies and build
6. ✅ Update database schema
7. ✅ Restart PM2 application
8. ✅ Reload Nginx
9. ✅ Run health checks
10. ✅ Send Slack notification

### Testing Pipeline (`test-and-build.yml`)
**Triggers**: Push to any branch, Pull requests
**Actions**:
- Multi-version Node.js testing (18, 20)
- Security audit
- Docker image build
- Preview deployment for PRs

### Staging Deployment (`deploy-staging.yml`)
**Triggers**: Push to `develop` branch
**Target**: https://staging.derail.me (Railway/Render)

### Health Monitoring (`health-check.yml`)
**Schedule**: Every 15 minutes
**Checks**:
- Main site availability
- API endpoints
- WebSocket connectivity
- SSL certificate expiry
- Performance metrics
- Database connectivity

## 🏃‍♂️ Quick Start

### 1. Push to GitHub
```bash
# Add all CI/CD files to git
git add .github/
git commit -m "Add CI/CD workflows for derail.me deployment"
git push origin main
```

### 2. Configure Secrets
1. Go to your GitHub repo → `Settings` → `Secrets and variables` → `Actions`
2. Add all required secrets (see list above)
3. Test connection: `ssh deploy@derail.me` should work

### 3. First Deployment
- Push to `main` branch
- Watch `Actions` tab in GitHub
- Deployment will automatically start
- Check https://derail.me when complete

## 📊 Monitoring & Alerts

### Health Check Endpoints
- `https://derail.me/api/health` - Full health status
- `https://derail.me/api/ready` - Readiness check
- `https://derail.me/api/live` - Liveness check

### GitHub Actions Monitoring
- All workflows visible in `Actions` tab
- Email notifications on failure
- Slack notifications (if configured)
- Health checks every 15 minutes

### Log Monitoring
```bash
# On production server
pm2 logs chittypro-streamlink    # Application logs
sudo journalctl -u nginx         # Nginx logs
tail -f /var/log/nginx/access.log # Access logs
```

## 🔧 Troubleshooting

### Common Issues

**Deployment fails with SSH connection error**:
```bash
# Test SSH connection manually
ssh -i ~/.ssh/deploy_key deploy@derail.me

# Check SSH key is added to GitHub secrets correctly
# Ensure server allows SSH key authentication
```

**Health check fails**:
```bash
# Check application status
ssh deploy@derail.me
pm2 status
sudo systemctl status nginx

# Check health endpoint manually
curl https://derail.me/api/health
```

**Database connection issues**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -l
```

### Manual Recovery

**Rollback deployment**:
```bash
# SSH to server
cd /var/www/chittypro-streamlink

# Restore from backup
sudo cp -r backup-YYYYMMDD-HHMMSS/* .

# Restart services
pm2 restart chittypro-streamlink
sudo systemctl reload nginx
```

**Emergency deployment**:
```bash
# Trigger manual deployment from GitHub
# Go to Actions tab → Deploy to derail.me → Run workflow
```

## 📈 Performance Optimization

### Build Optimization
- Dependencies cached between builds
- Multi-stage Docker builds
- Parallel test execution

### Deployment Speed
- Incremental deployments (only changed files)
- Warm PM2 restarts
- Nginx reload (no downtime)

### Monitoring
- Performance metrics in health checks
- Response time monitoring
- SSL certificate expiry alerts

## 🎯 Next Steps

1. **Set up monitoring**: Configure Slack/email alerts
2. **Add tests**: Implement unit and integration tests
3. **Security scanning**: Add dependency vulnerability checks
4. **Performance testing**: Add load testing to CI/CD
5. **Blue-green deployment**: Implement zero-downtime deployments

Your ChittyPro Streamlink now has enterprise-grade CI/CD! 🚀