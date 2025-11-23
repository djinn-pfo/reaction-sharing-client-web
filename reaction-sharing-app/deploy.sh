#!/bin/bash

# VPSデプロイスクリプト
# 使い方:
#   ./deploy.sh production  # 本番環境
#   ./deploy.sh development # 開発環境
#   yarn deploy            # 本番環境（ショートカット）
#   yarn deploy:dev        # 開発環境（ショートカット）

set -e

# 環境の指定（デフォルトはproduction）
ENV=${1:-production}

if [[ "$ENV" != "production" && "$ENV" != "development" ]]; then
  echo "❌ Error: Invalid environment. Use 'production' or 'development'"
  echo "Usage: ./deploy.sh [production|development]"
  exit 1
fi

echo "🚀 Starting $ENV deployment..."

# 環境別の設定
if [ "$ENV" = "production" ]; then
  VPS_USER="lolup"
  VPS_HOST="os3-294-36938.vs.sakura.ne.jp"
  VPS_PATH="/var/www/reaction-sharing-app"
  VPS_URL="https://os3-294-36938.vs.sakura.ne.jp"
  BUILD_DIR="dist"
  ENV_FILE=".env.production"
else
  # 開発環境の設定（必要に応じて変更してください）
  VPS_USER="lolup"
  VPS_HOST="os3-294-36938.vs.sakura.ne.jp"
  VPS_PATH="/var/www/reaction-sharing-app-dev"
  VPS_URL="https://dev.os3-294-36938.vs.sakura.ne.jp"
  BUILD_DIR="dist-dev"
  ENV_FILE=".env.development"
fi

# 環境変数の確認
echo "📋 Checking environment variables..."
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found!"
  echo "Please create $ENV_FILE based on .env.example"
  exit 1
fi

echo "✅ Environment file found: $ENV_FILE"

# 依存関係のチェック
echo "📦 Checking dependencies..."
if ! command -v yarn &> /dev/null; then
  echo "❌ Error: yarn is not installed!"
  echo "Please install yarn: npm install -g yarn"
  exit 1
fi

echo "✅ Dependencies checked"

# ビルド
echo "📦 Building $ENV bundle with yarn..."
if [ "$ENV" = "production" ]; then
  yarn build
else
  yarn build:dev
fi

# ビルド成功確認
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Error: Build failed! $BUILD_DIR directory not found."
  exit 1
fi

echo "✅ Build completed successfully"

# デプロイ前確認
echo ""
echo "📤 Ready to deploy to VPS ($ENV)..."
echo "   Environment: ${ENV}"
echo "   User: ${VPS_USER}"
echo "   Host: ${VPS_HOST}"
echo "   Path: ${VPS_PATH}"
echo "   Build Dir: ${BUILD_DIR}"
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
  ${BUILD_DIR}/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your app is now live at:"
echo "   ${VPS_URL}"
echo ""
echo "📝 Next steps:"
echo "   1. Verify the app is working correctly"
echo "   2. Check browser console for any errors"
echo "   3. Test laugh preset functionality"
echo "   4. Monitor logs for any issues"
echo ""
