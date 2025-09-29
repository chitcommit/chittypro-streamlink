# ChittyPro Streamlink Deployment Verification Checklist

## Pre-Deployment Verification

### ✅ Repository Status
- [✅] Repository: https://github.com/chitcommit/chittypro-streamlink.git
- [✅] Branch: main
- [✅] Build scripts: Configured (npm run build)
- [✅] GitHub Actions: Configured for derail.me deployment
- [✅] Dependencies: All packages installed and compatible

### ✅ Server Requirements
- [⚠️] **MANUAL STEP REQUIRED**: derail.me server access
- [⚠️] **MANUAL STEP REQUIRED**: SSH key deployment
- [⚠️] **MANUAL STEP REQUIRED**: Server setup script execution

### ✅ Environment Configuration
- [✅] .env.production: Configured
- [✅] Database settings: PostgreSQL with proper credentials
- [✅] SSL configuration: Let's Encrypt ready
- [✅] Nginx configuration: Reverse proxy with WebSocket support

## Manual Deployment Steps Required

Since direct SSH access to derail.me is not available from this environment, you need to complete these steps manually:

### 1. Server Access Setup ⚠️ **MANUAL**
```bash
# Add SSH public key to server
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOtnF9WTEKbTJKS1bjqtqn6c4zot2iqsAMXLLxDk2Mi/ deploy@derail.me" >> /home/deploy/.ssh/authorized_keys
```

### 2. Server Preparation ⚠️ **MANUAL**
```bash
# Run server setup script on derail.me
./scripts/setup-server.sh
```

### 3. GitHub Secrets Configuration ⚠️ **MANUAL**
```bash
# Configure GitHub repository secrets
./scripts/configure-github-secrets.sh
```

### 4. SSL Certificate ⚠️ **MANUAL**
```bash
# Get Let's Encrypt certificate
sudo certbot --nginx -d derail.me -d www.derail.me
```

### 5. Application Deployment ⚠️ **MANUAL**
```bash
# Initial deployment
cd /var/www/chittypro-streamlink
git clone https://github.com/chitcommit/chittypro-streamlink.git .
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
```

## Automated Deployment Verification

### GitHub Actions Pipeline ✅
- Workflow: `.github/workflows/deploy-production.yml`
- Trigger: Push to main branch
- Target: derail.me server
- Port: 3000 (internal), 443/80 (external via Nginx)

### Database Configuration ✅
- Database: chittypro_streamlink
- User: streamlink
- Provider: PostgreSQL
- ORM: Drizzle

### Security Configuration ✅
- SSL: Let's Encrypt automatic renewal
- HTTPS redirect: Configured
- Security headers: Implemented
- CORS: Configured for derail.me

## Post-Deployment Verification

### Application Health Checks
- [ ] **Test 1**: `curl https://derail.me/api/health`
- [ ] **Test 2**: Login page loads at https://derail.me
- [ ] **Test 3**: WebSocket connection works for streaming
- [ ] **Test 4**: Camera management interface functional
- [ ] **Test 5**: PTZ controls respond correctly
- [ ] **Test 6**: Recording functionality works
- [ ] **Test 7**: Guest access management works

### System Health Checks
- [ ] **Check 1**: `pm2 status` shows application running
- [ ] **Check 2**: `sudo systemctl status nginx` shows active
- [ ] **Check 3**: `sudo systemctl status postgresql` shows active
- [ ] **Check 4**: SSL certificate valid and auto-renewing
- [ ] **Check 5**: Firewall configured correctly (ports 22, 80, 443)

### Performance Verification
- [ ] **Perf 1**: Page load time < 3 seconds
- [ ] **Perf 2**: Video stream latency < 2 seconds
- [ ] **Perf 3**: CPU usage stable under normal load
- [ ] **Perf 4**: Memory usage within acceptable limits

### Monitoring Setup
- [ ] **Monitor 1**: PM2 monitoring active
- [ ] **Monitor 2**: Nginx access logs rotating
- [ ] **Monitor 3**: Application error logs available
- [ ] **Monitor 4**: Disk space monitoring active

## Emergency Procedures

### Quick Fix Commands
```bash
# Restart application
pm2 restart chittypro-streamlink

# Reload Nginx
sudo systemctl reload nginx

# Check logs
pm2 logs chittypro-streamlink
sudo tail -f /var/log/nginx/error.log

# Emergency stop
pm2 stop chittypro-streamlink
```

### Rollback Procedure
```bash
# Quick rollback to previous version
cd /var/www/chittypro-streamlink
git checkout HEAD~1
npm ci --production
npm run build
pm2 restart chittypro-streamlink
```

## Success Criteria

✅ **Deployment is successful when all of these are true:**

1. ✅ Application loads at https://derail.me
2. ⚠️ SSL certificate is valid and working
3. ⚠️ Login functionality works correctly
4. ⚠️ Camera streaming works without errors
5. ⚠️ PTZ controls respond to user input
6. ⚠️ Recording and playback functions work
7. ⚠️ WebSocket connections are stable
8. ⚠️ No critical errors in application logs
9. ⚠️ Database connections are stable
10. ⚠️ GitHub Actions deployment pipeline works

## Contact and Support

- **Repository**: https://github.com/chitcommit/chittypro-streamlink
- **Production URL**: https://derail.me
- **GitHub Actions**: https://github.com/chitcommit/chittypro-streamlink/actions
- **Documentation**: See MANUAL-DEPLOYMENT-INSTRUCTIONS.md

---

**Status**: Ready for manual deployment completion
**Next Action**: Follow MANUAL-DEPLOYMENT-INSTRUCTIONS.md step by step