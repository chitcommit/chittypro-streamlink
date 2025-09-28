# ChittyPro Streamlink

Professional camera surveillance management system with real-time streaming, PTZ controls, guest access management, and recording capabilities.

## Features

- **Real-time Camera Streaming**: Live video feeds from multiple cameras
- **PTZ Controls**: Pan, tilt, and zoom controls for supported cameras
- **Multi-camera Grid Layout**: Customizable camera arrangements
- **Guest Access Management**: Time-limited guest access with invite tokens
- **Real-time Chat System**: Built-in communication with WebSocket support
- **Recording Management**: Recording requests with approval workflow
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### 🚀 Deployment Options

**Deploy to derail.me (Production)**:
```bash
./scripts/deploy-derail.sh full
```

**Free hosting options**:
```bash
./scripts/deploy-free.sh railway  # Railway ($5 credit)
```

**Other options**: See [DEPLOYMENT.md](DEPLOYMENT.md) for Render, Fly.io, and Oracle Cloud.
**Production**: See [DEPLOY-DERAIL.md](DEPLOY-DERAIL.md) for derail.me deployment.

### 💻 Local Development

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd chittypro-streamlink
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other settings
   ```

3. **Set up database**:
   ```bash
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open http://localhost:5000**

### 🐳 Docker Deployment

1. **Using Docker Compose** (recommended):
   ```bash
   docker-compose up -d
   ```

2. **Build and run manually**:
   ```bash
   docker build -t chittypro-streamlink .
   docker run -p 5000:5000 -e DATABASE_URL=your_db_url chittypro-streamlink
   ```

### 📹 Google Drive Video Storage

Set up automatic video backup to Google Drive:

```bash
# Setup rclone for Google Drive
./scripts/sync-to-gdrive.sh setup

# Start recording with auto-sync
./scripts/recording-manager.sh record rtsp://camera/stream front_door 1800
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)

### Camera Integration

The system supports RTSP streams. Update camera configurations in the database or through the admin interface.

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push schema changes to database
- `npm run preview` - Build and preview production locally

### Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities
│   └── hooks/          # Custom hooks
├── server/             # Express backend
│   ├── index.ts        # Server entry
│   ├── routes.ts       # API routes & WebSocket
│   └── storage.ts      # Data layer
├── shared/             # Shared types
└── migrations/         # Database migrations
```

## Production Deployment

### Environment Setup

1. Set up PostgreSQL database
2. Configure environment variables
3. Set up reverse proxy (nginx/caddy) if needed
4. Configure SSL certificates

### Deployment Options

- **Docker**: Use provided Dockerfile and docker-compose.yml
- **VPS**: Deploy directly with Node.js
- **Platform Services**: Deploy to Railway, Render, etc.

## API Documentation

### REST Endpoints

- `GET /api/cameras` - List all cameras
- `GET /api/user` - Get current user
- `POST /api/recording-requests` - Request recording
- `GET /api/chat/messages` - Get chat history

### WebSocket Events

- Connect to `/ws` for real-time features
- Chat messages, notifications, system updates

## License

MIT License - see LICENSE file for details.