#!/bin/bash

# ChittyPro Streamlink - White Label Builder
# Creates a white-label build without Chitty branding

set -e

BRAND=${1:-derail}
CONFIG_FILE="config/whitelabel-${BRAND}.json"

echo "🏷️  Building White Label Version: $BRAND"
echo "=================================================="

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration not found: $CONFIG_FILE"
    exit 1
fi

echo "✅ Configuration found: $CONFIG_FILE"

# Load configuration
BRAND_NAME=$(jq -r '.whitelabel.name' "$CONFIG_FILE")
SHORT_NAME=$(jq -r '.whitelabel.shortName' "$CONFIG_FILE")
TAGLINE=$(jq -r '.whitelabel.tagline' "$CONFIG_FILE")
HIDE_CHITTY=$(jq -r '.whitelabel.branding.hideChittyBranding' "$CONFIG_FILE")

echo ""
echo "📋 Build Configuration:"
echo "   Brand: $BRAND_NAME"
echo "   Short Name: $SHORT_NAME"
echo "   Tagline: $TAGLINE"
echo "   Hide Chitty Branding: $HIDE_CHITTY"
echo ""

# Create white-label build directory
BUILD_DIR="dist/whitelabel-${BRAND}"
mkdir -p "$BUILD_DIR"

# Set environment variables
export VITE_WHITELABEL_CONFIG="$CONFIG_FILE"
export VITE_BRAND_NAME="$BRAND_NAME"
export VITE_SHORT_NAME="$SHORT_NAME"
export VITE_TAGLINE="$TAGLINE"
export VITE_HIDE_CHITTY_BRANDING="$HIDE_CHITTY"

# Build the application
echo "🔨 Building application..."
npm run build

# Copy build to white-label directory
echo "📦 Creating white-label package..."
cp -r dist/* "$BUILD_DIR/"

# Copy white-label config
cp "$CONFIG_FILE" "$BUILD_DIR/whitelabel-config.json"

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf "whitelabel-${BRAND}-$(date +%Y%m%d).tar.gz" -C dist "whitelabel-${BRAND}"

echo ""
echo "✅ White Label Build Complete!"
echo ""
echo "📁 Build directory: $BUILD_DIR"
echo "📦 Package: whitelabel-${BRAND}-$(date +%Y%m%d).tar.gz"
echo ""
echo "🚀 Deploy with:"
echo "   scp whitelabel-${BRAND}-*.tar.gz user@derail.me:~/"
echo "   ssh user@derail.me 'tar -xzf whitelabel-${BRAND}-*.tar.gz'"
echo ""