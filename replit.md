# Multi-Camera Surveillance System

## Overview

This is a comprehensive multi-camera surveillance system built with a modern full-stack architecture. The application provides real-time camera monitoring, PTZ controls, guest access management, recording capabilities, and live chat functionality. It's designed for professional surveillance environments with support for multiple users, flexible layouts, and comprehensive access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between frontend, backend, and shared components:

- **Frontend**: React-based single-page application with TypeScript
- **Backend**: Express.js REST API with WebSocket support
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tools**: Vite for frontend bundling, esbuild for backend production builds

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Real-time Communication**: WebSocket client with automatic reconnection

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **WebSocket**: Native WebSocket server for real-time features
- **Session Management**: PostgreSQL-based session storage
- **Development**: Hot module replacement with Vite integration

### Database Schema
The system uses PostgreSQL with the following main entities:
- **Users**: Authentication and role-based access (owner, admin, viewer, guest)
- **Cameras**: Stream configuration, PTZ capabilities, and positioning
- **User Layouts**: Customizable camera grid arrangements
- **Guest Sessions**: Temporary access with invite tokens
- **Recording Requests**: Approval workflow for recording access
- **Chat Messages**: Real-time communication system
- **Recordings**: Stored video files with metadata

### Key Features
1. **Multi-Camera Grid**: Drag-and-drop camera arrangement with customizable layouts
2. **PTZ Controls**: Pan, tilt, zoom controls for supported cameras
3. **Guest Access**: Invite-based temporary access with granular permissions
4. **Real-time Chat**: WebSocket-powered communication system
5. **Recording Management**: Request/approval workflow for video recording
6. **Responsive Design**: Mobile-friendly interface with adaptive layouts

## Data Flow

1. **Authentication Flow**: Users authenticate and receive role-based permissions
2. **Camera Streams**: Video streams are proxied through the backend for access control
3. **Real-time Updates**: WebSocket connection handles chat messages and system notifications
4. **Layout Management**: User preferences for camera arrangements are stored and synchronized
5. **Guest Access**: Invite tokens provide temporary access to specific camera feeds
6. **Recording Workflow**: Recording requests go through an approval process before execution

## External Dependencies

### Production Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Components**: Radix UI primitives for accessible components
- **State Management**: TanStack Query for server state management
- **Date Handling**: date-fns for date manipulation
- **Form Handling**: React Hook Form with Zod validation
- **WebSocket**: Native WebSocket for real-time communication

### Development Tools
- **Build Tools**: Vite for development and production builds
- **Type Checking**: TypeScript with strict mode enabled
- **Code Quality**: ESLint and Prettier configurations
- **Database Migrations**: Drizzle Kit for schema management

## Deployment Strategy

### Development Environment
- Frontend served by Vite development server with HMR
- Backend runs with tsx for TypeScript execution
- Database migrations applied via `drizzle-kit push`
- WebSocket server integrated with HTTP server

### Production Build
- Frontend built as static assets with Vite
- Backend bundled with esbuild for Node.js execution
- Database schema deployed via Drizzle migrations
- Single server deployment with static file serving

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Development vs production mode detection
- Replit-specific optimizations for cloud deployment

The system is architected for scalability and maintainability, with clear separation of concerns and modern development practices throughout the stack.