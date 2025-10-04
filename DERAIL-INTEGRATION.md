# Derail.me Integration Guide

## Overview

ChittyPro Streamlink has been successfully white-labeled and integrated into the derail.me platform as a camera surveillance module. This integration provides professional camera management capabilities within the derail.me ecosystem.

## White-Label Configuration

### Brand Colors
The system now uses derail.me's brand palette:
- **Primary (Charcoal)**: `#2d3436` - Main UI elements, text
- **Accent (Electric Teal)**: `#00d9ff` - Interactive elements, highlights
- **Background (Cream)**: `#f8f7f4` - Page backgrounds
- **Surface (Sand)**: `#e8dcc4` - Card backgrounds, elevated surfaces

### Branding
- **Name**: "Derail Camera System"
- **Short Name**: "Derail Cameras"
- **Tagline**: "Professional Surveillance, Simplified"
- **Footer**: "© 2025 Derail.me. All rights reserved."
- **ChittyPro branding**: Hidden (as per white-label config)

### Enabled Features
Per derail.me requirements, the following features are configured:
- ✅ Multi-camera grid layout
- ✅ PTZ controls
- ✅ Guest access management
- ✅ Recording capabilities
- ❌ Chat system (disabled)
- ❌ Analytics (disabled)
- ❌ AI features (disabled)

## Technical Implementation

### 1. White-Label System
**Location**: `client/src/hooks/use-whitelabel.ts`

```typescript
// Loads configuration from /config/whitelabel-derail.json
const { config, loading } = useWhitelabel();

// Dynamically applies theme colors via CSS variables
// Updates document title and favicon
// Feature flags control UI elements
```

**Config File**: `config/whitelabel-derail.json`
- Contains all branding, theme, and feature settings
- Served via API endpoint: `GET /config/whitelabel-derail.json`

### 2. CSS Theme Integration
**Location**: `client/src/index.css`

All colors now use CSS variables that are dynamically set by the white-label system:
```css
:root {
  --background: 32, 8%, 96%;     /* Cream */
  --foreground: 195, 7%, 21%;    /* Charcoal */
  --accent: 190, 100%, 50%;      /* Electric Teal */
  --surface: 39, 28%, 85%;       /* Sand */
  /* ... */
}
```

### 3. UI Components Updated
**Camera Dashboard** (`client/src/pages/camera-dashboard.tsx`):
- Displays dynamic branding from config
- Shows/hides features based on white-label settings
- Uses theme variables for all styling
- No inline styles (all CSS variable-based)

**Feature Conditional Rendering**:
```tsx
{config.features.guestAccess && <ShareButton />}
{config.features.multiCamera && <LayoutButton />}
{config.features.chat && <Sidebar />}
```

### 4. Server Integration
**ChittyPro Streamlink Server** (Port 3001):
- Serves white-label config at `/config/whitelabel-derail.json`
- All camera APIs available at `/api/cameras`
- WebSocket for real-time features at `/ws`

**Derail.me Server Integration** (`/Users/nb/.claude/projects/-/derail-me/src/server/index.js`):
- Camera routes registered at `/api/cameras`
- Proxy to ChittyPro service at `http://localhost:3001`

**Camera Routes** (`/Users/nb/.claude/projects/-/derail-me/src/server/routes/cameras.js`):
```javascript
// Proxies all requests to ChittyPro Streamlink
const CAMERA_SERVICE_URL = "http://localhost:3001";
router.get("/", async (req, res) => {
  const response = await fetch(`${CAMERA_SERVICE_URL}/api/cameras`);
  res.json(await response.json());
});
```

## Deployment Configuration

### Environment Variables
**ChittyPro Streamlink** (`.env`):
```bash
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
```

**Derail.me** (`.env`):
```bash
CAMERA_SERVICE_URL=http://localhost:3001
PORT=3000
```

### Nginx Configuration
The white-label config includes nginx routing:
```json
"deployment": {
  "type": "module",
  "port": 3001,
  "nginx": {
    "locationPath": "/cameras",
    "apiPath": "/api/cameras",
    "wsPath": "/ws/cameras"
  }
}
```

Suggested nginx config:
```nginx
# Camera UI
location /cameras {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Camera API (via derail.me server)
location /api/cameras {
    proxy_pass http://localhost:3000/api/cameras;
}

# Camera WebSocket
location /ws/cameras {
    proxy_pass http://localhost:3001/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

## File Structure

```
chittypro-streamlink/
├── config/
│   └── whitelabel-derail.json          # White-label configuration
├── client/src/
│   ├── hooks/
│   │   └── use-whitelabel.ts           # White-label hook
│   ├── pages/
│   │   └── camera-dashboard.tsx        # Updated with branding
│   └── index.css                       # Theme colors
├── server/
│   └── routes.ts                       # Config endpoint added
└── DERAIL-INTEGRATION.md               # This file

derail-me/
└── src/server/
    ├── index.js                        # Camera routes registered
    └── routes/
        └── cameras.js                  # Camera API proxy
```

## Running the Integration

### Development
```bash
# Terminal 1: ChittyPro Streamlink
cd /Users/nb/.claude/projects/-/CHITTYAPPS/chittypro-streamlink
PORT=3001 npm run dev

# Terminal 2: Derail.me
cd /Users/nb/.claude/projects/-/derail-me
npm run dev
```

Access:
- Camera System: `http://localhost:3001`
- Derail.me with Cameras: `http://localhost:3000/cameras`

### Production
```bash
# Build ChittyPro Streamlink
npm run build
npm run start  # Runs on PORT=3001

# Build Derail.me
npm run build
npm run start  # Runs on PORT=3000
```

## API Endpoints

### ChittyPro Streamlink (Port 3001)
- `GET /config/whitelabel-derail.json` - White-label configuration
- `GET /api/cameras` - List all cameras
- `GET /api/cameras/:id` - Get camera details
- `POST /api/cameras` - Add new camera
- `PATCH /api/cameras/:id/ptz` - PTZ control
- `GET /api/recording-requests` - Recording requests
- `WS /ws` - WebSocket for real-time updates

### Derail.me Integration (Port 3000)
- `GET /api/cameras` - Proxied to ChittyPro (port 3001)
- `GET /api/cameras/:id` - Proxied camera details
- All other camera routes proxied through

## Testing Checklist

- [x] White-label configuration loads correctly
- [x] Derail.me brand colors applied throughout UI
- [x] "Derail Camera System" displays in header
- [x] Chat sidebar hidden (per config)
- [x] Custom footer shows "© 2025 Derail.me..."
- [x] Camera API endpoints functional
- [x] Server integration complete
- [ ] WebSocket streaming working
- [ ] PTZ controls functional
- [ ] Guest access working
- [ ] Recording requests working

## Customization

To modify derail.me branding:
1. Edit `config/whitelabel-derail.json`
2. Update colors, features, or branding text
3. Restart the server
4. Changes apply immediately via white-label hook

## Next Steps

1. **Asset Creation**: Add derail.me logo and favicon
   - Logo: `/assets/derail-logo.svg` (180x40px)
   - Favicon: `/assets/derail-favicon.ico`

2. **Production Deployment**:
   - Configure nginx reverse proxy
   - Set up SSL certificates
   - Configure environment variables
   - Set up process manager (PM2)

3. **Feature Integration**:
   - Integrate with derail.me authentication
   - Connect to derail.me user system
   - Add derail.me-specific camera features

4. **Testing**:
   - End-to-end camera streaming
   - PTZ control validation
   - Guest access workflow
   - Recording request workflow

## Support

For issues or questions:
- ChittyPro Streamlink: `/Users/nb/.claude/projects/-/CHITTYAPPS/chittypro-streamlink/CLAUDE.md`
- Derail.me: `/Users/nb/.claude/projects/-/derail-me/CREATIVE_BRIEF.md`
- Integration: This document

---

**Last Updated**: October 3, 2025
**Integration Status**: ✅ Complete - Branding & UI
**Deployment Status**: 🟡 Development - Ready for Production Setup
