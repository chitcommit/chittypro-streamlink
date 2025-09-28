# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyPro Streamlink is a professional camera surveillance management system built with React, TypeScript, and Express. It provides a real-time camera streaming dashboard with features like multi-camera grid layouts, PTZ controls, chat system, guest access management, and recording capabilities for Reolink cameras.

## Development Commands

```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env    # Copy environment template and configure

# Database setup
npm run db:push         # Push schema changes to PostgreSQL
npm run db:generate     # Generate migrations
npm run db:migrate      # Run migrations

# Development
npm run dev             # Start development server (port 5000)
npm run check           # TypeScript compilation check

# Production
npm run build           # Build client and server
npm run build:client    # Build frontend only
npm run build:server    # Build backend only
npm run start           # Start production server
npm run preview         # Build and preview locally

# Utilities
npm run lint            # Code linting (placeholder)
npm test               # Run tests (placeholder)
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + TypeScript + tsx
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Radix UI + Tailwind CSS + shadcn/ui components
- **Real-time**: WebSocket for chat and notifications
- **State Management**: TanStack Query for server state
- **Routing**: Wouter (lightweight React router)

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and configuration
│   └── hooks/          # Custom React hooks
├── server/             # Express backend
│   ├── index.ts        # Server entry point
│   ├── routes.ts       # API routes and WebSocket
│   ├── storage.ts      # Data access layer
│   └── db.ts           # Database connection
├── shared/             # Shared types and schema
│   └── schema.ts       # Drizzle schema definitions
└── migrations/         # Database migrations
```

### Key Components

**Frontend Components**:
- `CameraGrid`: Main grid layout for multiple camera streams
- `CameraStream`: Individual camera stream component with PTZ controls
- `Sidebar`: Chat system and system controls
- `PTZControls`: Pan/tilt/zoom camera controls
- `InviteModal`: Guest access management

**Backend Architecture**:
- REST API at `/api/*` endpoints
- WebSocket server at `/ws` for real-time features
- In-memory storage with sample data (MemStorage class)
- PostgreSQL schema ready for production deployment

### Database Schema

**Core Entities**:
- `users`: User accounts with roles (owner/admin/viewer/guest)
- `cameras`: Camera configurations with PTZ support and stream URLs
- `userLayouts`: Custom camera grid layouts per user
- `guestSessions`: Time-limited guest access with invite tokens
- `recordingRequests`: User requests for camera recordings with approval workflow
- `chatMessages`: Real-time chat system messages
- `recordings`: Stored camera recordings metadata

### Real-time Features

**WebSocket Integration**:
- Chat messages broadcast to all connected clients
- Recording request notifications for admins
- System status updates and alerts
- Client connection management with automatic cleanup

### Environment Requirements

**Required Environment Variables** (see `.env.example`):
```bash
DATABASE_URL=postgresql://...     # PostgreSQL connection string
PORT=5000                        # Server port (default: 5000)
NODE_ENV=development|production  # Environment mode

# Optional camera authentication
CAMERA_USERNAME=admin
CAMERA_PASSWORD=password

# Optional security for production
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

## Development Workflow

### Initial Setup
1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd chittypro-streamlink
   npm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection and other settings
   ```

3. **Database setup**:
   ```bash
   npm run db:push  # Set up database schema
   ```

4. **Start development**:
   ```bash
   npm run dev      # Starts server on port 5000
   ```

### Testing the Application
- Default admin user: `admin` (ID: `admin-1`)
- Sample cameras with demo RTSP streams are pre-loaded
- Chat system works via WebSocket connection at `/ws`
- PTZ controls send commands to server (camera-specific implementation needed)

### Production Deployment

**Docker (Recommended)**:
```bash
# Using docker-compose (includes PostgreSQL)
docker-compose up -d

# Or build manually
docker build -t chittypro-streamlink .
docker run -p 5000:5000 -e DATABASE_URL=your_db_url chittypro-streamlink
```

**Manual Deployment**:
```bash
npm run build    # Build for production
npm run start    # Start production server
```

### Key Development Notes

**Camera Integration**:
- Uses RTSP streams for camera feeds
- Sample cameras use demo streams from `ipvmdemo.dyndns.org`
- PTZ control endpoints exist but need camera-specific implementation
- Support for both local device recording and server-side recording

**Guest Access System**:
- Generate time-limited invite tokens
- Control camera access per guest session
- Recording permission management
- Automatic session expiry

**Data Persistence**:
- Currently uses in-memory storage with sample data for development
- PostgreSQL-ready with Drizzle ORM for production
- All CRUD operations defined in storage interface

## Common Development Tasks

### Adding New Camera Features
1. Update `cameras` table schema in `shared/schema.ts`
2. Modify `CameraStream` component for new UI features
3. Add API endpoints in `server/routes.ts`
4. Update storage layer in `server/storage.ts`

### Extending Chat System
1. Add new message types to `chatMessages` schema
2. Update WebSocket message handling in `server/routes.ts`
3. Modify `ChatSystem` component for new message UI
4. Add client-side WebSocket hooks in `hooks/use-websocket.ts`

### Camera Stream Integration
- Replace demo RTSP URLs with actual camera endpoints
- Implement authentication for camera streams
- Add video recording capabilities
- Integrate with specific camera manufacturer APIs (Reolink, ONVIF)

## Deployment Guide

### Prerequisites
- Node.js 18+ or Docker
- PostgreSQL database
- Camera systems with RTSP support

### Deployment Options

**1. Docker Compose (Recommended)**:
```bash
docker-compose up -d
```
Includes PostgreSQL, persistent volumes, and automatic restarts.

**2. Docker Manual**:
```bash
docker build -t chittypro-streamlink .
docker run -p 5000:5000 -e DATABASE_URL=your_db_url chittypro-streamlink
```

**3. VPS/Server**:
```bash
npm install
npm run build
npm run start
```

### Production Considerations
- Configure PostgreSQL database connection
- Set up reverse proxy (nginx/caddy) for SSL and domain routing
- Configure environment variables securely
- Set up process manager (PM2) for automatic restarts
- Configure WebSocket connection handling for production
- Set up monitoring and logging
- Configure camera stream security and authentication