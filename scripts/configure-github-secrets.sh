#!/bin/bash

# GitHub Secrets Configuration Script
# Automates setting up GitHub repository secrets for CI/CD deployment

set -e

echo "🔐 Configuring GitHub Repository Secrets for ChittyPro Streamlink"
echo "Repository: chitcommit/chittypro-streamlink"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install it first:"
    echo "   macOS: brew install gh"
    echo "   Linux: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub CLI first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    local description=$2
    local default_value=$3

    echo "Setting $name - $description"

    if [ -n "$default_value" ]; then
        read -p "Enter $name [$default_value]: " value
        value=${value:-$default_value}
    else
        read -p "Enter $name: " value
    fi

    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo "✅ $name set successfully"
    else
        echo "⚠️ Skipping $name (empty value)"
    fi
    echo ""
}

# Set production server secrets
echo "🖥️ Production Server Configuration"
set_secret "PRODUCTION_HOST" "Production server hostname" "derail.me"
set_secret "PRODUCTION_USER" "SSH username for deployment" "deploy"
set_secret "PRODUCTION_PORT" "SSH port" "22"

echo "🔑 SSH Private Key"
echo "For PRODUCTION_SSH_KEY, you need your private SSH key content."
echo "Generate with: ssh-keygen -t ed25519 -C 'deploy@derail.me'"
echo ""
read -p "Path to your private SSH key [~/.ssh/id_ed25519]: " ssh_key_path
ssh_key_path=${ssh_key_path:-~/.ssh/id_ed25519}

if [ -f "$ssh_key_path" ]; then
    gh secret set PRODUCTION_SSH_KEY < "$ssh_key_path"
    echo "✅ PRODUCTION_SSH_KEY set successfully"
else
    echo "⚠️ SSH key file not found at $ssh_key_path"
    echo "Please set PRODUCTION_SSH_KEY manually in GitHub"
fi
echo ""

# Generate and set authentication secrets
echo "🔐 Authentication Configuration"
jwt_secret=$(openssl rand -base64 32)
session_secret=$(openssl rand -base64 32)

echo "$jwt_secret" | gh secret set JWT_SECRET
echo "✅ JWT_SECRET generated and set"

echo "$session_secret" | gh secret set SESSION_SECRET
echo "✅ SESSION_SECRET generated and set"
echo ""

# Database configuration
echo "🗄️ Database Configuration"
set_secret "DATABASE_URL" "PostgreSQL connection string" "postgresql://streamlink:streamlink123@localhost:5432/chittypro_streamlink"

# Security configuration
echo "🔒 Security Configuration"
set_secret "ALLOWED_ORIGINS" "Allowed CORS origins" "https://derail.me,https://www.derail.me"

# Optional integrations
echo "🔗 Optional Integrations"
echo "Press Enter to skip optional secrets"
set_secret "SLACK_WEBHOOK_URL" "Slack notifications webhook (optional)" ""
set_secret "HEALTH_CHECK_WEBHOOK" "Health check webhook (optional)" ""

# Google Drive integration
echo "☁️ Google Drive Integration (Optional)"
set_secret "GDRIVE_CLIENT_ID" "Google Drive client ID (optional)" ""
set_secret "GDRIVE_CLIENT_SECRET" "Google Drive client secret (optional)" ""
set_secret "GDRIVE_REFRESH_TOKEN" "Google Drive refresh token (optional)" ""
set_secret "GDRIVE_FOLDER_ID" "Google Drive folder ID (optional)" ""

echo "✅ GitHub secrets configuration complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Run the server setup script on your production server:"
echo "   scp scripts/setup-server.sh deploy@derail.me:~/"
echo "   ssh deploy@derail.me"
echo "   chmod +x setup-server.sh && ./setup-server.sh"
echo ""
echo "2. Add your SSH public key to the server:"
echo "   ssh-copy-id deploy@derail.me"
echo ""
echo "3. Test deployment by pushing to main branch:"
echo "   git push origin main"
echo ""
echo "4. Monitor deployment at:"
echo "   https://github.com/chitcommit/chittypro-streamlink/actions"
echo ""
echo "🌍 Your CI/CD pipeline is ready!"