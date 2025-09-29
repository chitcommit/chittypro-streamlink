# Manual Deployment Instructions for ChittyPro Streamlink

Since direct SSH access to derail.me is not available from this environment, here are the step-by-step manual instructions to complete the deployment:

## 1. Server Access Setup

### Step 1.1: Access your derail.me server
You'll need to access your derail.me server through your hosting provider's console, SSH from another location, or direct server access.

### Step 1.2: Add SSH Public Key
Once you have access to the server, add the SSH public key to enable GitHub Actions deployment:

```bash
# Switch to deploy user (create if doesn't exist)
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy

# Set up SSH directory
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh

# Add your public key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOtnF9WTEKbTJKS1bjqtqn6c4zot2iqsAMXLLxDk2Mi/ deploy@derail.me" | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys

# Set correct permissions
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

## 2. Server Preparation

### Step 2.1: Copy and run the server setup script
```bash
# Download the setup script
wget https://raw.githubusercontent.com/chitcommit/chittypro-streamlink/main/scripts/setup-server.sh

# Make it executable and run
chmod +x setup-server.sh
sudo ./setup-server.sh
```

### Step 2.2: Manual server setup (if script fails)
If the automated script doesn't work, run these commands manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required packages
sudo apt install -y postgresql postgresql-contrib nginx pm2 ffmpeg git curl wget htop ufw

# Create application directory
sudo mkdir -p /var/www/chittypro-streamlink
sudo chown deploy:deploy /var/www/chittypro-streamlink

# Set up database
sudo -u postgres createdb chittypro_streamlink
sudo -u postgres createuser streamlink
sudo -u postgres psql -c "ALTER USER streamlink WITH ENCRYPTED PASSWORD 'streamlink123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chittypro_streamlink TO streamlink;"

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Install PM2 globally
sudo npm install -g pm2
```

## 3. GitHub Secrets Configuration

### Step 3.1: Set up GitHub repository secrets
You need to configure these secrets in your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add these repository secrets:

```
PRODUCTION_HOST=derail.me
PRODUCTION_USER=deploy
PRODUCTION_PORT=22
PRODUCTION_SSH_KEY=[Your private SSH key content - the counterpart to the public key added above]

# Database
DATABASE_URL=postgresql://streamlink:streamlink123@localhost:5432/chittypro_streamlink

# Security (generate random values)
JWT_SECRET=[Generate with: openssl rand -base64 32]
SESSION_SECRET=[Generate with: openssl rand -base64 32]
ALLOWED_ORIGINS=https://derail.me,https://www.derail.me

# Optional
SLACK_WEBHOOK_URL=[Optional: for deployment notifications]
```

### Step 3.2: Generate SSH Key Pair (if needed)
If you don't have an SSH key pair:

```bash
# Generate a new key pair
ssh-keygen -t ed25519 -C "deploy@derail.me" -f ~/.ssh/deploy_derail

# Use the public key (deploy_derail.pub) for the server
# Use the private key (deploy_derail) for GitHub secret PRODUCTION_SSH_KEY
```

## 4. SSL Certificate Setup

### Step 4.1: Get Let's Encrypt certificate
On your server, run:

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate for derail.me
sudo certbot --nginx -d derail.me -d www.derail.me --email admin@derail.me --agree-tos --non-interactive
```

## 5. Deploy Application

### Step 5.1: First-time manual deployment
```bash
# Switch to deploy user
sudo -u deploy -i

# Navigate to app directory
cd /var/www/chittypro-streamlink

# Clone repository
git clone https://github.com/chitcommit/chittypro-streamlink.git .

# Install dependencies
npm ci --production

# Build application
npm run build

# Copy environment
cp .env.production .env

# Update database schema
npm run db:push

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 5.2: Test the deployment
```bash
# Check if application is running
pm2 status

# Check nginx
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3000/api/health
curl https://derail.me/api/health
```

## 6. Automated Deployment Setup

### Step 6.1: Verify GitHub Actions
Once the manual setup is complete:

1. Push changes to the main branch
2. Monitor deployment at: https://github.com/chitcommit/chittypro-streamlink/actions
3. The GitHub Action should automatically deploy to your server

### Step 6.2: Manual deployment trigger
You can also trigger deployment manually:

1. Go to GitHub Actions tab
2. Select "Deploy to derail.me" workflow
3. Click "Run workflow"

## 7. Verification Steps

### Step 7.1: Check application health
```bash
# On the server
pm2 logs chittypro-streamlink
sudo tail -f /var/log/nginx/access.log
curl -I https://derail.me
```

### Step 7.2: Test functionality
1. Open https://derail.me in your browser
2. Verify the login page loads
3. Test camera streaming functionality
4. Check that WebSocket connections work

## 8. Monitoring and Maintenance

### Step 8.1: Set up monitoring
```bash
# Add monitoring cron job
echo "*/5 * * * * /home/deploy/monitor.sh >> /var/log/chittypro-monitor.log 2>&1" | crontab -
```

### Step 8.2: Log locations
- Application logs: `pm2 logs chittypro-streamlink`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- Deployment logs: `/var/log/chittypro-deploy.log`

## Troubleshooting

### Common Issues:

1. **SSH connection fails**: Check firewall settings, ensure port 22 is open
2. **SSL certificate fails**: Verify DNS is pointing to your server
3. **Application won't start**: Check logs with `pm2 logs chittypro-streamlink`
4. **Database errors**: Verify PostgreSQL is running and credentials are correct
5. **Nginx errors**: Check configuration with `sudo nginx -t`

### Emergency commands:
```bash
# Restart everything
sudo systemctl restart nginx
pm2 restart all

# Check all services
sudo systemctl status nginx postgresql
pm2 status

# View recent logs
sudo journalctl -u nginx -f
pm2 logs --lines 50
```

## Success Indicators

✅ SSH access working with deploy user
✅ Server setup script completed successfully
✅ SSL certificate installed and working
✅ Application running on PM2
✅ Nginx proxying requests correctly
✅ GitHub Actions deployment successful
✅ https://derail.me loads without errors
✅ Camera streaming functionality works

Once all these steps are completed, your ChittyPro Streamlink application will be live at https://derail.me!