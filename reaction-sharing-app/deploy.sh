#!/bin/bash

# VPSデプロイスクリプト
# 使い方: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# VPSの情報 (ここを編集)
VPS_USER="lol_bouya"
VPS_HOST="os3-294-36938.vs.sakura.ne.jp"
VPS_PATH="/var/www/reaction-sharing-app"

# 環境変数の確認
echo "📋 Checking environment variables..."
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production not found!"
  exit 1
fi

echo "✅ Environment file found"

# 依存関係のチェック
echo "📦 Checking dependencies..."
if ! command -v yarn &> /dev/null; then
  echo "❌ Error: yarn is not installed!"
  echo "Please install yarn: npm install -g yarn"
  exit 1
fi

echo "✅ Dependencies checked"

# ビルド
echo "📦 Building production bundle with yarn..."
yarn build

# ビルド成功確認
if [ ! -d "dist" ]; then
  echo "❌ Error: Build failed! dist directory not found."
  exit 1
fi

echo "✅ Build completed successfully"

# デプロイ前確認
echo ""
echo "📤 Ready to deploy to VPS..."
echo "   User: ${VPS_USER}"
echo "   Host: ${VPS_HOST}"
echo "   Path: ${VPS_PATH}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Deployment cancelled"
  exit 1
fi

# デプロイ
echo "📤 Deploying to VPS..."
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env*' \
  --exclude 'src' \
  --exclude 'public' \
  --exclude '*.ts' \
  --exclude '*.tsx' \
  --exclude 'tsconfig.json' \
  --exclude 'vite.config.ts' \
  --exclude 'package.json' \
  --exclude 'yarn.lock' \
  dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://os3-294-36938.vs.sakura.ne.jp"
echo ""
echo "📝 Next steps:"
echo "   1. Verify the app is working correctly"
echo "   2. Check browser console for any errors"
echo "   3. Test laugh preset functionality"
echo ""
