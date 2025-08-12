#!/bin/bash

# CardGenius Rollback Script
# This script rolls back to a previous version of the application

set -e
set -u

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/cardgenius"
APP_NAME="cardgenius"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Navigate to application directory
cd "$APP_DIR" || error "Failed to navigate to $APP_DIR"

# Get current and previous commits
CURRENT_COMMIT=$(git rev-parse HEAD)
log "Current commit: $CURRENT_COMMIT"

# Check if a specific commit was provided
if [ $# -eq 1 ]; then
    TARGET_COMMIT=$1
    log "Rolling back to specified commit: $TARGET_COMMIT"
else
    # Roll back to previous commit
    TARGET_COMMIT=$(git rev-parse HEAD~1)
    log "Rolling back to previous commit: $TARGET_COMMIT"
fi

# Perform rollback
log "Starting rollback process..."
git reset --hard "$TARGET_COMMIT" || error "Failed to reset to target commit"

# Reinstall dependencies
log "Reinstalling dependencies..."
npm install --production || error "Failed to install dependencies"

# Rebuild application
log "Rebuilding application..."
npm run build || error "Failed to build application"

# Note: Database rollback should be handled separately if needed
log "⚠️  Note: Database migrations were NOT rolled back. Handle manually if needed."

# Reload application
log "Reloading application..."
pm2 reload "$APP_NAME" --update-env || pm2 restart "$APP_NAME"

# Verify
sleep 2
if pm2 list | grep -q "$APP_NAME.*online"; then
    log "✅ Rollback completed successfully!"
    log "Previous version: $CURRENT_COMMIT"
    log "Current version: $TARGET_COMMIT"
else
    error "❌ Application is not running after rollback!"
fi
