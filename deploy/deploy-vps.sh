#!/usr/bin/env bash
# ==============================================================================
# FQuiz Production Zero-Downtime Deployment Script (VPS)
# ==============================================================================
# Domains: https://fquiz.online & https://admin.fquiz.online
# Invoked via SSH by GitHub Actions or manually by an administrator.
# Guarantees concurrency safety (flock), MongoDB container health,
# zero-downtime PM2 reload, automated healthcheck validation, and rollback.
# ==============================================================================

set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin:$PATH"
APP_DIR="${APP_DIR:-/var/www/fquiz/app}"
LOCK_FILE="/tmp/fquiz-deploy.lock"
HEALTH_TIMEOUT=30
HEALTH_INTERVAL=3
WEB_HEALTH_URL="http://127.0.0.1:3000/api/health"
ADMIN_HEALTH_URL="http://127.0.0.1:3001/api/health"

echo "=================================================================="
echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting FQuiz VPS Deployment"
echo "=================================================================="

# 1. Acquire Deployment Mutex Lock
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "⚠️ Another deployment is already in progress. Aborting."
    exit 1
fi

cd "$APP_DIR"

# 2. Ensure Local MongoDB Container is Running
if ! docker ps --format '{{.Names}}' | grep -q '^fquiz-mongodb$'; then
    echo "📦 Starting fquiz-mongodb container..."
    docker compose -f deploy/docker-compose.mongodb.yml up -d
fi

# 3. Record Pre-Deployment State for Rollback
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "📍 Current Git commit: ${PREV_COMMIT:-Initial}"

rollback() {
    echo "🚨 [ROLLBACK] Deployment verification failed! Initiating automatic rollback..."
    if [ -n "$PREV_COMMIT" ]; then
        echo "⏪ Checking out previous stable commit: $PREV_COMMIT"
        git reset --hard "$PREV_COMMIT"
        npm ci --legacy-peer-deps
        npm run build
        pm2 reload ecosystem.config.js --update-env
        echo "✅ Rollback completed. Previous version restored."
    else
        echo "❌ No previous commit available to roll back to."
    fi
    exit 1
}

# 4. Pull Latest Code from main Branch
echo "📥 Fetching latest changes from origin/main..."
git fetch origin main
git checkout -f main
git reset --hard origin/main

TARGET_COMMIT=$(git rev-parse HEAD)
echo "🎯 Deploying commit: $TARGET_COMMIT"

# 5. Synchronize Env File into Workspaces for Build & Runtime
if [ -f ".env.production" ]; then
    cp .env.production .env.local
    cp .env.production apps/web/.env.local
    cp .env.production apps/admin/.env.local
    chmod 600 .env.production .env.local apps/web/.env.local apps/admin/.env.local
fi

# 6. Install Dependencies
echo "📦 Installing workspace dependencies with npm ci..."
npm ci --legacy-peer-deps

# 7. Build Application via Turborepo
echo "🔨 Building Next.js workspaces via Turborepo..."
npm run build

# 8. Zero-Downtime Rolling Reload via PM2
echo "🔄 Executing PM2 rolling reload..."
if pm2 describe fquiz-web > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
else
    pm2 start ecosystem.config.js
fi
pm2 save

# 9. Automated Healthcheck Verification
echo "🩺 Performing post-deployment healthcheck..."
start_time=$(date +%s)
web_healthy=false
admin_healthy=false

while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))

    if [ "$web_healthy" = false ]; then
        if curl -s -f -m 3 "$WEB_HEALTH_URL" > /dev/null 2>&1; then
            echo "  ✅ Web service (:3000 -> fquiz.online) is healthy! (after ${elapsed}s)"
            web_healthy=true
        fi
    fi

    if [ "$admin_healthy" = false ]; then
        if curl -s -f -m 3 "$ADMIN_HEALTH_URL" > /dev/null 2>&1; then
            echo "  ✅ Admin service (:3001 -> admin.fquiz.online) is healthy! (after ${elapsed}s)"
            admin_healthy=true
        fi
    fi

    if [ "$web_healthy" = true ] && [ "$admin_healthy" = true ]; then
        break
    fi

    if [ "$elapsed" -ge "$HEALTH_TIMEOUT" ]; then
        echo "❌ Healthcheck timed out after ${HEALTH_TIMEOUT}s!"
        rollback
    fi

    sleep "$HEALTH_INTERVAL"
done

echo "=================================================================="
echo "🎉 [$(date '+%Y-%m-%d %H:%M:%S')] FQuiz Production Deployed Successfully!"
echo "   Commit: $TARGET_COMMIT"
echo "   Web:    https://fquiz.online (127.0.0.1:3000)"
echo "   Admin:  https://admin.fquiz.online (127.0.0.1:3001)"
echo "=================================================================="
