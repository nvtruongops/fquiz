#!/usr/bin/env bash
# ==============================================================================
# FQuiz Ubuntu VPS Provisioning & Hardening Bootstrap Script
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS (x86_64)
# Run as root: bash deploy/vps-setup.sh
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root. Please run with 'sudo bash deploy/vps-setup.sh'"
    exit 1
fi

echo "=================================================================="
echo "🛠️  Starting FQuiz VPS Automated Provisioning & Hardening"
echo "=================================================================="

# 1. Update OS Packages
echo "🔄 Updating apt packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# 2. Install Essential Utilities
echo "📦 Installing base dependencies..."
apt-get install -y \
    curl \
    git \
    ufw \
    fail2ban \
    htop \
    jq \
    unzip \
    build-essential \
    ca-certificates \
    gnupg

# 3. Configure 4GB Linux Swap Space (Prevents OOM on Next.js compile)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 4GB Swap file..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✅ 4GB Swap file active."
else
    echo "ℹ️  Swap file already exists. Skipping."
fi

# 4. Install Node.js 20 LTS (NodeSource)
if ! command -v node > /dev/null 2>&1; then
    echo "🟢 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "✅ Node $(node -v) & npm $(npm -v) installed."
else
    echo "ℹ️  Node $(node -v) is already installed."
fi

# 5. Install PM2 and Configure Log Rotation
echo "⚙️  Installing PM2 globally..."
npm install -g pm2
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 10M || true
pm2 set pm2-logrotate:retain 7 || true
pm2 set pm2-logrotate:compress true || true

# 6. Install Caddy Web Server (Official Repository)
if ! command -v caddy > /dev/null 2>&1; then
    echo "🌐 Installing Caddy Web Server..."
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
    systemctl enable caddy
    echo "✅ Caddy installed."
else
    echo "ℹ️  Caddy is already installed."
fi

# 7. Configure UFW Firewall
echo "🛡️  Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo "✅ UFW active: Only ports 22, 80, 443 are open."

# 8. Configure Fail2ban for SSH Brute Force Protection
echo "🔒 Enabling Fail2ban for SSH protection..."
systemctl enable fail2ban
systemctl restart fail2ban

# 9. Create Dedicated Application User (fquiz)
if ! id -u fquiz > /dev/null 2>&1; then
    echo "👤 Creating dedicated 'fquiz' system user..."
    useradd -m -s /bin/bash -d /var/www/fquiz fquiz
    mkdir -p /var/www/fquiz/.ssh
    chmod 700 /var/www/fquiz/.ssh
    touch /var/www/fquiz/.ssh/authorized_keys
    chmod 600 /var/www/fquiz/.ssh/authorized_keys
    chown -R fquiz:fquiz /var/www/fquiz
    echo "✅ User 'fquiz' created at /var/www/fquiz."
else
    echo "ℹ️  User 'fquiz' already exists."
fi

# 10. Allow fquiz user to reload Caddy without full root password
echo 'fquiz ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy, /usr/bin/systemctl restart caddy' > /etc/sudoers.d/fquiz-caddy
chmod 440 /etc/sudoers.d/fquiz-caddy

# 11. Configure PM2 Startup Hook for fquiz user
env PATH=$PATH:/usr/bin pm2 startup systemd -u fquiz --hp /var/www/fquiz || true

echo "=================================================================="
echo "🎉 FQuiz VPS Provisioning & Hardening Completed Successfully!"
echo "   Next steps:"
echo "   1. Add your SSH public key to: /var/www/fquiz/.ssh/authorized_keys"
echo "   2. Clone repo to: /var/www/fquiz/app"
echo "   3. Create: /var/www/fquiz/app/.env.production"
echo "   4. Configure Caddy: sudo cp /var/www/fquiz/app/deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy"
echo "=================================================================="
