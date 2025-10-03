# ✅ ChittyPro Streamlink Development Server Running

## 🚀 Server Status: LIVE

**Local Development URL**: http://localhost:3001
**Health Check**: http://localhost:3001/api/health

---

## 📊 Current Status

```json
{
  "status": "healthy",
  "environment": "development",
  "checks": {
    "database": "healthy",
    "storage": "healthy",
    "streaming": "healthy"
  }
}
```

---

## 🌐 Access Points

### Main Application
- **Frontend**: http://localhost:3001
- **Login**: http://localhost:3001/login
- **Dashboard**: http://localhost:3001 (after login)

### API Endpoints
- **Health**: http://localhost:3001/api/health
- **Cameras**: http://localhost:3001/api/cameras
- **Users**: http://localhost:3001/api/users
- **Recordings**: http://localhost:3001/api/recordings
- **Share Links**: http://localhost:3001/api/share-links

### WebSocket
- **Streaming**: ws://localhost:3001/stream
- **Chat**: ws://localhost:3001/ws

---

## 👤 Default Login

**Username**: `admin`
**Password**: `admin123`

⚠️ **IMPORTANT**: Change this password in production!

---

## 🛠️ Development Commands

### Server Management
```bash
# Server is currently running on port 3001

# View logs (in real-time)
# The server is running in background with ID: cb4219

# Stop server
kill $(lsof -t -i:3001)

# Restart server
PORT=3001 npm run dev

# Build for production
npm run build

# Run production server
npm run start
```

### Database Management
```bash
# Push schema changes
npm run db:push

# Generate migrations
npm run db:generate

# View database
npm run db:studio
```

### Testing
```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run check
```

---

## 📁 Project Structure

```
chittypro-streamlink/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── index.ts         # Server entry
│   ├── routes.ts        # API routes
│   ├── streaming.ts     # Streaming server
│   ├── auth.ts          # Authentication
│   └── sharing.ts       # Share links
├── shared/              # Shared types
│   └── schema.ts        # Database schema
└── scripts/             # Deployment scripts
```

---

## 🎯 Quick Start Guide

### 1. Access the Application
Open your browser to: http://localhost:3001

### 2. Login
Use the default admin credentials above

### 3. Add a Camera
- Click "Add Camera" button
- Enter camera details:
  - **Name**: e.g., "Front Door"
  - **Stream URL**: RTSP stream URL (e.g., `rtsp://username:password@camera-ip:554/stream`)
  - **Type**: Reolink, ONVIF, etc.
  - **Location**: Physical location

### 4. View Live Stream
- Camera will appear in the grid
- Click to view full screen
- Use PTZ controls (if supported)

### 5. Share Access
- Click share icon on camera
- Set expiration time
- Copy one-time link
- Share with guest

---

## 🔧 Development Features

### Hot Reload
- Frontend: Vite HMR (instant updates)
- Backend: tsx watch mode (auto-restart)

### Dev Tools
- React DevTools extension supported
- Network inspector for WebSocket streams
- Source maps enabled for debugging

### Mock Data
- Sample cameras pre-loaded
- Test users available
- Demo recordings included

---

## 🚀 Deployment Options

### 1. Cloudflare Workers (Recommended)
```bash
./scripts/deploy-to-cloudflare-workers.sh
```

### 2. Traditional Server (derail.me)
```bash
./scripts/deploy-derail.sh full
```

### 3. Docker
```bash
docker-compose up -d
```

### 4. Railway/Render/Fly.io
Follow platform-specific deployment guides in `DEPLOYMENT.md`

---

## 📋 Production Checklist

Before deploying to production:

- [ ] Change default admin password
- [ ] Configure environment variables
- [ ] Set up PostgreSQL database
- [ ] Configure SSL certificate
- [ ] Set up monitoring
- [ ] Test camera streams
- [ ] Configure backup strategy
- [ ] Set up domain/subdomain
- [ ] Configure CORS origins
- [ ] Enable security headers

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill $(lsof -t -i:3001)

# Or use a different port
PORT=3002 npm run dev
```

### Camera Stream Not Working
1. Verify RTSP URL is correct
2. Check camera is accessible from server
3. Ensure FFmpeg is installed
4. Check firewall settings
5. Test stream URL directly: `ffmpeg -i rtsp://camera-url -t 5 test.mp4`

### Database Connection Error
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env
3. Run `npm run db:push` to create schema
4. Verify credentials are correct

### WebSocket Connection Failed
1. Check browser console for errors
2. Verify WebSocket endpoint is accessible
3. Check for CORS issues
4. Ensure server is running

---

## 📚 Documentation

- [README.md](README.md) - Overview and quick start
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guides
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - Production readiness
- [CREATIVE-BRIEF.md](CREATIVE-BRIEF.md) - Brand and marketing
- [DEPLOYMENT-STRATEGY.md](DEPLOYMENT-STRATEGY.md) - Deployment options

---

## 🔗 Useful Links

- **GitHub Repo**: https://github.com/chitcommit/chittypro-streamlink
- **GitHub Actions**: https://github.com/chitcommit/chittypro-streamlink/actions
- **Production URL** (when deployed): https://derail.me

---

## 💡 Next Steps

1. **Explore the Application**
   - Test camera streaming functionality
   - Try PTZ controls
   - Test guest access sharing
   - Use the chat system

2. **Customize**
   - Add your real cameras
   - Configure user roles
   - Set up recording schedules
   - Customize grid layouts

3. **Deploy**
   - Choose deployment method
   - Configure production environment
   - Set up monitoring
   - Go live!

---

## 🎉 Development Server Active

Your ChittyPro Streamlink development server is running and ready for testing!

**Access now**: http://localhost:3001

Happy coding! 🚀