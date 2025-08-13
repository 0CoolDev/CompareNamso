#!/bin/bash

# DNS Record Type (A, CNAME, etc)
record_type="A"
# Domain name
domain="gen.nullme.lol"
# Server IP address
content="95.217.132.221"
# Cloudflare API token (needs Zone.DNS edit permissions)
api_token="${CF_API_TOKEN}"
# Zone ID from Cloudflare dashboard
zone_id="${CF_ZONE_ID}"

# Create DNS record
create_dns_record() {
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\":\"${record_type}\",
            \"name\":\"${domain}\",
            \"content\":\"${content}\",
            \"ttl\":1,
            \"proxied\":true
        }"
}

# Configure Cloudflare settings
configure_cloudflare() {
    # Enable HTTPS/SSL
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/ssl" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":"strict"}'

    # Enable Always Use HTTPS
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/always_use_https" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":"on"}'

    # Enable Auto Minify
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/minify" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":{"css":"on","html":"on","js":"on"}}'

    # Enable Brotli Compression
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/brotli" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":"on"}'

    # Enable Security Level
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/security_level" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":"high"}'

    # Enable Browser Cache TTL
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/browser_cache_ttl" \
        -H "Authorization: Bearer ${api_token}" \
        -H "Content-Type: application/json" \
        --data '{"value":691200}'
}

# Main execution
echo "Creating DNS record..."
create_dns_record

echo "Configuring Cloudflare settings..."
configure_cloudflare

echo "Setup complete!"
