#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/safe-meet}"
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"
COMPOSE="docker compose -f $COMPOSE_FILE -p safemeet"
ACTIVE_FILE="$APP_DIR/.active_color"
DOMAIN="${DEPLOY_DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: DEPLOY_DOMAIN is required (example: safemeet.xyz)." >&2
  exit 1
fi

if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "ERROR: LETSENCRYPT_EMAIL is required for TLS provisioning." >&2
  exit 1
fi

cd "$APP_DIR"

echo "[1/12] Updating source..."
git fetch origin main
git reset --hard origin/main

# Bash caches scripts before execution, so the rest of this script runs from
# the OLD version even after git reset. Re-exec with the updated file once.
if [[ "${_DEPLOY_RESTARTED:-}" != "1" ]]; then
  export _DEPLOY_RESTARTED=1
  exec bash "$APP_DIR/deploy.sh"
fi

ACTIVE="none"
if [[ -f "$ACTIVE_FILE" ]]; then
  ACTIVE=$(cat "$ACTIVE_FILE")
fi

if [[ "$ACTIVE" == "blue" ]]; then
  NEW="green"
  OLD="blue"
  WEB_PORT=3102
  API_PORT=4102
else
  NEW="blue"
  OLD="green"
  WEB_PORT=3101
  API_PORT=4101
fi

echo "Active color: $ACTIVE"
echo "Deploying color: $NEW"

echo "[2/12] Ensuring env files..."
mkdir -p "$APP_DIR/logs"

if [[ ! -f "$APP_DIR/.env.api" ]]; then
  JWT_SECRET=$(openssl rand -hex 32)
  QR_SECRET=$(openssl rand -hex 32)
  cat > "$APP_DIR/.env.api" <<EOT
DATABASE_URL=postgresql://safemeet:safemeet_password@postgres:5432/safemeet
JWT_SECRET=$JWT_SECRET
QR_SECRET=$QR_SECRET
FRONTEND_URL=https://$DOMAIN
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
REDIS_URL=redis://redis:6379
LOG_FILE_PATH=/app/logs/api.log
VAPID_SUBJECT=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
EOT
fi

if ! grep -q "^LOG_FILE_PATH=" "$APP_DIR/.env.api"; then
  printf "\nLOG_FILE_PATH=/app/logs/api.log\n" >> "$APP_DIR/.env.api"
fi

if ! grep -q "^VAPID_SUBJECT=" "$APP_DIR/.env.api"; then
  printf "\nVAPID_SUBJECT=\nVAPID_PUBLIC_KEY=\nVAPID_PRIVATE_KEY=\n" >> "$APP_DIR/.env.api"
fi

if ! grep -q "^NEXT_PUBLIC_APP_URL=" "$APP_DIR/.env.web"; then
  printf "\nNEXT_PUBLIC_APP_URL=https://%s\n" "$DOMAIN" >> "$APP_DIR/.env.web"
fi

if ! grep -q "^NEXT_PUBLIC_API_URL=" "$APP_DIR/.env.web"; then
  printf "\nNEXT_PUBLIC_API_URL=https://api.%s\n" "$DOMAIN" >> "$APP_DIR/.env.web"
fi

if ! grep -q "^NEXT_PUBLIC_VAPID_PUBLIC_KEY=" "$APP_DIR/.env.web"; then
  printf "\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=\n" >> "$APP_DIR/.env.web"
fi

if [[ ! -f "$APP_DIR/.env.web" ]]; then
  cat > "$APP_DIR/.env.web" <<EOT
NEXT_PUBLIC_API_URL=https://api.$DOMAIN
NEXT_PUBLIC_APP_URL=https://app.$DOMAIN
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NODE_ENV=production
EOT
fi

WC_PROJECT_ID=$(grep -E '^NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=' "$APP_DIR/.env.web" | cut -d'=' -f2- || true)
if [[ -z "$WC_PROJECT_ID" || "$WC_PROJECT_ID" == "local-dev-project-id" ]]; then
  echo "ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be set in .env.web." >&2
  exit 1
fi

ESCROW_CONTRACT_ADDRESS=$(grep -E '^NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=' "$APP_DIR/.env.web" | cut -d'=' -f2- || true)
if [[ -z "$ESCROW_CONTRACT_ADDRESS" ]]; then
  echo "ERROR: NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS must be set in .env.web." >&2
  exit 1
fi

echo "[3/12] Installing nginx + certbot (if missing)..."
if ! command -v nginx >/dev/null 2>&1 || ! command -v certbot >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y nginx certbot python3-certbot-nginx
  systemctl enable nginx
fi

echo "[3.1/12] Configuring nightly backups..."
chmod +x "$APP_DIR/infra/scripts/backup-postgres.sh"
cat > /etc/cron.d/safemeet-backup <<'EOT'
0 2 * * * root APP_DIR=/opt/safe-meet /opt/safe-meet/infra/scripts/backup-postgres.sh >> /var/log/safemeet-backup.log 2>&1
EOT
chmod 644 /etc/cron.d/safemeet-backup

echo "[4/12] Building app image for $NEW..."
docker build -t "safe-meet-app:$NEW" -f "$APP_DIR/infra/Dockerfile" "$APP_DIR"

echo "[5/12] Starting core services (Postgres, Redis)..."
$COMPOSE up -d postgres redis

echo "[6/12] Running database migrations..."
docker run --rm --network safemeet_default --env-file "$APP_DIR/.env.api" "safe-meet-app:$NEW" sh -lc "cd /app/apps/api && npx prisma migrate deploy"

echo "[7/12] Starting new API/Web stack ($NEW)..."
$COMPOSE up -d "api_$NEW" "web_$NEW"

echo "[8/12] Waiting for health checks..."
API_HEALTHY=0
for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    API_HEALTHY=1
    break
  fi
  echo "  API not ready yet ($i/40)..."
  sleep 3
done

if [[ $API_HEALTHY -eq 0 ]]; then
  echo "ERROR: API ($NEW) failed to become healthy after 120s. Aborting." >&2
  $COMPOSE logs "api_$NEW"
  exit 1
fi

WEB_HEALTHY=0
for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}" >/dev/null 2>&1; then
    WEB_HEALTHY=1
    break
  fi
  echo "  Web not ready yet ($i/40)..."
  sleep 3
done

if [[ $WEB_HEALTHY -eq 0 ]]; then
  echo "ERROR: Web ($NEW) failed to become healthy after 120s. Aborting." >&2
  $COMPOSE logs "web_$NEW"
  exit 1
fi

echo "[9/12] Writing nginx config..."

# Cert paths (subdomains only — apex may be behind Cloudflare CDN)
CERT_DIR="/etc/letsencrypt/live/app.$DOMAIN"
CERT_LIVE="$CERT_DIR/fullchain.pem"

echo "[10/12] Provisioning TLS certificate for subdomains..."
if [[ ! -f "$CERT_LIVE" ]]; then
  # First time — issue cert for both subdomains only (apex is behind CF)
  certbot certonly --nginx \
    -d "app.$DOMAIN" -d "api.$DOMAIN" \
    --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL"
else
  certbot renew --quiet --cert-name "app.$DOMAIN" --deploy-hook "systemctl reload nginx" 2>/dev/null || true
fi

# Render the nginx template (updated by git reset above — always latest)
sed \
  -e "s|__DOMAIN__|$DOMAIN|g" \
  -e "s|__API_PORT__|$API_PORT|g" \
  -e "s|__WEB_PORT__|$WEB_PORT|g" \
  -e "s|__CERT_DIR__|$CERT_DIR|g" \
  "$APP_DIR/infra/nginx.conf.template" \
  > /etc/nginx/sites-available/safe-meet

# Legacy heredoc removed — kept as reference comment
: <<'EOT'
# ── Apex domain (behind Cloudflare) — HTTP only ────────────────
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# ── app subdomain HTTP → HTTPS ─────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name app.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

# ── api subdomain HTTP → HTTPS ─────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name api.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

# ── app subdomain HTTPS ────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name app.$DOMAIN;
    client_max_body_size 20m;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# ── api subdomain HTTPS ────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name api.$DOMAIN;
    client_max_body_size 20m;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOT

ln -sf /etc/nginx/sites-available/safe-meet /etc/nginx/sites-enabled/safe-meet
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "[11/12] HSTS already in config — skipping sed patch"

echo "$NEW" > "$ACTIVE_FILE"

echo "[12/12] Stopping old stack and pruning images..."
if [[ "$OLD" != "none" ]]; then
  $COMPOSE stop "api_$OLD" "web_$OLD" 2>/dev/null || true
  $COMPOSE rm -f "api_$OLD" "web_$OLD" 2>/dev/null || true
fi

docker image prune -f
docker rmi "safe-meet-app:$OLD" 2>/dev/null || true

echo "Deployment complete."
echo "Live URL: https://$DOMAIN"
echo "Active color is now: $NEW"
