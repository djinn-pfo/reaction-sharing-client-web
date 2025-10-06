#!/bin/bash

# VPSデプロイスクリプト
# 使い方: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# VPSの情報 (ここを編集)
VPS_USER="your-username"
VPS_HOST="your-vps-ip"
VPS_PATH="/var/www/reaction-sharing-app"

# ビルド
echo "📦 Building production bundle..."
npm run build

# デプロイ
echo "📤 Deploying to VPS..."
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env*' \
  dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo "✅ Deployment completed!"
echo "🌐 Visit: https://your-domain.com"
