# 🚀 Free Deployment Guide

Complete guide for deploying ChittyPro Streamlink on free/cheap platforms with Google Drive integration.

## 🆓 Best Free Options

### 1. Railway (Recommended)
- **Cost**: $5/month credit (covers most usage)
- **Includes**: PostgreSQL database
- **Pros**: Zero config, great for this project

```bash
./scripts/deploy-free.sh railway
```

### 2. Render
- **Cost**: Completely free
- **Limitation**: Sleeps after 15min inactivity
- **Includes**: PostgreSQL (limited)

```bash
./scripts/deploy-free.sh render
```

### 3. Fly.io
- **Cost**: $5/month credit
- **Pros**: Global edge deployment, fast
- **Good for**: International users

```bash
./scripts/deploy-free.sh fly
```

### 4. Oracle Cloud Always Free
- **Cost**: Permanently free
- **Specs**: 1GB RAM, 1 CPU, 50GB storage
- **Best for**: Long-term free hosting

```bash
./scripts/deploy-free.sh oracle-setup
./scripts/deploy-free.sh selfhosted
```

## 📹 Video Storage Strategy

### Google Drive Integration

**Storage Costs**:
- Free: 15GB (shared with Gmail)
- 100GB: $1.99/month
- 2TB: $9.99/month

**Setup**:
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive
./scripts/sync-to-gdrive.sh setup

# Test sync
./scripts/sync-to-gdrive.sh sync
```

### Smart Recording Management

The system automatically:
1. **Compresses videos** >100MB using FFmpeg
2. **Syncs to Google Drive** for backup
3. **Cleans old local files** while keeping cloud backup
4. **Streams live** (not stored) for real-time viewing

**Example compression results**:
- 1 hour 1080p: ~2GB → ~200MB (90% reduction)
- Motion clips: ~50MB → ~10MB
- 24/7 recording: ~10GB/day → ~1GB/day compressed

## 🔧 Quick Setup Commands

### Railway (Easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
./scripts/deploy-free.sh railway

# Your app will be live at: https://your-app.railway.app
```

### Manual Setup (Any Platform)
```bash
# 1. Environment setup
cp .env.example .env
# Edit DATABASE_URL in .env

# 2. Build and deploy
npm install
npm run build
npm start

# 3. Setup Google Drive sync
./scripts/sync-to-gdrive.sh setup
```

## 📊 Storage Calculator

**For different recording scenarios**:

| Scenario | Local Storage | Google Drive Usage | Monthly Cost |
|----------|---------------|-------------------|--------------|
| Motion only (1hr/day) | ~100MB/day | ~3GB/month | Free tier OK |
| Business hours (8hr/day) | ~800MB/day | ~24GB/month | $1.99/month |
| 24/7 recording | ~1GB/day | ~30GB/month | $1.99/month |
| Multiple cameras (4x) | ~4GB/day | ~120GB/month | $1.99/month |

**Optimization tips**:
- Use motion detection to reduce storage
- Set recording quality based on needs
- Clean up old recordings regularly
- Compress videos before uploading

## 🛠 Advanced Configuration

### Recording Quality Settings

Edit `scripts/recording-manager.sh`:
```bash
# Lower quality = smaller files
COMPRESSION_QUALITY=28  # Higher number = more compression

# Limit file sizes
MAX_FILE_SIZE_MB=50     # Auto-compress above this size
```

### Auto-cleanup Schedule

Add to crontab for automatic cleanup:
```bash
# Daily cleanup (keep 7 days local, unlimited cloud)
0 2 * * * /path/to/recording-manager.sh cleanup 7

# Weekly Google Drive sync
0 3 * * 0 /path/to/sync-to-gdrive.sh sync
```

### Multiple Camera Recording

Create `camera_config.csv`:
```csv
front_door,rtsp://user:pass@192.168.1.100:554/stream,1800
backyard,rtsp://user:pass@192.168.1.101:554/stream,3600
driveway,rtsp://user:pass@192.168.1.102:554/stream,1800
```

Start recording:
```bash
./scripts/recording-manager.sh record-multiple camera_config.csv
```

## 🚨 Production Tips

### Security
- Use environment variables for camera passwords
- Enable HTTPS (automatic on Railway/Render/Fly)
- Set up basic authentication if needed
- Restrict access to admin features

### Performance
- Enable video compression for large files
- Use Google Drive for old recordings
- Keep only recent files locally
- Monitor storage usage regularly

### Monitoring
```bash
# Check storage usage
./scripts/recording-manager.sh storage

# Monitor Google Drive sync
./scripts/sync-to-gdrive.sh backup-db
```

## 💰 Cost Breakdown

**Minimal Setup (Motion Recording)**:
- Platform: Free (Railway credit/Render free)
- Storage: Free (Google Drive 15GB)
- **Total: $0/month**

**Small Business (8hr/day)**:
- Platform: $5/month (Railway)
- Storage: $1.99/month (Google Drive 100GB)
- **Total: $6.99/month**

**Full 24/7 (Multiple Cameras)**:
- Platform: $5/month (Railway)
- Storage: $1.99/month (Google Drive 100GB)
- **Total: $6.99/month**

## 🆘 Troubleshooting

### Common Issues

**"Out of storage" error**:
```bash
# Check usage
./scripts/recording-manager.sh storage

# Clean old files
./scripts/recording-manager.sh cleanup 3
```

**Google Drive sync failing**:
```bash
# Reconfigure rclone
rclone config reconnect gdrive:

# Test connection
rclone lsd gdrive:
```

**High bandwidth usage**:
- Enable compression in recording-manager.sh
- Reduce recording quality/duration
- Use motion detection instead of continuous recording

## 📞 Support

- Check logs: `docker logs container_name`
- Monitor resources: `./scripts/recording-manager.sh storage`
- Test components: `npm run check`
- Platform docs: Railway/Render/Fly.io documentation