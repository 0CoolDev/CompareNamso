#!/bin/bash

# CardGenius Zero-Downtime Update Script
# This script performs a zero-downtime update of the CardGenius application

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/cardgenius"
APP_NAME="cardgenius"
LOG_FILE="/var/log/cardgenius-update.log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Start update process
log "Starting CardGenius update process..."

# Navigate to application directory
cd "$APP_DIR" || error "Failed to navigate to $APP_DIR"

# Store current git hash for rollback if needed
PREVIOUS_COMMIT=$(git rev-parse HEAD)
log "Current commit: $PREVIOUS_COMMIT"

# Pull latest changes
log "Pulling latest changes from repository..."
git pull || error "Failed to pull latest changes"

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ]; then
    log "No new changes detected. Application is already up to date."
    exit 0
fi

log "New commit: $NEW_COMMIT"

# Install production dependencies
log "Installing production dependencies..."
npm install --production || {
    warning "Failed to install dependencies, attempting rollback..."
    git reset --hard "$PREVIOUS_COMMIT"
    npm install --production
    error "Update failed during dependency installation. Rolled back to previous version."
}

# Build the application
log "Building application..."
npm run build || {
    warning "Build failed, attempting rollback..."
    git reset --hard "$PREVIOUS_COMMIT"
    npm install --production
    npm run build
    error "Update failed during build. Rolled back to previous version."
}

# Run database migrations
log "Running database migrations..."
npx drizzle-kit push || {
    warning "Database migration failed. This may require manual intervention."
    # Note: Database migrations are harder to rollback automatically
    # Manual intervention may be required
}

# Perform zero-downtime reload with PM2
log "Reloading application with PM2 (zero-downtime)..."
pm2 reload "$APP_NAME" --update-env || {
    warning "PM2 reload failed, attempting restart..."
    pm2 restart "$APP_NAME"
}

# Verify application is running
sleep 2
if pm2 list | grep -q "$APP_NAME.*online"; then
    log "Update completed successfully! Application is running."
    
    # Optional: Run health check
    if command -v curl &> /dev/null; then
        sleep 3
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            log "Health check passed."
        else
            warning "Health check failed or endpoint not available."
        fi
    fi
else
    error "Application is not running after update!"
fi

log "CardGenius has been successfully updated with zero downtime."
log "Previous version: $PREVIOUS_COMMIT"
log "Current version: $NEW_COMMIT"

# Optional: Clean up old node_modules to save space
# log "Cleaning up old dependencies..."
# npm prune --production

exit 0
