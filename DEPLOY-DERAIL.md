# 🚀 Deployment Guide for derail.me

Complete deployment guide for ChittyPro Streamlink to the derail.me domain with SSL, live streaming, and production optimizations.

## 🎯 Quick Deploy

**One-command deployment:**
```bash
./scripts/deploy-derail.sh full
```

This sets up everything: SSL, database, nginx, PM2, monitoring, and launches your app at **https://derail.me**

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: 2GB minimum (4GB recommended for multiple streams)
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum (more for video recordings)
- **Domain**: derail.me pointed to your server IP

### Before Deployment
1. **DNS Setup**: Point derail.me A record to your server IP
2. **Server Access**: SSH access with sudo privileges
3. **Firewall**: Open ports 80, 443, 22

## 🔧 Manual Deployment Steps

### 1. Clone and Setup
```bash
# Clone repository
git clone <your-repo-url>
cd chittypro-streamlink

# Make deployment script executable
chmod +x scripts/deploy-derail.sh

# Start full deployment
./scripts/deploy-derail.sh full
```

### 2. What the Script Does

**System Setup**:
- ✅ Installs Node.js 18+, FFmpeg, PostgreSQL, Nginx, Certbot
- ✅ Creates dedicated database `chittypro_production`
- ✅ Configures automatic SSL with Let's Encrypt
- ✅ Sets up Nginx reverse proxy with WebSocket support

**Application Setup**:
- ✅ Builds production application
- ✅ Configures PM2 process manager
- ✅ Sets up database schema
- ✅ Enables monitoring and auto-restart

**Security & Performance**:
- ✅ HTTPS redirect and security headers
- ✅ Gzip compression
- ✅ Rate limiting
- ✅ SSL auto-renewal

## 🔐 Environment Configuration

The deployment creates `.env` from `.env.production`. Update these values:

```bash
# Edit production environment
nano .env

# Key settings to update:
DATABASE_URL=postgresql://chittypro:YOUR_PASSWORD@localhost:5432/chittypro_production
SESSION_SECRET=your-unique-session-secret
JWT_SECRET=your-unique-jwt-secret
```

## 🎥 Live Streaming Setup

**FFmpeg Configuration**:
The deployment automatically installs FFmpeg for RTSP to WebSocket streaming.

**Camera Configuration**:
1. Access https://derail.me
2. Add your camera RTSP URLs in the admin panel
3. Start streaming with the play buttons on each camera

**Supported Formats**:
- RTSP streams (IP cameras, NVRs)
- HLS streams (fallback)
- WebRTC (future enhancement)

## 📊 Monitoring & Management

### PM2 Commands
```bash
# View application status
pm2 status

# View logs
pm2 logs chittypro-streamlink

# Restart application
pm2 restart chittypro-streamlink

# Monitor in real-time
pm2 monit
```

### Nginx Commands
```bash
# Check status
sudo systemctl status nginx

# Reload configuration
sudo systemctl reload nginx

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL Management
```bash
# Check certificate status
sudo certbot certificates

# Manual renewal (auto-renewal is configured)
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## 🔄 Updates & Maintenance

### Quick Application Update
```bash
./scripts/deploy-derail.sh update
```

### System Monitoring
```bash
# Check deployment status
./scripts/deploy-derail.sh status

# View all logs
./scripts/deploy-derail.sh logs
```

### Database Backup
```bash
# Manual backup
sudo -u postgres pg_dump chittypro_production > backup.sql

# Restore from backup
sudo -u postgres psql chittypro_production < backup.sql
```

## 🎛️ Configuration Options

### Streaming Quality
Edit `server/streaming.ts` quality settings:
```javascript
const settings = {
  low: { width: 640, height: 480, fps: 15, bitrate: '500k' },
  medium: { width: 1280, height: 720, fps: 25, bitrate: '1500k' },
  high: { width: 1920, height: 1080, fps: 30, bitrate: '3000k' }
};
```

### Google Drive Integration
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive
./scripts/sync-to-gdrive.sh setup

# Enable automatic sync
echo "0 2 * * * $(pwd)/scripts/sync-to-gdrive.sh sync" | crontab -
```

## 🔧 Troubleshooting

### Common Issues

**SSL Certificate Errors**:
```bash
# Check domain DNS
nslookup derail.me

# Manually get certificate
sudo certbot certonly --nginx -d derail.me
```

**Application Won't Start**:
```bash
# Check logs
pm2 logs chittypro-streamlink

# Check database connection
sudo -u postgres psql -l
```

**Streaming Issues**:
```bash
# Test FFmpeg
ffmpeg -version

# Check camera connectivity
ffprobe rtsp://your-camera-url
```

**High CPU Usage**:
```bash
# Reduce stream quality in .env
STREAM_QUALITY=low
MAX_CONCURRENT_STREAMS=5

# Restart application
pm2 restart chittypro-streamlink
```

### Logs Locations
- **Application**: `/var/log/chittypro-*.log`
- **Nginx**: `/var/log/nginx/`
- **PM2**: `pm2 logs`
- **Deployment**: `/var/log/chittypro-deploy.log`

## 🔒 Security Checklist

- ✅ HTTPS enabled with auto-renewal
- ✅ Security headers configured
- ✅ Database with restricted access
- ✅ Rate limiting enabled
- ✅ Firewall configured (ports 80, 443, 22 only)
- ✅ Regular automatic updates
- ✅ Log monitoring

## 📈 Performance Optimization

### Server Tuning
```bash
# Increase file limits for streaming
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf

# Optimize network for streaming
echo "net.core.rmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

### Database Optimization
```sql
-- Connect to database
sudo -u postgres psql chittypro_production

-- Optimize for streaming workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

## 🆘 Support & Maintenance

### Automated Health Checks
The deployment includes automated monitoring that:
- Restarts the app if it crashes
- Cleans old recordings when disk is full
- Monitors SSL certificate expiration
- Logs system health every 5 minutes

### Manual Health Check
```bash
# Run comprehensive status check
./scripts/deploy-derail.sh status

# Check all services
systemctl status nginx postgresql
pm2 status
```

## 🎉 Success!

After deployment, your ChittyPro Streamlink will be available at:

- **🌐 Main App**: https://derail.me
- **📡 Live Streams**: https://derail.me (with WebSocket at wss://derail.me/stream)
- **🔧 API**: https://derail.me/api

**Default Access**:
- Username: `admin`
- The app will prompt for camera setup on first visit

**Features Ready**:
- ✅ Live RTSP streaming through browser
- ✅ Multi-camera PTZ controls
- ✅ Real-time chat and notifications
- ✅ Guest access management
- ✅ Recording requests and approval workflow
- ✅ Google Drive integration (if configured)
- ✅ SSL security and auto-renewal
- ✅ Production monitoring and auto-restart

Your professional camera surveillance system is now live at **derail.me**! 🚀