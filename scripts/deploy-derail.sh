#!/bin/bash

# Deployment script for ChittyPro Streamlink to derail.me
# Supports various deployment methods for the derail.me domain

set -e

# Configuration
DOMAIN="derail.me"
APP_NAME="chittypro-streamlink"
BACKUP_DIR="/var/backups/chittypro"
LOG_FILE="/var/log/chittypro-deploy.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if running as appropriate user
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root. Consider using a dedicated deployment user."
    fi
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."

    sudo mkdir -p "$BACKUP_DIR" || warn "Could not create backup directory"
    sudo mkdir -p /var/log || warn "Could not create log directory"
    mkdir -p ~/.chittypro/config
    mkdir -p ./recordings
    mkdir -p ./uploads
    mkdir -p ./dist
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."

    # Update package list
    if command -v apt-get &> /dev/null; then
        sudo apt-get update

        # Install Node.js 18+ if not present
        if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi

        # Install FFmpeg for streaming
        sudo apt-get install -y ffmpeg

        # Install PostgreSQL if not present
        if ! command -v psql &> /dev/null; then
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl enable postgresql
            sudo systemctl start postgresql
        fi

        # Install Nginx for reverse proxy
        if ! command -v nginx &> /dev/null; then
            sudo apt-get install -y nginx
            sudo systemctl enable nginx
        fi

        # Install Certbot for SSL
        if ! command -v certbot &> /dev/null; then
            sudo apt-get install -y certbot python3-certbot-nginx
        fi

    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum update -y

        # Install Node.js
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs ffmpeg postgresql postgresql-server nginx certbot python3-certbot-nginx

    else
        warn "Package manager not recognized. Please install dependencies manually:"
        echo "- Node.js 18+"
        echo "- FFmpeg"
        echo "- PostgreSQL"
        echo "- Nginx"
        echo "- Certbot"
    fi
}

# Setup database
setup_database() {
    log "Setting up PostgreSQL database..."

    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE chittypro_production;
CREATE USER chittypro WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE chittypro_production TO chittypro;
\\q
EOF

    log "Database setup completed"
}

# Build application
build_application() {
    log "Building application..."

    # Install dependencies
    npm ci --production=false

    # Build the application
    npm run build

    log "Application build completed"
}

# Setup Nginx reverse proxy
setup_nginx() {
    log "Setting up Nginx configuration..."

    sudo tee /etc/nginx/sites-available/derail.me << EOF
server {
    listen 80;
    server_name derail.me www.derail.me;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name derail.me www.derail.me;

    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/derail.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/derail.me/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket streaming endpoint
    location /stream {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }

    # API endpoints
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files (if serving directly)
    location /static {
        alias /var/www/chittypro/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/derail.me /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Test nginx configuration
    sudo nginx -t

    log "Nginx configuration completed"
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate..."

    # Stop nginx temporarily
    sudo systemctl stop nginx

    # Get SSL certificate
    sudo certbot certonly --standalone -d derail.me -d www.derail.me --email admin@derail.me --agree-tos --non-interactive

    # Start nginx
    sudo systemctl start nginx

    # Setup auto-renewal
    sudo crontab -l | grep -v certbot | sudo tee /tmp/crontab.tmp > /dev/null
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo tee -a /tmp/crontab.tmp > /dev/null
    sudo crontab /tmp/crontab.tmp
    rm /tmp/crontab.tmp

    log "SSL certificate setup completed"
}

# Setup PM2 process manager
setup_pm2() {
    log "Setting up PM2 process manager..."

    # Install PM2 globally
    sudo npm install -g pm2

    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chittypro-streamlink',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/chittypro-error.log',
    out_file: '/var/log/chittypro-out.log',
    log_file: '/var/log/chittypro-combined.log',
    time: true
  }]
}
EOF

    log "PM2 configuration completed"
}

# Deploy application
deploy_app() {
    log "Deploying application..."

    # Copy production environment
    cp .env.production .env

    # Update database schema
    npm run db:push

    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup

    log "Application deployment completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."

    # Create monitoring script
    cat > monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script for ChittyPro Streamlink

check_service() {
    if pm2 list | grep -q "chittypro-streamlink.*online"; then
        echo "✓ Application is running"
    else
        echo "✗ Application is down - restarting..."
        pm2 restart chittypro-streamlink
    fi
}

check_disk() {
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 85 ]; then
        echo "⚠ Disk usage is high: ${usage}%"
        # Clean old recordings
        find ./recordings -name "*.mp4" -mtime +7 -delete 2>/dev/null || true
    fi
}

check_service
check_disk
EOF

    chmod +x monitor.sh

    # Add monitoring to crontab
    (crontab -l 2>/dev/null || true; echo "*/5 * * * * $(pwd)/monitor.sh >> /var/log/chittypro-monitor.log 2>&1") | crontab -

    log "Monitoring setup completed"
}

# Backup current deployment
backup_current() {
    if [ -f "package.json" ]; then
        log "Creating backup of current deployment..."
        backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r . "$BACKUP_DIR/$backup_name" 2>/dev/null || warn "Could not create full backup"
        log "Backup created: $BACKUP_DIR/$backup_name"
    fi
}

# Show deployment status
show_status() {
    echo ""
    info "🚀 ChittyPro Streamlink Deployment Status"
    echo ""

    # Check application
    if pm2 list | grep -q "chittypro-streamlink.*online"; then
        echo "✅ Application: Running"
    else
        echo "❌ Application: Stopped"
    fi

    # Check nginx
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx: Running"
    else
        echo "❌ Nginx: Stopped"
    fi

    # Check SSL
    if sudo certbot certificates | grep -q "derail.me"; then
        echo "✅ SSL Certificate: Installed"
    else
        echo "❌ SSL Certificate: Not found"
    fi

    # Check database
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw chittypro_production; then
        echo "✅ Database: Available"
    else
        echo "❌ Database: Not found"
    fi

    echo ""
    echo "🌐 Access your application at: https://derail.me"
    echo "📊 Monitor logs with: pm2 logs chittypro-streamlink"
    echo "🔧 Manage app with: pm2 restart/stop/start chittypro-streamlink"
    echo ""
}

# Main deployment function
deploy_full() {
    log "Starting full deployment to derail.me..."

    check_permissions
    backup_current
    setup_directories
    install_dependencies
    setup_database
    build_application
    setup_nginx
    setup_ssl
    setup_pm2
    deploy_app
    setup_monitoring

    log "✅ Deployment completed successfully!"
    show_status
}

# Quick update function
quick_update() {
    log "Performing quick update..."

    backup_current
    build_application
    pm2 restart chittypro-streamlink

    log "✅ Quick update completed!"
}

# Main execution
case "${1:-full}" in
    "full")
        deploy_full
        ;;
    "update")
        quick_update
        ;;
    "status")
        show_status
        ;;
    "ssl")
        setup_ssl
        ;;
    "nginx")
        setup_nginx
        sudo systemctl reload nginx
        ;;
    "logs")
        pm2 logs chittypro-streamlink
        ;;
    *)
        echo "ChittyPro Streamlink Deployment Script for derail.me"
        echo ""
        echo "Usage: $0 {full|update|status|ssl|nginx|logs}"
        echo ""
        echo "Commands:"
        echo "  full    - Complete deployment setup (default)"
        echo "  update  - Quick application update"
        echo "  status  - Show deployment status"
        echo "  ssl     - Setup/renew SSL certificate"
        echo "  nginx   - Update nginx configuration"
        echo "  logs    - Show application logs"
        echo ""
        exit 1
        ;;
esac