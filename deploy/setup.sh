#!/bin/bash
# ==============================================
# EduRank AWS EC2 Setup Script (Ubuntu 22.04)
# Run: bash setup.sh
# ==============================================

set -e

echo "=== 1. Update system ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== 2. Install Python & pip ==="
sudo apt-get install -y python3 python3-pip python3-venv

echo "=== 3. Install Node.js (v18) ==="
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 4. Install nginx ==="
sudo apt-get install -y nginx

echo "=== 5. Setup backend ==="
cd /home/ubuntu/Grade/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "=== 6. Build frontend ==="
cd /home/ubuntu/Grade/frontend
npm install
npm run build

echo "=== 7. Setup nginx config ==="
sudo cp /home/ubuntu/Grade/deploy/nginx.conf /etc/nginx/sites-available/edurank
sudo ln -sf /etc/nginx/sites-available/edurank /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== 8. Create systemd service for Flask ==="
sudo tee /etc/systemd/system/edurank.service > /dev/null <<EOF
[Unit]
Description=EduRank Flask API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/Grade/backend
Environment="PATH=/home/ubuntu/Grade/backend/venv/bin"
ExecStart=/home/ubuntu/Grade/backend/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:5000 wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start edurank
sudo systemctl enable edurank

echo ""
echo "=== Done! ==="
echo "Backend : http://YOUR_EC2_IP:5000"
echo "Frontend: http://YOUR_EC2_IP"
