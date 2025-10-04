# 🔗 ChittyPro Streamlink - Platform Integration Plan

## Overview

ChittyPro Streamlink will be integrated as a **modular tool/feature** within the derail.me platform, not as a standalone replacement.

---

## Architecture Strategy

### Integration Model: Micro-Frontend + API Module

```
derail.me Platform
├── /                      → Main platform dashboard
├── /cameras               → ChittyPro Streamlink (camera management & streaming)
├── /analytics             → (Future: Analytics module)
├── /security              → (Future: Security module)
├── /api/cameras/*         → ChittyPro Streamlink API endpoints
└── /ws/cameras            → ChittyPro Streamlink WebSocket
```

---

## Integration Options

### Option 1: Subdomain Route (Recommended)
Deploy ChittyPro Streamlink as a route under derail.me:

**URL Structure**:
- Main Platform: `https://derail.me/`
- Camera Module: `https://derail.me/cameras`
- API: `https://derail.me/api/cameras/*`

**Benefits**:
- Clean URL structure
- Independent deployment
- Easy to add more modules
- Shared authentication context

**Implementation**:
```nginx
# Nginx configuration
location /cameras/ {
    proxy_pass http://localhost:3001/;
    # ... proxy settings
}

location /api/cameras/ {
    proxy_pass http://localhost:3001/api/;
}

location /ws/cameras {
    proxy_pass http://localhost:3001/ws;
    # WebSocket upgrade headers
}
```

---

### Option 2: Cloudflare Workers Route
Deploy as a Worker route under the main domain:

**Cloudflare Route Pattern**:
- `derail.me/cameras/*` → ChittyPro Streamlink Worker
- `derail.me/*` → Main Platform Worker

**Benefits**:
- Serverless, auto-scaling
- No server management
- Global edge deployment
- Cost-effective

**wrangler.toml**:
```toml
name = "chittypro-streamlink-module"
route = { pattern = "derail.me/cameras/*", zone_name = "derail.me" }
```

---

### Option 3: iFrame Embed (Quick Integration)
Embed ChittyPro Streamlink as an iframe within the platform:

**Main Platform Code**:
```html
<div class="module-container">
    <iframe
        src="https://stream.derail.me"
        frameborder="0"
        sandbox="allow-same-origin allow-scripts allow-forms"
        style="width: 100%; height: 100vh;"
    ></iframe>
</div>
```

**Benefits**:
- Quick integration
- Complete isolation
- Easy A/B testing

**Drawbacks**:
- Less integrated UX
- Cross-domain communication needed

---

## Recommended Approach: Platform Module Integration

### Step 1: Create Platform Structure

```
derail.me/
├── platform/               # Main platform code
│   ├── dashboard.html      # Main dashboard
│   ├── navigation.js       # Shared navigation
│   └── auth.js            # Shared authentication
├── modules/               # Feature modules
│   ├── cameras/           # ChittyPro Streamlink
│   │   ├── dist/         # Built app
│   │   └── api/          # API routes
│   └── analytics/        # Future modules
└── shared/               # Shared components
    ├── header.js
    ├── sidebar.js
    └── auth-context.js
```

### Step 2: Shared Navigation

Create a unified navigation bar that includes ChittyPro Streamlink:

```javascript
// shared/navigation.js
const modules = [
    { name: 'Dashboard', path: '/', icon: 'home' },
    { name: 'Cameras', path: '/cameras', icon: 'video', badge: '4' },
    { name: 'Analytics', path: '/analytics', icon: 'chart' },
    { name: 'Security', path: '/security', icon: 'shield' }
];
```

### Step 3: Shared Authentication

Use a single authentication system across all modules:

```javascript
// shared/auth-context.js
class PlatformAuth {
    constructor() {
        this.token = localStorage.getItem('platform_token');
    }

    async login(username, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const { token } = await response.json();
        this.token = token;
        localStorage.setItem('platform_token', token);
    }

    isAuthenticated() {
        return !!this.token && !this.isTokenExpired();
    }

    getToken() {
        return this.token;
    }
}

export const auth = new PlatformAuth();
```

### Step 4: Module Registration

Each module registers itself with the platform:

```javascript
// modules/cameras/module.config.js
export default {
    name: 'ChittyPro Streamlink',
    id: 'cameras',
    version: '1.0.0',
    routes: [
        { path: '/cameras', component: 'CameraGrid' },
        { path: '/cameras/:id', component: 'CameraDetail' }
    ],
    api: {
        prefix: '/api/cameras',
        endpoints: ['/', '/:id', '/share', '/recordings']
    },
    permissions: ['view_cameras', 'control_cameras', 'manage_cameras'],
    navigation: {
        label: 'Cameras',
        icon: 'video-camera',
        order: 2
    }
};
```

---

## Integration Code Structure

### Main Platform Entry Point

```javascript
// platform/main.js
import { auth } from './shared/auth-context.js';
import { Router } from './shared/router.js';
import camerasModule from '../modules/cameras/module.config.js';

class DerailPlatform {
    constructor() {
        this.modules = new Map();
        this.router = new Router();
        this.auth = auth;
    }

    registerModule(module) {
        this.modules.set(module.id, module);

        // Register routes
        module.routes.forEach(route => {
            this.router.addRoute(route.path, route.component);
        });

        // Add to navigation
        this.addToNavigation(module.navigation);
    }

    async init() {
        // Check authentication
        if (!this.auth.isAuthenticated()) {
            this.router.navigate('/login');
            return;
        }

        // Register all modules
        this.registerModule(camerasModule);

        // Start router
        this.router.start();
    }
}

const platform = new DerailPlatform();
platform.init();
```

---

## Deployment Strategy

### Phase 1: Side-by-Side (Current)
- Existing Reolink Viewer: `derail.me/`
- ChittyPro Streamlink: `derail.me/cameras` (new route)

### Phase 2: Platform Migration
- New Platform: `derail.me/` (with module navigation)
- Camera Module: `derail.me/cameras`
- Legacy redirect: `derail.me/legacy` (old viewer)

### Phase 3: Unified Platform
- Remove legacy viewer
- All features as platform modules
- Unified authentication and navigation

---

## Modified Nginx Configuration

```nginx
# derail.me Platform Configuration
server {
    listen 443 ssl http2;
    server_name derail.me www.derail.me;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/derail.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/derail.me/privkey.pem;

    # Main platform (existing Reolink Viewer for now)
    location / {
        root /var/www/derail.me/platform;
        try_files $uri $uri/ /index.html;
    }

    # ChittyPro Streamlink Module
    location /cameras {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Camera API endpoints
    location /api/cameras {
        proxy_pass http://localhost:3001/api;
        proxy_set_header Host $host;
    }

    # WebSocket for camera streaming
    location /ws/cameras {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Shared authentication API
    location /api/auth {
        proxy_pass http://localhost:5000/api/auth;
    }
}
```

---

## Module Communication Pattern

### Event Bus for Inter-Module Communication

```javascript
// shared/event-bus.js
class EventBus {
    constructor() {
        this.events = new Map();
    }

    emit(event, data) {
        const handlers = this.events.get(event) || [];
        handlers.forEach(handler => handler(data));
    }

    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
    }
}

export const eventBus = new EventBus();

// Usage:
// Camera module emits event
eventBus.emit('camera:motion-detected', { cameraId: 'cam-1', timestamp: Date.now() });

// Security module listens
eventBus.on('camera:motion-detected', (data) => {
    console.log('Motion detected on camera', data.cameraId);
    // Trigger alert, recording, etc.
});
```

---

## Shared State Management

```javascript
// shared/platform-store.js
import { create } from 'zustand';

export const usePlatformStore = create((set) => ({
    user: null,
    modules: [],
    notifications: [],

    setUser: (user) => set({ user }),
    addNotification: (notification) =>
        set((state) => ({
            notifications: [...state.notifications, notification]
        })),
    clearNotifications: () => set({ notifications: [] })
}));

// Usage in Camera module:
import { usePlatformStore } from '@/shared/platform-store';

function CameraAlert() {
    const addNotification = usePlatformStore((state) => state.addNotification);

    const handleMotionDetected = (camera) => {
        addNotification({
            type: 'motion',
            message: `Motion detected on ${camera.name}`,
            timestamp: Date.now()
        });
    };
}
```

---

## Quick Start: Integrate ChittyPro Streamlink Now

### 1. Deploy as Module Route

```bash
# On your derail.me server
cd /var/www/derail.me

# Create modules directory
mkdir -p modules/cameras

# Deploy ChittyPro Streamlink
cd modules/cameras
git clone https://github.com/chitcommit/chittypro-streamlink.git .
npm install
npm run build

# Start on port 3001
pm2 start npm --name cameras -- start
pm2 save
```

### 2. Update Nginx Configuration

```bash
# Add camera module routes
sudo nano /etc/nginx/sites-available/derail.me

# Add the location blocks shown above

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Access

- **Main Platform**: https://derail.me/
- **Camera Module**: https://derail.me/cameras
- **Camera API**: https://derail.me/api/cameras

---

## Benefits of This Approach

✅ **Modular Architecture** - Add features independently
✅ **Independent Deployment** - Deploy modules without affecting platform
✅ **Shared Authentication** - Single login for all modules
✅ **Unified UX** - Consistent navigation and design
✅ **Scalable** - Easy to add more modules (analytics, security, etc.)
✅ **Maintainable** - Clear separation of concerns

---

## Future Modules (Roadmap)

### Planned Modules:
1. **Cameras** (ChittyPro Streamlink) - ✅ Ready
2. **Analytics** - Usage stats, motion detection trends
3. **Security** - Access logs, intrusion detection
4. **Automation** - Rules engine, scheduled actions
5. **Notifications** - Alert management, notification routing
6. **Storage** - Recording management, cloud backup

### Platform Features:
- Unified dashboard with widgets from all modules
- Cross-module automation (e.g., motion → alert → record)
- Global search across all modules
- Platform-wide settings and preferences
- Module marketplace (install new features)

---

## Next Steps

1. **Deploy ChittyPro Streamlink** as `/cameras` route
2. **Keep existing Reolink Viewer** at `/` for now
3. **Test integration** with shared navigation
4. **Migrate users** gradually to platform modules
5. **Add more modules** as needed

---

**ChittyPro Streamlink is ready to become a powerful module in your derail.me platform!** 🚀

Would you like me to create the deployment scripts for this modular integration approach?