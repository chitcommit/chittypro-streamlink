#!/bin/bash

# Google Drive Sync Script using rclone
# Syncs recordings, uploads, and database backups to Google Drive

set -e

# Configuration
GDRIVE_REMOTE="gdrive"  # rclone remote name for Google Drive
LOCAL_RECORDINGS_DIR="./recordings"
LOCAL_UPLOADS_DIR="./uploads"
LOCAL_BACKUPS_DIR="./backups"
GDRIVE_BASE_DIR="ChittyPro-Streamlink"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    error "rclone is not installed. Install it from https://rclone.org/downloads/"
fi

# Check if Google Drive remote is configured
if ! rclone listremotes | grep -q "^${GDRIVE_REMOTE}:$"; then
    error "Google Drive remote '${GDRIVE_REMOTE}' not configured. Run: rclone config"
fi

# Create local directories if they don't exist
mkdir -p "$LOCAL_RECORDINGS_DIR" "$LOCAL_UPLOADS_DIR" "$LOCAL_BACKUPS_DIR"

# Function to sync directory to Google Drive
sync_to_gdrive() {
    local local_dir="$1"
    local remote_dir="$2"
    local description="$3"

    if [ -d "$local_dir" ]; then
        log "Syncing $description to Google Drive..."
        rclone sync "$local_dir" "${GDRIVE_REMOTE}:${GDRIVE_BASE_DIR}/${remote_dir}" \
            --progress \
            --exclude "*.tmp" \
            --exclude "*.temp" \
            --log-level INFO
        log "✓ $description sync completed"
    else
        warn "$description directory not found: $local_dir"
    fi
}

# Function to backup database
backup_database() {
    if [ -n "$DATABASE_URL" ]; then
        log "Creating database backup..."
        local backup_file="$LOCAL_BACKUPS_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

        # Extract database info from DATABASE_URL
        if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
            local user="${BASH_REMATCH[1]}"
            local pass="${BASH_REMATCH[2]}"
            local host="${BASH_REMATCH[3]}"
            local port="${BASH_REMATCH[4]}"
            local db="${BASH_REMATCH[5]}"

            PGPASSWORD="$pass" pg_dump -h "$host" -p "$port" -U "$user" -d "$db" > "$backup_file"

            if [ $? -eq 0 ]; then
                log "✓ Database backup created: $backup_file"

                # Compress the backup
                gzip "$backup_file"
                log "✓ Database backup compressed"
            else
                warn "Database backup failed"
            fi
        else
            warn "Invalid DATABASE_URL format"
        fi
    else
        warn "DATABASE_URL not set, skipping database backup"
    fi
}

# Function to restore from Google Drive
restore_from_gdrive() {
    local local_dir="$1"
    local remote_dir="$2"
    local description="$3"

    log "Restoring $description from Google Drive..."
    rclone sync "${GDRIVE_REMOTE}:${GDRIVE_BASE_DIR}/${remote_dir}" "$local_dir" \
        --progress \
        --log-level INFO
    log "✓ $description restore completed"
}

# Function to clean old backups (keep last 7 days)
cleanup_old_backups() {
    log "Cleaning up old local backups..."
    find "$LOCAL_BACKUPS_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
    log "✓ Old local backups cleaned"

    log "Cleaning up old Google Drive backups..."
    # Note: This requires rclone with delete capabilities
    rclone delete "${GDRIVE_REMOTE}:${GDRIVE_BASE_DIR}/backups" \
        --min-age 7d \
        --include "db_backup_*.sql.gz"
    log "✓ Old Google Drive backups cleaned"
}

# Main execution
case "${1:-sync}" in
    "sync")
        log "Starting sync to Google Drive..."
        backup_database
        sync_to_gdrive "$LOCAL_RECORDINGS_DIR" "recordings" "Camera recordings"
        sync_to_gdrive "$LOCAL_UPLOADS_DIR" "uploads" "User uploads"
        sync_to_gdrive "$LOCAL_BACKUPS_DIR" "backups" "Database backups"
        cleanup_old_backups
        log "✓ All sync operations completed"
        ;;

    "restore")
        log "Starting restore from Google Drive..."
        restore_from_gdrive "$LOCAL_RECORDINGS_DIR" "recordings" "Camera recordings"
        restore_from_gdrive "$LOCAL_UPLOADS_DIR" "uploads" "User uploads"
        restore_from_gdrive "$LOCAL_BACKUPS_DIR" "backups" "Database backups"
        log "✓ All restore operations completed"
        ;;

    "backup-db")
        backup_database
        sync_to_gdrive "$LOCAL_BACKUPS_DIR" "backups" "Database backups"
        ;;

    "setup")
        log "Setting up rclone for Google Drive..."
        echo "1. Run: rclone config"
        echo "2. Choose 'n' for new remote"
        echo "3. Name it: $GDRIVE_REMOTE"
        echo "4. Choose 'drive' for Google Drive"
        echo "5. Follow the authentication steps"
        echo "6. Test with: rclone lsd $GDRIVE_REMOTE:"
        ;;

    *)
        echo "Usage: $0 {sync|restore|backup-db|setup}"
        echo ""
        echo "Commands:"
        echo "  sync      - Sync local files to Google Drive (default)"
        echo "  restore   - Restore files from Google Drive to local"
        echo "  backup-db - Backup database and sync to Google Drive"
        echo "  setup     - Show setup instructions for rclone"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_URL - PostgreSQL connection string for database backups"
        exit 1
        ;;
esac