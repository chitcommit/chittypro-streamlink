#!/bin/bash

# Free Deployment Script for ChittyPro Streamlink
# Supports Railway, Render, Fly.io, and self-hosted options

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

# Check if required tools are installed
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is not installed. Please install it first."
    fi
}

# Deploy to Railway
deploy_railway() {
    log "Deploying to Railway..."

    if ! command -v railway &> /dev/null; then
        warn "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi

    # Login if not authenticated
    if ! railway whoami &> /dev/null; then
        log "Please login to Railway:"
        railway login
    fi

    # Initialize project if needed
    if [ ! -f "railway.toml" ]; then
        error "railway.toml not found!"
    fi

    # Create project and deploy
    railway link || railway create chittypro-streamlink
    railway add postgresql
    railway up

    log "✓ Railway deployment completed!"
    log "Check your dashboard: https://railway.app/dashboard"
}

# Deploy to Render
deploy_render() {
    log "Deploying to Render..."

    if [ ! -f "render.yaml" ]; then
        error "render.yaml not found!"
    fi

    info "Manual steps for Render deployment:"
    echo "1. Push your code to GitHub"
    echo "2. Go to https://render.com/"
    echo "3. Connect your GitHub repository"
    echo "4. Render will automatically detect render.yaml"
    echo "5. Click 'Deploy'"
    echo ""
    echo "Or use Render CLI if you have it configured"
}

# Deploy to Fly.io
deploy_fly() {
    log "Deploying to Fly.io..."

    if ! command -v flyctl &> /dev/null; then
        warn "Fly CLI not found. Installing..."
        curl -L https://fly.io/install.sh | sh
        export PATH="$HOME/.fly/bin:$PATH"
    fi

    # Login if not authenticated
    if ! flyctl auth whoami &> /dev/null; then
        log "Please login to Fly.io:"
        flyctl auth login
    fi

    # Launch if not exists, otherwise deploy
    if [ ! -f "fly.toml" ]; then
        error "fly.toml not found!"
    fi

    if ! flyctl status &> /dev/null; then
        flyctl launch --no-deploy
    fi

    # Create PostgreSQL database
    flyctl postgres create --name chittypro-db --region ord || true
    flyctl postgres attach chittypro-db

    # Deploy
    flyctl deploy

    log "✓ Fly.io deployment completed!"
    log "Check your app: https://$(flyctl info -j | jq -r .Hostname)"
}

# Self-hosted deployment helper
deploy_selfhosted() {
    log "Setting up for self-hosted deployment..."

    info "Requirements:"
    echo "- Node.js 18+"
    echo "- PostgreSQL database"
    echo "- PM2 for process management (optional)"
    echo ""

    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        warn "Installing PM2 for process management..."
        npm install -g pm2
    fi

    # Build the application
    log "Building application..."
    npm run build

    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chittypro-streamlink',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

    log "✓ Self-hosted setup completed!"
    echo ""
    info "Next steps:"
    echo "1. Set up your PostgreSQL database"
    echo "2. Copy .env.example to .env and configure DATABASE_URL"
    echo "3. Run: npm run db:push"
    echo "4. Start with: pm2 start ecosystem.config.js"
    echo "5. Save PM2 config: pm2 save && pm2 startup"
}

# Oracle Cloud setup helper
setup_oracle_cloud() {
    log "Oracle Cloud Always Free Tier setup helper..."

    info "Steps to deploy on Oracle Cloud:"
    echo "1. Create Oracle Cloud account"
    echo "2. Create VM instance (Always Free eligible)"
    echo "3. Choose Ubuntu 22.04 ARM"
    echo "4. Configure security groups (port 5000, 22)"
    echo "5. SSH to instance and run this script with 'selfhosted'"
    echo ""
    echo "Instance setup commands:"
    echo "sudo apt update && sudo apt upgrade -y"
    echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "sudo apt-get install -y nodejs postgresql postgresql-contrib"
    echo "sudo systemctl enable postgresql && sudo systemctl start postgresql"
    echo ""
    echo "Then clone your repo and run: ./scripts/deploy-free.sh selfhosted"
}

# Display deployment options
show_options() {
    echo ""
    echo "🚀 ChittyPro Streamlink - Free Deployment Options"
    echo ""
    echo "Choose your deployment platform:"
    echo ""
    echo "1. Railway    - Easy, $5 credit/month, PostgreSQL included"
    echo "2. Render     - Free tier, auto-sleep after 15min"
    echo "3. Fly.io     - $5 credit/month, global edge"
    echo "4. Self-hosted- Oracle/Google Cloud free tiers"
    echo "5. Oracle Cloud Setup Helper"
    echo ""
    echo "Usage: $0 {railway|render|fly|selfhosted|oracle-setup}"
    echo ""
}

# Main execution
case "${1:-help}" in
    "railway")
        deploy_railway
        ;;
    "render")
        deploy_render
        ;;
    "fly")
        deploy_fly
        ;;
    "selfhosted")
        deploy_selfhosted
        ;;
    "oracle-setup")
        setup_oracle_cloud
        ;;
    *)
        show_options
        ;;
esac