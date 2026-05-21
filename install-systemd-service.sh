#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="lottaterra-api"
PROJECT_DIR_DEFAULT="/home/lottaterra/htdocs/lottaterra.com"
APP_USER_DEFAULT="lottaterra"
APP_GROUP_DEFAULT="lottaterra"
PORT_DEFAULT="3000"

PROJECT_DIR="${PROJECT_DIR:-$PROJECT_DIR_DEFAULT}"
APP_USER="${APP_USER:-$APP_USER_DEFAULT}"
APP_GROUP="${APP_GROUP:-$APP_GROUP_DEFAULT}"
APP_PORT="${APP_PORT:-$PORT_DEFAULT}"
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Jalankan script ini dengan sudo/root."
  exit 1
fi

cat > "${UNIT_FILE}" <<EOF
[Unit]
Description=LottaTerra API (Node.js)
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${PROJECT_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
ExecStart=/usr/bin/env node ${PROJECT_DIR}/server.js
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager
