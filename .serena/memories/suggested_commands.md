# 推奨コマンド

## プロジェクトセットアップ（初回のみ）
```bash
# Reactプロジェクト初期化
npm create vite@latest reaction-sharing-app -- --template react-ts
cd reaction-sharing-app

# 依存関係インストール
npm install react-router-dom axios @mediapipe/tasks-vision
npm install -D @types/react-router-dom tailwindcss postcss autoprefixer
npm install -D jest @testing-library/react @testing-library/jest-dom

# Tailwind CSS設定
npx tailwindcss init -p

# プロジェクト構造作成
mkdir -p src/{components,contexts,hooks,services,types,utils,workers,config}
mkdir -p src/components/{common,lobby,session}
```

## 開発コマンド
```bash
# 開発サーバー起動（HTTPS必須）
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npx tsc --noEmit

# Linting
npm run lint

# テスト実行
npm run test

# E2Eテスト
npm run test:e2e
```

## Docker関連
```bash
# バックエンドサービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f signaling
docker-compose logs -f ion-sfu

# サービス停止
docker-compose down
```

## Git関連
```bash
# 変更確認
git status

# ファイル追加
git add .

# コミット
git commit -m "feat: implement feature"

# プッシュ
git push origin main
```

## 環境設定ファイル
- `.env.development` - 開発環境設定
- `.env.production` - 本番環境設定
- `vite.config.ts` - Vite設定
- `tailwind.config.js` - Tailwind CSS設定
- `tsconfig.json` - TypeScript設定