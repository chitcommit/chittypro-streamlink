#!/bin/bash

# Deployment Verification Script
# Tests the deployed ChittyPro Streamlink application

set -e

HOST=${1:-derail.me}
PROTOCOL=${2:-https}

echo "🔍 Verifying ChittyPro Streamlink deployment at $PROTOCOL://$HOST"
echo ""

# Function to test endpoint
test_endpoint() {
    local path=$1
    local description=$2
    local expected_status=${3:-200}

    echo -n "Testing $description... "

    status=$(curl -s -o /dev/null -w "%{http_code}" "$PROTOCOL://$HOST$path" --max-time 10)

    if [ "$status" = "$expected_status" ]; then
        echo "✅ $status"
    else
        echo "❌ $status (expected $expected_status)"
        return 1
    fi
}

# Test main application
echo "🌍 Frontend Tests"
test_endpoint "/" "Main application"
test_endpoint "/login" "Login page"

# Test API endpoints
echo ""
echo "🔧 API Tests"
test_endpoint "/api/health" "Health check"
test_endpoint "/api/ready" "Readiness check"
test_endpoint "/api/live" "Liveness check"
test_endpoint "/api/cameras" "Cameras API"

# Test WebSocket availability
echo ""
echo "🔌 WebSocket Test"
echo -n "Testing WebSocket connectivity... "
if timeout 5 bash -c "</dev/tcp/$HOST/443" 2>/dev/null; then
    echo "✅ Port accessible"
else
    echo "❌ Connection failed"
fi

# Test SSL certificate
echo ""
echo "🔒 SSL Certificate Test"
echo -n "Checking SSL certificate... "
if [ "$PROTOCOL" = "https" ]; then
    expiry_date=$(echo | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

    if [ $days_until_expiry -gt 0 ]; then
        echo "✅ Valid ($days_until_expiry days remaining)"
    else
        echo "⚠️ Expires soon or expired"
    fi
else
    echo "⚠️ HTTP only (no SSL)"
fi

# Performance test
echo ""
echo "⚡ Performance Test"
echo -n "Measuring response time... "
response_time=$(curl -o /dev/null -s -w "%{time_total}" "$PROTOCOL://$HOST")
echo "${response_time}s"

if (( $(echo "$response_time > 3.0" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠️ Slow response time"
else
    echo "✅ Good response time"
fi

# Database connectivity (indirect test via API)
echo ""
echo "🗄️ Database Connectivity Test"
echo -n "Testing database via API... "
api_response=$(curl -s "$PROTOCOL://$HOST/api/cameras" --max-time 10)
if echo "$api_response" | grep -q "\\[" || echo "$api_response" | grep -q "id"; then
    echo "✅ Database accessible"
else
    echo "❌ Database connectivity issue"
fi

echo ""
echo "🎯 Deployment Verification Complete"
echo ""
echo "📊 Quick Stats:"
echo "   URL: $PROTOCOL://$HOST"
echo "   Response Time: ${response_time}s"
if [ "$PROTOCOL" = "https" ]; then
    echo "   SSL Expiry: $days_until_expiry days"
fi
echo ""
echo "🔗 Useful Links:"
echo "   Application: $PROTOCOL://$HOST"
echo "   Health Check: $PROTOCOL://$HOST/api/health"
echo "   GitHub Actions: https://github.com/chitcommit/chittypro-streamlink/actions"