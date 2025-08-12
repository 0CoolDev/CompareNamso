#!/bin/bash

# CardGenius Health Monitor Script
# Can be used with cron for automated monitoring

APP_NAME="cardgenius"
HEALTH_URL="http://localhost:3000/health"
SLACK_WEBHOOK_URL=""  # Add your Slack webhook URL here if you want notifications

check_pm2_status() {
    pm2 list | grep -q "$APP_NAME.*online"
    return $?
}

check_health_endpoint() {
    if command -v curl &> /dev/null; then
        curl -f -s "$HEALTH_URL" > /dev/null 2>&1
        return $?
    else
        return 0  # Skip if curl not available
    fi
}

send_alert() {
    local message=$1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $message"
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 CardGenius Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null
    fi
}

# Check PM2 status
if ! check_pm2_status; then
    send_alert "CardGenius is not running in PM2!"
    # Attempt auto-restart
    pm2 restart "$APP_NAME"
    sleep 5
    if check_pm2_status; then
        send_alert "CardGenius has been automatically restarted."
    else
        send_alert "Failed to restart CardGenius. Manual intervention required!"
    fi
fi

# Check health endpoint
if ! check_health_endpoint; then
    send_alert "CardGenius health check failed!"
fi

# Check memory usage
MEMORY_USAGE=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .monit.memory" 2>/dev/null)
if [ -n "$MEMORY_USAGE" ]; then
    # Convert to MB
    MEMORY_MB=$((MEMORY_USAGE / 1024 / 1024))
    if [ "$MEMORY_MB" -gt 500 ]; then
        send_alert "High memory usage detected: ${MEMORY_MB}MB"
    fi
fi
