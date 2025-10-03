#!/bin/bash

# ChittyPro Streamlink - Cloudflare Workers Deployment
# Quick serverless deployment to Cloudflare's edge network

set -e

echo "🚀 ChittyPro Streamlink - Cloudflare Workers Deployment"
echo "========================================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI already installed"
fi

# Check Cloudflare authentication
echo ""
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
else
    echo "✅ Already logged in to Cloudflare"
fi

# Create D1 database if it doesn't exist
echo ""
echo "🗄️ Setting up Cloudflare D1 database..."
echo "Creating chittypro_streamlink database..."
wrangler d1 create chittypro_streamlink || echo "Database may already exist"

# Get database ID
DB_ID=$(wrangler d1 list | grep chittypro_streamlink | awk '{print $2}' || echo "")

if [ -z "$DB_ID" ]; then
    echo "⚠️  Please create D1 database manually:"
    echo "   wrangler d1 create chittypro_streamlink"
    echo "   Then update wrangler.toml with the database_id"
else
    echo "✅ Database ID: $DB_ID"
fi

# Create wrangler configuration
echo ""
echo "📝 Creating Wrangler configuration..."
cat > wrangler.toml << EOF
name = "chittypro-streamlink"
main = "server/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

[build]
command = "npm run build"

# Production environment
[env.production]
name = "chittypro-streamlink"
vars = { NODE_ENV = "production" }

# Use subdomain or path - uncomment one:
# Option 1: Subdomain (recommended)
# route = { pattern = "stream.derail.me/*", zone_name = "derail.me" }

# Option 2: Path-based
route = { pattern = "derail.me/cameras/*", zone_name = "derail.me" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "chittypro_streamlink"
database_id = "$DB_ID"

[[env.production.durable_objects.bindings]]
name = "STREAMING"
class_name = "StreamingDurableObject"
script_name = "chittypro-streamlink"

# KV for session storage
[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = ""  # Will be created

# Secrets (set with: wrangler secret put <NAME>)
# JWT_SECRET
# SESSION_SECRET
# DATABASE_URL (for external PostgreSQL if needed)
EOF

echo "✅ Wrangler configuration created"

# Create KV namespace for sessions
echo ""
echo "🗂️ Creating KV namespace for sessions..."
wrangler kv:namespace create SESSIONS || echo "KV namespace may already exist"

# Initialize database schema
echo ""
echo "📋 Initializing database schema..."
cat > migrations/0001_init.sql << 'EOF'
-- ChittyPro Streamlink Database Schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    streamUrl TEXT NOT NULL,
    type TEXT,
    location TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guestSessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    createdBy TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shareLinks (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    cameraId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    expiresAt TEXT,
    maxUses INTEGER,
    currentUses INTEGER DEFAULT 0,
    revoked INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    cameraId TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT,
    fileUrl TEXT,
    size INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_cameras_name ON cameras(name);
CREATE INDEX IF NOT EXISTS idx_guestsessions_token ON guestSessions(token);
CREATE INDEX IF NOT EXISTS idx_sharelinks_token ON shareLinks(token);
CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(cameraId);

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT OR IGNORE INTO users (id, username, password, role, email)
VALUES ('admin-1', 'admin', '$2a$10$rXKqF5Ku7LYX4cQJ5YGO8uZ7zQj1xKQ5Z1wJ4R3yH5L6Xc9jVw8/K', 'owner', 'admin@derail.me');
EOF

# Apply migrations
if [ -n "$DB_ID" ]; then
    echo "Applying database migrations..."
    wrangler d1 execute chittypro_streamlink --file=migrations/0001_init.sql --remote || echo "Migrations may already be applied"
fi

# Set secrets
echo ""
echo "🔐 Setting up secrets..."
echo "Please set the following secrets:"
echo ""
echo "  wrangler secret put JWT_SECRET --env production"
echo "  wrangler secret put SESSION_SECRET --env production"
echo ""
read -p "Would you like to generate and set secrets now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)

    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env production
    echo "$SESSION_SECRET" | wrangler secret put SESSION_SECRET --env production

    echo "✅ Secrets configured"
fi

# Build the application
echo ""
echo "🔨 Building application..."
npm run build

# Deploy to Cloudflare Workers
echo ""
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy --env production

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌍 Your application should be available at:"
echo "   https://derail.me/cameras/"
echo "   or https://stream.derail.me/ (if using subdomain)"
echo ""
echo "📊 Monitor at:"
echo "   https://dash.cloudflare.com/"
echo ""
echo "🔧 Useful commands:"
echo "   wrangler tail --env production           # View logs"
echo "   wrangler deploy --env production         # Redeploy"
echo "   wrangler d1 execute chittypro_streamlink --command \"SELECT * FROM users\" # Query database"
echo ""
echo "🎉 ChittyPro Streamlink is now live on Cloudflare's edge network!"