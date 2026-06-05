#!/usr/bin/env bash
# =============================================================================
# install.sh — Deploy flight-booking-service + flight-booking-web on a Linux VM
# =============================================================================
# Usage:
#   sudo bash install.sh <DOMAIN>
#
# Examples:
#   sudo bash install.sh mysite.com
#   sudo bash install.sh 1-2-3-4.sslip.io   # no domain? use sslip.io
#
# What this script does:
#   1. Installs Go, nginx, certbot, bun
#   2. Builds the Go API binary
#   3. Builds the Next.js frontend with bun
#   4. Deploys the API as a systemd service
#   5. Configures nginx (reverse proxy + static files)
#   6. Obtains a free Let's Encrypt TLS certificate via certbot
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Argument check
# ---------------------------------------------------------------------------
[[ $# -lt 1 ]] && error "Usage: sudo bash install.sh <DOMAIN>"
DOMAIN="$1"
EMAIL="${2:-webmaster@${DOMAIN}}"   # optional 2nd arg: certbot e-mail

info "Deploying to domain: ${DOMAIN}"
info "Certbot contact e-mail: ${EMAIL}"

# Must run as root
[[ $(id -u) -eq 0 ]] || error "This script must be run as root (use sudo)"

# ---------------------------------------------------------------------------
# Detect script location → project root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
API_SRC="${PROJECT_ROOT}/flight-booking-service"
WEB_SRC="${PROJECT_ROOT}/flight-booking-web"
DEPLOY_DIR="/opt/flight-booking-service"
WEB_PUBLIC="${DEPLOY_DIR}/public"

# ---------------------------------------------------------------------------
# Step 1 — System packages
# ---------------------------------------------------------------------------
info "Step 1/6 — Installing system packages..."
apt-get update -y
apt-get install -y curl wget git unzip build-essential nginx certbot python3-certbot-nginx

# Install Go (latest stable)
GO_VERSION="1.24.3"
if ! command -v go &>/dev/null || [[ "$(go version 2>/dev/null | awk '{print $3}')" != "go${GO_VERSION}" ]]; then
    info "Installing Go ${GO_VERSION}..."
    ARCH=$(dpkg --print-architecture)
    case "$ARCH" in
        amd64)  GO_ARCH="amd64" ;;
        arm64)  GO_ARCH="arm64" ;;
        *)      error "Unsupported architecture: $ARCH" ;;
    esac
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-${GO_ARCH}.tar.gz" -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    ln -sf /usr/local/go/bin/go    /usr/local/bin/go
    ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt
fi
info "Go version: $(go version)"

# Install Bun (for building the Next.js frontend)
if ! command -v bun &>/dev/null; then
    info "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    # Make bun available system-wide for the current session
    export PATH="${HOME}/.bun/bin:${PATH}"
    ln -sf "${HOME}/.bun/bin/bun" /usr/local/bin/bun
fi
info "Bun version: $(bun --version)"

# ---------------------------------------------------------------------------
# Step 2 — Build the Go API binary
# ---------------------------------------------------------------------------
info "Step 2/6 — Building Go API..."
cd "${API_SRC}"
go mod download
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o flight-booking-service .
info "Binary built: ${API_SRC}/flight-booking-service"

# ---------------------------------------------------------------------------
# Step 3 — Build the Next.js frontend
# ---------------------------------------------------------------------------
info "Step 3/6 — Building Next.js frontend..."
cd "${WEB_SRC}"
bun install --frozen-lockfile
# Pass the public API URL so the frontend points at the correct origin
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api" bun run build
info "Frontend built."

# ---------------------------------------------------------------------------
# Step 4 — Install files and systemd service
# ---------------------------------------------------------------------------
info "Step 4/6 — Deploying files to ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}" "${WEB_PUBLIC}"

# Copy Go binary
cp "${API_SRC}/flight-booking-service" "${DEPLOY_DIR}/flight-booking-service"
chmod +x "${DEPLOY_DIR}/flight-booking-service"

# Copy Next.js output
# • Static export (next.config output:'export')  → files land in out/
# • Standard server build                        → copy public/ + .next/static/
if [[ -d "${WEB_SRC}/out" ]]; then
    cp -r "${WEB_SRC}/out/." "${WEB_PUBLIC}/"
    info "Copied static export from out/ → ${WEB_PUBLIC}"
elif [[ -d "${WEB_SRC}/.next/static" ]]; then
    [[ -d "${WEB_SRC}/public" ]] && cp -r "${WEB_SRC}/public/." "${WEB_PUBLIC}/"
    mkdir -p "${WEB_PUBLIC}/_next/static"
    cp -r "${WEB_SRC}/.next/static/." "${WEB_PUBLIC}/_next/static/"
    info "Copied .next/static → ${WEB_PUBLIC}"
fi

# Set ownership
chown -R www-data:www-data "${DEPLOY_DIR}"

# Install systemd service (substitute real domain)
sed "s|https://YOUR_DOMAIN|https://${DOMAIN}|g" \
    "${API_SRC}/deploy/flight-booking-service.service" \
    > /etc/systemd/system/flight-booking-service.service

systemctl daemon-reload
systemctl enable flight-booking-service
systemctl restart flight-booking-service
info "Systemd service enabled and started."

# ---------------------------------------------------------------------------
# Step 5 — Configure nginx
# ---------------------------------------------------------------------------
info "Step 5/6 — Configuring nginx..."

# Write nginx config with the real domain substituted
sed "s/YOUR_DOMAIN/${DOMAIN}/g" \
    "${API_SRC}/deploy/nginx.conf" \
    > /etc/nginx/sites-available/flight-booking-service

# Enable site; remove the default placeholder if still present
ln -sf /etc/nginx/sites-available/flight-booking-service \
       /etc/nginx/sites-enabled/flight-booking-service
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
info "nginx configured and reloaded."

# ---------------------------------------------------------------------------
# Step 6 — HTTPS with Let's Encrypt (certbot)
# ---------------------------------------------------------------------------
info "Step 6/6 — Obtaining TLS certificate for ${DOMAIN}..."

# certbot patches the nginx config automatically with certificate paths
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email "${EMAIL}" \
    -d "${DOMAIN}"

systemctl reload nginx
info "HTTPS enabled via Let's Encrypt."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Deployment complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  API  (Go):      https://${DOMAIN}/api/"
echo "  Web  (Next.js): https://${DOMAIN}/"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status flight-booking-service    # service status"
echo "  sudo journalctl -u flight-booking-service -f    # live logs"
echo "  sudo certbot renew --dry-run                    # test cert renewal"
echo ""

