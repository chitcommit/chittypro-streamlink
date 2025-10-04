# 🏷️ White Label Configuration Guide

## Overview

ChittyPro Streamlink supports **dual-brand deployment**:

1. **ChittyPro Streamlink** - Standalone branded product (ChittyApps portfolio)
2. **White Label** - Unbranded version for derail.me platform integration

---

## Dual Brand Strategy

### ChittyPro Streamlink (Branded)
**Use Case**: Standalone camera surveillance product
**Branding**: Full Chitty branding, ChittyPro logo, "Powered by ChittyApps"
**Deployment**: Independent domain or subdomain
**Target**: Direct customers, SaaS offering

### Derail Camera System (White Label)
**Use Case**: Module within derail.me platform
**Branding**: No Chitty branding, derail.me styling
**Deployment**: derail.me/cameras route
**Target**: Derail platform users

---

## Building White Label Version

### Quick Build
```bash
# Build white-label version for derail.me
./scripts/build-whitelabel.sh derail

# Output: whitelabel-derail-YYYYMMDD.tar.gz
```

### Custom Configuration
```bash
# Create new white-label config
cp config/whitelabel-derail.json config/whitelabel-mybrand.json

# Edit the configuration
nano config/whitelabel-mybrand.json

# Build with custom config
./scripts/build-whitelabel.sh mybrand
```

---

## White Label Configuration

### Configuration File: `config/whitelabel-derail.json`

```json
{
  "whitelabel": {
    "enabled": true,
    "domain": "derail.me",
    "name": "Derail Camera System",
    "shortName": "Derail Cameras",

    "branding": {
      "hideChittyBranding": true,
      "hidePoweredBy": true,
      "customFooter": "© 2025 Derail.me"
    },

    "theme": {
      "primaryColor": "#2563eb",
      "logo": {
        "url": "/assets/derail-logo.svg"
      }
    },

    "features": {
      "chat": false,
      "analytics": false,
      "ai": false
    }
  }
}
```

### Features Control

**Enabled for derail.me**:
- ✅ Multi-camera viewing
- ✅ PTZ controls
- ✅ Guest access with shareable links
- ✅ Recording management

**Disabled (Chitty-specific)**:
- ❌ Real-time chat
- ❌ AI analytics
- ❌ Advanced automation
- ❌ ChittyID integration

---

## Deployment Methods

### Method 1: As Platform Module (Recommended for derail.me)

**URL Structure**:
- Main Platform: `https://derail.me/`
- Camera Module: `https://derail.me/cameras`
- API: `https://derail.me/api/cameras`

**Deploy**:
```bash
# Build white-label version
npm run build:whitelabel

# Deploy to server
scp -r dist/whitelabel-derail/* user@derail.me:/var/www/derail.me/modules/cameras/

# Start service
ssh user@derail.me 'pm2 start /var/www/derail.me/modules/cameras/server.js --name cameras'
```

**Nginx Configuration**:
```nginx
location /cameras {
    proxy_pass http://localhost:3001;
}

location /api/cameras {
    proxy_pass http://localhost:3001/api;
}
```

---

### Method 2: Subdomain Deployment

**URL**: `https://cameras.derail.me`

**Deploy**:
```bash
./scripts/build-whitelabel.sh derail
scp whitelabel-derail-*.tar.gz user@derail.me:~/
ssh user@derail.me 'tar -xzf whitelabel-derail-*.tar.gz -C /var/www/cameras.derail.me'
```

---

### Method 3: Cloudflare Workers (Serverless)

**Route**: `derail.me/cameras/*`

**Deploy**:
```bash
# Update wrangler.toml with white-label config
wrangler deploy --config wrangler.whitelabel.toml
```

---

## Development Workflow

### Running in White-Label Mode

```bash
# Copy white-label environment
cp .env.whitelabel .env

# Start development server
npm run dev

# Access at: http://localhost:3001
# No Chitty branding will appear
```

### Running in Branded Mode (ChittyPro)

```bash
# Use default environment
cp .env.example .env

# Start development server
npm run dev

# Access at: http://localhost:3001
# Full ChittyPro branding
```

---

## Branding Differences

### ChittyPro Streamlink (Branded)
```
┌─────────────────────────────────────┐
│ [ChittyPro Logo]    Streamlink     │
├─────────────────────────────────────┤
│                                     │
│   [Camera Grid with Chitty Theme]  │
│                                     │
├─────────────────────────────────────┤
│ Powered by ChittyApps © 2025       │
└─────────────────────────────────────┘
```

### Derail Camera System (White Label)
```
┌─────────────────────────────────────┐
│ [Derail Logo]      Cameras         │
├─────────────────────────────────────┤
│                                     │
│   [Camera Grid with Derail Theme]  │
│                                     │
├─────────────────────────────────────┤
│ © 2025 Derail.me                   │
└─────────────────────────────────────┘
```

---

## Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "build:whitelabel": "NODE_ENV=production WHITELABEL=true vite build",
    "build:derail": "./scripts/build-whitelabel.sh derail",
    "deploy:derail": "npm run build:derail && ./scripts/deploy-derail.sh"
  }
}
```

---

## Environment Variables

### Branded Build (.env)
```env
VITE_WHITELABEL_ENABLED=false
VITE_BRAND_NAME="ChittyPro Streamlink"
VITE_SHOW_POWERED_BY=true
```

### White Label Build (.env.whitelabel)
```env
VITE_WHITELABEL_ENABLED=true
VITE_BRAND_NAME="Derail Camera System"
VITE_HIDE_CHITTY_BRANDING=true
VITE_SHOW_POWERED_BY=false
```

---

## Testing White Label

```bash
# Build white-label version
npm run build:derail

# Start local preview
cd dist/whitelabel-derail
npx serve -p 3002

# Access: http://localhost:3002
# Verify no Chitty branding appears
```

---

## Deployment Checklist

### For derail.me White Label:

- [ ] Build with white-label config
- [ ] Verify no Chitty branding visible
- [ ] Test all features work
- [ ] Check Derail theme applied
- [ ] Confirm routes (/cameras) correct
- [ ] Test platform integration
- [ ] Verify shared authentication
- [ ] Deploy to production

### For ChittyPro Branded:

- [ ] Build with full branding
- [ ] Verify Chitty logo visible
- [ ] Test all features enabled
- [ ] Check ChittyPro theme
- [ ] Confirm standalone deployment
- [ ] Test independent auth
- [ ] Deploy to chitty domain

---

## Maintenance

### Updating White Label Config

```bash
# Edit configuration
nano config/whitelabel-derail.json

# Rebuild
npm run build:derail

# Deploy
./scripts/deploy-derail.sh
```

### Adding New White Label Clients

```bash
# Create new config
cp config/whitelabel-derail.json config/whitelabel-newclient.json

# Customize branding
nano config/whitelabel-newclient.json

# Build
./scripts/build-whitelabel.sh newclient
```

---

## Support

### ChittyPro Streamlink (Branded)
- **Repository**: https://github.com/chitcommit/chittypro-streamlink
- **Documentation**: Full feature set
- **Support**: ChittyApps team

### White Label Deployments
- **Configuration**: `config/whitelabel-*.json`
- **Documentation**: Limited to enabled features
- **Support**: Per deployment agreement

---

## Summary

✅ **ChittyPro Streamlink** = Full-featured branded product
✅ **Derail Camera System** = White-label module for derail.me
✅ **Same Codebase** = One repo, multiple brands
✅ **Feature Flags** = Enable/disable per deployment
✅ **Easy Deployment** = Simple build scripts

**Build your white-label version now**: `./scripts/build-whitelabel.sh derail`