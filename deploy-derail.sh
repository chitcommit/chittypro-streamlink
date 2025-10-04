#!/bin/bash
set -e

# ChittyPro Streamlink - Derail.me Deployment Script
# This script sets up and runs the camera system for derail.me

echo "🎬 ChittyPro Streamlink - Derail.me Integration"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the chittypro-streamlink directory"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Killing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Check Node.js version
echo -e "\n${BLUE}📦 Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env created${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env with your database credentials${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found, creating basic .env...${NC}"
        cat > .env << EOF
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/chittypro
EOF
        echo -e "${GREEN}✅ Basic .env created${NC}"
    fi
fi

# Check dependencies
echo -e "\n${BLUE}📚 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Build the project
echo -e "\n${BLUE}🔨 Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Build complete${NC}"

# Check if port 3001 is in use
echo -e "\n${BLUE}🔍 Checking port 3001...${NC}"
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 is in use${NC}"
    read -p "Kill existing process? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3001
        echo -e "${GREEN}✅ Port 3001 freed${NC}"
    else
        echo -e "${RED}❌ Cannot start server on port 3001${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Port 3001 is available${NC}"
fi

# Start the server
echo -e "\n${BLUE}🚀 Starting ChittyPro Streamlink server...${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Camera System: ${GREEN}http://localhost:3001${NC}"
echo -e "API Endpoint: ${GREEN}http://localhost:3001/api/cameras${NC}"
echo -e "White-label Config: ${GREEN}http://localhost:3001/config/whitelabel-derail.json${NC}"
echo -e "WebSocket: ${GREEN}ws://localhost:3001/ws${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}📝 Integration Notes:${NC}"
echo "   • Configured for derail.me branding"
echo "   • Chat disabled (per derail.me config)"
echo "   • Running on port 3001"
echo "   • Derail.me server should proxy to this service"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop the server${NC}"
echo ""

PORT=3001 npm run start
