# ChittyPro Streamlink for Derail.me

Camera surveillance system white-labeled for derail.me platform integration.

## Quick Start

```bash
# One-command deployment
./deploy-derail.sh

# Or manually
PORT=3001 npm run dev
```

## Configuration

**White-label config**: `config/whitelabel-derail.json`

```json
{
  "enabled": true,
  "domain": "derail.me",
  "name": "Derail Camera System",
  "theme": {
    "primaryColor": "#2d3436",    // Charcoal
    "accentColor": "#00d9ff",     // Electric Teal
    "backgroundColor": "#f8f7f4", // Cream
    "surfaceColor": "#e8dcc4"     // Sand
  },
  "features": {
    "chat": false,      // Disabled for derail.me
    "analytics": false,
    "ai": false
  }
}
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Camera dashboard UI |
| `GET /api/cameras` | List cameras |
| `GET /api/cameras/:id` | Camera details |
| `POST /api/cameras/:id/ptz` | PTZ control |
| `GET /config/whitelabel-derail.json` | White-label config |
| `WS /ws` | WebSocket for real-time |

## Integration with Derail.me

ChittyPro runs as standalone service on port 3001.
Derail.me server proxies requests to this service.

**Derail.me routes** (`/api/cameras`):
```javascript
// Proxies to http://localhost:3001/api/cameras
import cameraRoutes from "./routes/cameras.js";
app.use("/api/cameras", cameraRoutes);
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Derail.me Platform              │
│         (Port 3000)                     │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  /api/cameras → Proxy          │    │
│  └────────────┬───────────────────┘    │
└───────────────┼─────────────────────────┘
                │
                │ HTTP Proxy
                ▼
┌─────────────────────────────────────────┐
│   ChittyPro Streamlink (Port 3001)      │
│                                         │
│  • Camera Management                   │
│  • PTZ Controls                        │
│  • Guest Access                        │
│  • Recording System                    │
│  • WebSocket Streaming                 │
└─────────────────────────────────────────┘
```

## Branding

- **Primary**: Charcoal (#2d3436)
- **Accent**: Electric Teal (#00d9ff)
- **Background**: Cream (#f8f7f4)
- **Surface**: Sand (#e8dcc4)

All colors applied via CSS variables, loaded dynamically from white-label config.

## Files Modified

- ✅ `config/whitelabel-derail.json` - Configuration
- ✅ `client/src/hooks/use-whitelabel.ts` - Dynamic theming
- ✅ `client/src/index.css` - Theme colors
- ✅ `client/src/pages/camera-dashboard.tsx` - Branded UI
- ✅ `server/routes.ts` - Config endpoint

## Development

```bash
npm run dev          # Dev server (port 3001)
npm run build        # Production build
npm test            # Run tests
npm run check       # Type checking
```

## Production

```bash
npm run build
PORT=3001 npm run start
```

Or use PM2:
```bash
pm2 start npm --name "chittypro-derail" -- run start
pm2 save
```

## Documentation

- **Integration Guide**: `DERAIL-INTEGRATION.md`
- **Deployment Script**: `deploy-derail.sh`
- **Main README**: `README.md`

## Support

Health check: `curl http://localhost:3001/api/health`

Service status:
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "storage": "healthy",
    "streaming": "healthy"
  }
}
```

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: October 3, 2025
