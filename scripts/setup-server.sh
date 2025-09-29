#!/bin/bash

# ChittyPro Streamlink Server Setup Script
# For Ubuntu/Debian servers (including derail.me)
# Run this script on your production server to prepare for CI/CD deployment

set -e

echo "🚀 Setting up ChittyPro Streamlink production server..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "🟢 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Install FFmpeg for streaming
echo "🎥 Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install additional tools
echo "🔧 Installing additional tools..."
sudo apt install -y git curl wget htop ufw

# Create deploy user if it doesn't exist
if ! id "deploy" &>/dev/null; then
    echo "👤 Creating deploy user..."
    sudo adduser --disabled-password --gecos "" deploy
    sudo usermod -aG sudo deploy

    # Set up SSH directory for deploy user
    sudo -u deploy mkdir -p /home/deploy/.ssh
    sudo -u deploy chmod 700 /home/deploy/.ssh
    sudo -u deploy touch /home/deploy/.ssh/authorized_keys
    sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys

    echo "✅ Deploy user created. Add your public SSH key to /home/deploy/.ssh/authorized_keys"
else
    echo "✅ Deploy user already exists"
fi

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/chittypro-streamlink
sudo chown deploy:deploy /var/www/chittypro-streamlink

# Set up PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE chittypro_streamlink;" || echo "Database may already exist"
sudo -u postgres psql -c "CREATE USER streamlink WITH PASSWORD 'streamlink123';" || echo "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chittypro_streamlink TO streamlink;"

# Configure Nginx
echo "🌍 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/chittypro-streamlink > /dev/null <<EOF
server {
    listen 80;
    server_name derail.me www.derail.me;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name derail.me www.derail.me;

    # SSL configuration (Let's Encrypt certificates)
    ssl_certificate /etc/letsencrypt/live/derail.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/derail.me/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Serve static files
    location /assets/ {
        alias /var/www/chittypro-streamlink/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket proxy for streaming
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend app
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/chittypro-streamlink /etc/nginx/sites-enabled/
sudo nginx -t

# Install Certbot for Let's Encrypt SSL
echo "🔒 Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Configure firewall
echo "🔥 Configuring UFW firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Set up PM2 startup
echo "🔄 Configuring PM2 startup..."
sudo pm2 startup systemd -u deploy --hp /home/deploy
sudo systemctl enable pm2-deploy

# Create environment file template
echo "📝 Creating environment file template..."
sudo -u deploy tee /var/www/chittypro-streamlink/.env.example > /dev/null <<EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://streamlink:streamlink123@localhost:5432/chittypro_streamlink

# Authentication
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# Security
ALLOWED_ORIGINS=https://derail.me,https://www.derail.me

# Optional: Google Drive Integration
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
GDRIVE_REFRESH_TOKEN=
GDRIVE_FOLDER_ID=
EOF

# Create log directories
echo "📋 Setting up log directories..."
sudo mkdir -p /var/log/chittypro-streamlink
sudo chown deploy:deploy /var/log/chittypro-streamlink

echo "✅ Server setup complete!"
echo ""
echo "🔑 Next steps:"
echo "1. Add your SSH public key to /home/deploy/.ssh/authorized_keys"
echo "2. Configure environment variables in /var/www/chittypro-streamlink/.env"
echo "3. Obtain SSL certificate: sudo certbot --nginx -d derail.me -d www.derail.me"
echo "4. Test SSH access: ssh deploy@derail.me"
echo "5. Configure GitHub secrets and push to deploy"
echo ""
echo "🌍 Your server is ready for ChittyPro Streamlink deployment!"