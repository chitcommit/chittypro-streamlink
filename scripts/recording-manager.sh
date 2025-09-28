#!/bin/bash

# Recording Manager with Google Drive Integration
# Handles video recording, compression, and automated Google Drive sync

set -e

# Configuration
RECORDINGS_DIR="./recordings"
TEMP_DIR="./temp"
COMPRESSED_DIR="./recordings/compressed"
GDRIVE_SYNC_SCRIPT="./scripts/sync-to-gdrive.sh"

# Video settings
MAX_FILE_SIZE_MB=100  # Max file size before compression (MB)
COMPRESSION_QUALITY=23  # FFmpeg CRF (18-28, lower = better quality)
MAX_RECORDING_DURATION=3600  # Max recording length in seconds (1 hour)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check dependencies
check_dependencies() {
    local deps=("ffmpeg" "rclone")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep is not installed. Please install it first."
        fi
    done
}

# Create necessary directories
setup_directories() {
    mkdir -p "$RECORDINGS_DIR" "$TEMP_DIR" "$COMPRESSED_DIR"
}

# Record from RTSP stream
record_stream() {
    local stream_url="$1"
    local camera_name="$2"
    local duration="${3:-$MAX_RECORDING_DURATION}"

    if [ -z "$stream_url" ] || [ -z "$camera_name" ]; then
        error "Usage: record_stream <stream_url> <camera_name> [duration]"
    fi

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local filename="${camera_name}_${timestamp}.mp4"
    local temp_file="$TEMP_DIR/$filename"
    local final_file="$RECORDINGS_DIR/$filename"

    log "Starting recording from $camera_name for ${duration}s..."
    log "Stream URL: $stream_url"

    # Record with FFmpeg
    ffmpeg -rtsp_transport tcp \
           -i "$stream_url" \
           -t "$duration" \
           -c:v libx264 \
           -preset ultrafast \
           -crf 20 \
           -c:a aac \
           -movflags +faststart \
           -y "$temp_file" || {
        error "Recording failed for $camera_name"
    }

    # Move to final location
    mv "$temp_file" "$final_file"
    log "✓ Recording saved: $final_file"

    # Check file size and compress if needed
    compress_if_needed "$final_file"

    # Sync to Google Drive
    if [ -x "$GDRIVE_SYNC_SCRIPT" ]; then
        log "Syncing to Google Drive..."
        "$GDRIVE_SYNC_SCRIPT" sync
    fi

    echo "$final_file"
}

# Compress video if it's too large
compress_if_needed() {
    local video_file="$1"

    if [ ! -f "$video_file" ]; then
        warn "Video file not found: $video_file"
        return
    fi

    local file_size_mb=$(du -m "$video_file" | cut -f1)

    if [ "$file_size_mb" -gt "$MAX_FILE_SIZE_MB" ]; then
        log "File size ${file_size_mb}MB exceeds limit. Compressing..."

        local basename=$(basename "$video_file" .mp4)
        local compressed_file="$COMPRESSED_DIR/${basename}_compressed.mp4"

        ffmpeg -i "$video_file" \
               -c:v libx264 \
               -crf "$COMPRESSION_QUALITY" \
               -preset slow \
               -c:a aac \
               -b:a 128k \
               -movflags +faststart \
               -y "$compressed_file" || {
            warn "Compression failed for $video_file"
            return
        }

        local new_size_mb=$(du -m "$compressed_file" | cut -f1)
        local savings=$((file_size_mb - new_size_mb))

        log "✓ Compressed: ${file_size_mb}MB → ${new_size_mb}MB (saved ${savings}MB)"

        # Replace original with compressed version if significantly smaller
        if [ "$savings" -gt 10 ]; then
            mv "$compressed_file" "$video_file"
            log "✓ Replaced original with compressed version"
        else
            log "✓ Keeping both versions (minimal savings)"
        fi
    fi
}

# Clean up old recordings (Google Drive aware)
cleanup_old_recordings() {
    local days_to_keep="${1:-7}"

    log "Cleaning up local recordings older than $days_to_keep days..."

    # Find old files
    local old_files=$(find "$RECORDINGS_DIR" -name "*.mp4" -mtime +$days_to_keep)

    if [ -n "$old_files" ]; then
        echo "$old_files" | while read -r file; do
            log "Removing old recording: $(basename "$file")"
            rm "$file"
        done
    else
        log "No old recordings to clean up"
    fi
}

# Monitor storage usage
check_storage() {
    log "Storage usage:"
    echo "Local recordings:"
    du -sh "$RECORDINGS_DIR" 2>/dev/null || echo "  No recordings directory"

    echo ""
    echo "Google Drive usage (if configured):"
    if command -v rclone &> /dev/null && rclone listremotes | grep -q "gdrive:"; then
        rclone size gdrive:ChittyPro-Streamlink --json 2>/dev/null | jq '.bytes' | numfmt --to=iec || echo "  Unable to check Google Drive usage"
    else
        echo "  Google Drive not configured"
    fi
}

# Stream multiple cameras simultaneously
record_multiple() {
    local config_file="$1"

    if [ ! -f "$config_file" ]; then
        error "Config file not found: $config_file"
    fi

    log "Starting multiple camera recording from config: $config_file"

    # Read config file (format: camera_name,stream_url,duration)
    while IFS=',' read -r camera_name stream_url duration; do
        # Skip empty lines and comments
        [[ -z "$camera_name" || "$camera_name" =~ ^#.*$ ]] && continue

        log "Starting recording for $camera_name..."
        record_stream "$stream_url" "$camera_name" "$duration" &
    done < "$config_file"

    # Wait for all recordings to complete
    wait
    log "✓ All recordings completed"
}

# Create sample config file
create_sample_config() {
    local config_file="./camera_config.csv"

    cat > "$config_file" << EOF
# Camera recording configuration
# Format: camera_name,stream_url,duration_seconds
front_door,rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp,1800
backyard,rtsp://demo:demo@ipvmdemo.dyndns.org:5542/onvif-media/media.amp,3600
# driveway,rtsp://user:pass@192.168.1.100:554/stream,1800
EOF

    log "Sample config created: $config_file"
    log "Edit this file with your camera details"
}

# Main execution
case "${1:-help}" in
    "record")
        check_dependencies
        setup_directories
        record_stream "$2" "$3" "$4"
        ;;

    "record-multiple")
        check_dependencies
        setup_directories
        record_multiple "$2"
        ;;

    "compress")
        check_dependencies
        compress_if_needed "$2"
        ;;

    "cleanup")
        cleanup_old_recordings "$2"
        ;;

    "storage")
        check_storage
        ;;

    "setup")
        setup_directories
        create_sample_config
        log "Setup completed. Configure your cameras in camera_config.csv"
        ;;

    *)
        echo "ChittyPro Streamlink Recording Manager"
        echo ""
        echo "Usage: $0 COMMAND [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  record <stream_url> <camera_name> [duration]  - Record single camera"
        echo "  record-multiple <config_file>                 - Record multiple cameras"
        echo "  compress <video_file>                         - Compress video file"
        echo "  cleanup [days]                                - Clean old recordings (default: 7 days)"
        echo "  storage                                       - Check storage usage"
        echo "  setup                                         - Create directories and sample config"
        echo ""
        echo "Examples:"
        echo "  $0 record rtsp://user:pass@cam.local/stream front_door 1800"
        echo "  $0 record-multiple camera_config.csv"
        echo "  $0 cleanup 3"
        echo ""
        echo "Google Drive sync is automatic if configured with sync-to-gdrive.sh"
        ;;
esac