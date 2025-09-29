#!/bin/bash

# ChittyPro Streamlink Deployment Dashboard
# Real-time monitoring of your production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="chitcommit/chittypro-streamlink"
PRODUCTION_URL="https://derail.me"
API_BASE="$PRODUCTION_URL/api"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                   ChittyPro Streamlink Deployment Dashboard                ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check service status
check_status() {
    local url=$1
    local name=$2

    if curl -s -f -o /dev/null --max-time 5 "$url"; then
        echo -e "  ${GREEN}✓${NC} $name"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name"
        return 1
    fi
}

# Function to get response time
get_response_time() {
    local url=$1
    local time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 5 "$url" 2>/dev/null || echo "N/A")

    if [ "$time" != "N/A" ]; then
        printf "%.2fs" "$time"
    else
        echo "N/A"
    fi
}

# Function to check GitHub Actions
check_github_actions() {
    echo -e "${YELLOW}📊 GitHub Actions Status${NC}"

    if command -v gh &> /dev/null; then
        # Get latest workflow runs
        runs=$(gh run list -R "$GITHUB_REPO" --limit 5 --json status,name,createdAt,conclusion 2>/dev/null || echo "[]")

        if [ "$runs" != "[]" ]; then
            echo "$runs" | jq -r '.[] | "  \(.conclusion // .status) - \(.name) (\(.createdAt | split("T")[0]))"' | while read -r line; do
                if [[ "$line" == *"success"* ]] || [[ "$line" == *"completed"* ]]; then
                    echo -e "  ${GREEN}✓${NC} ${line/success/}"
                elif [[ "$line" == *"failure"* ]]; then
                    echo -e "  ${RED}✗${NC} ${line/failure/}"
                elif [[ "$line" == *"in_progress"* ]]; then
                    echo -e "  ${YELLOW}⟳${NC} ${line/in_progress/}"
                else
                    echo "  $line"
                fi
            done
        else
            echo "  GitHub CLI not authenticated or no runs found"
        fi
    else
        echo "  GitHub CLI not installed (install with: brew install gh)"
    fi
    echo ""
}

# 1. Service Health
echo -e "${YELLOW}🏥 Service Health${NC}"
check_status "$PRODUCTION_URL" "Main Application"
check_status "$API_BASE/health" "Health Endpoint"
check_status "$API_BASE/ready" "Readiness Check"
check_status "$API_BASE/live" "Liveness Check"
check_status "$API_BASE/cameras" "Camera API"
echo ""

# 2. Performance Metrics
echo -e "${YELLOW}⚡ Performance Metrics${NC}"
echo -e "  Response Times:"
echo -e "    Homepage:    $(get_response_time "$PRODUCTION_URL")"
echo -e "    API Health:  $(get_response_time "$API_BASE/health")"
echo -e "    Camera API:  $(get_response_time "$API_BASE/cameras")"
echo ""

# 3. SSL Certificate Status
echo -e "${YELLOW}🔒 SSL Certificate${NC}"
if [ "$PRODUCTION_URL" == "https://"* ]; then
    domain=$(echo "$PRODUCTION_URL" | sed 's|https://||')
    cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ -n "$cert_info" ]; then
        expiry=$(echo "$cert_info" | grep notAfter | cut -d= -f2)
        if [ -n "$expiry" ]; then
            expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s)
            current_epoch=$(date +%s)
            days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))

            if [ $days_remaining -gt 30 ]; then
                echo -e "  ${GREEN}✓${NC} Valid for $days_remaining days"
            elif [ $days_remaining -gt 7 ]; then
                echo -e "  ${YELLOW}⚠${NC} Expires in $days_remaining days"
            else
                echo -e "  ${RED}✗${NC} Expires in $days_remaining days!"
            fi
            echo -e "  Expiry: $expiry"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} Unable to check certificate"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Not using HTTPS"
fi
echo ""

# 4. GitHub Actions
check_github_actions

# 5. Database Status (via API)
echo -e "${YELLOW}🗄️ Database Status${NC}"
db_response=$(curl -s "$API_BASE/cameras" --max-time 5 2>/dev/null)
if [ -n "$db_response" ]; then
    if [[ "$db_response" == *"["* ]]; then
        camera_count=$(echo "$db_response" | jq 'length' 2>/dev/null || echo "0")
        echo -e "  ${GREEN}✓${NC} Connected (${camera_count} cameras configured)"
    else
        echo -e "  ${GREEN}✓${NC} Connected"
    fi
else
    echo -e "  ${RED}✗${NC} Unable to verify database connection"
fi
echo ""

# 6. Deployment Information
echo -e "${YELLOW}📦 Deployment Information${NC}"
echo -e "  Production URL:  $PRODUCTION_URL"
echo -e "  API Base:        $API_BASE"
echo -e "  GitHub Repo:     https://github.com/$GITHUB_REPO"
echo -e "  Actions:         https://github.com/$GITHUB_REPO/actions"
echo ""

# 7. Quick Actions
echo -e "${YELLOW}🚀 Quick Actions${NC}"
echo -e "  Deploy:          ${BLUE}git push origin main${NC}"
echo -e "  Monitor:         ${BLUE}gh run watch -R $GITHUB_REPO${NC}"
echo -e "  Logs:            ${BLUE}ssh deploy@derail.me 'pm2 logs chittypro-streamlink'${NC}"
echo -e "  Restart:         ${BLUE}ssh deploy@derail.me 'pm2 restart chittypro-streamlink'${NC}"
echo -e "  Server Status:   ${BLUE}ssh deploy@derail.me 'pm2 status'${NC}"
echo ""

# 8. System Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
all_healthy=true
if ! check_status "$PRODUCTION_URL" "" &>/dev/null; then
    all_healthy=false
fi

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}                     ✅ All Systems Operational                        ${NC}"
else
    echo -e "${RED}                     ⚠️  Some Services Need Attention                  ${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Last checked: $(date '+%Y-%m-%d %H:%M:%S %Z')"