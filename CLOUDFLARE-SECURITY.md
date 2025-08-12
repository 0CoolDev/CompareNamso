# 🔒 Cloudflare Security Configuration

## What's Protected:

### ✅ Server-Side Protection
1. **ONLY Cloudflare can access your site** - Direct IP access blocked
2. **Real visitor IPs tracked** through Cloudflare headers
3. **All sensitive files blocked** (.env, .git, .sql, etc.)
4. **Application runs on localhost only** (127.0.0.1:5000)

### ✅ Cloudflare Dashboard Settings (Configure These):

#### 1. **SSL/TLS Settings**
- Mode: `Full (Strict)` ✅
- Minimum TLS Version: `1.2`
- Enable: `Always Use HTTPS`
- Enable: `Automatic HTTPS Rewrites`

#### 2. **Security Settings**
- Security Level: `High` or `I'm Under Attack`
- Challenge Passage: `30 minutes`
- Browser Integrity Check: `ON`

#### 3. **Firewall Rules** (Create these)
```
Rule 1: Block Countries
- If Country NOT in [Your allowed countries] 
- Then: Block

Rule 2: Block Bad Bots
- If User Agent contains [bot, crawler, spider, scraper]
- AND Known Bots = OFF
- Then: Block

Rule 3: Rate Limiting
- If same IP makes > 50 requests in 1 minute
- Then: Challenge

Rule 4: Block Direct IP Access
- If Host Header = "95.217.132.221"
- Then: Block
```

#### 4. **Page Rules**
```
gen.nullme.lol/api/*
- Security Level: High
- Cache Level: Bypass

gen.nullme.lol/admin/*
- Security Level: I'm Under Attack
- Browser Integrity Check: On
```

#### 5. **Network Tab**
- Enable: `IP Geolocation`
- Enable: `WebSockets`
- Enable: `HTTP/2`
- Enable: `HTTP/3 (with QUIC)`

#### 6. **Caching**
- Browser Cache TTL: `4 hours`
- Always Online: `ON`

#### 7. **DDoS Protection**
- Automatically enabled with proxy

#### 8. **Access (Zero Trust)** - Optional Premium
- Set up Access policies for admin areas
- Require email authentication
- Add 2FA requirement

## 🛡️ What This Protects Against:

✅ **DDoS Attacks** - Cloudflare absorbs them
✅ **Direct IP Discovery** - Server only accepts CF traffic  
✅ **Bot Attacks** - CF bot protection
✅ **SQL Injection** - WAF rules
✅ **XSS Attacks** - Security headers
✅ **Brute Force** - Rate limiting
✅ **Geographic Attacks** - Country blocking
✅ **Zero-day Exploits** - CF updates automatically

## 📊 Monitor in Cloudflare:
- Analytics → Security Events
- Firewall → Overview
- DDoS → Overview

## 🔄 Automatic Updates:
- Cloudflare IPs update weekly via cron
- SSL certs managed by Cloudflare

## ⚠️ IMPORTANT:
1. Set DNS to "Proxied" (orange cloud) in Cloudflare
2. Never expose your origin IP publicly
3. Use Cloudflare's API tokens, not global API key
4. Enable 2FA on your Cloudflare account

Your site is now protected by Cloudflare's global network!
