# パスワード保護機能 設計書

## 概要

reaction-sharing-appに、デフォルトユーザーによるパスワード認証機能を実装する。
パスワードを知っているユーザーのみがWebアプリケーションを使用できるようにする。

---

## 1. 認証アーキテクチャ

### 1.1 認証方式

**フロントエンドベース認証**（シンプルな実装）
- ローカルストレージを使用した認証状態管理
- セッションベースの認証トークン
- クライアント側でのパスワード照合

### 1.2 ユーザー管理

**デフォルトユーザー設定**
- 環境変数（`.env`）でユーザー名とパスワードを管理
- 環境変数例:
  - `VITE_DEFAULT_USERNAME` - ユーザー名（オプション）
  - `VITE_DEFAULT_PASSWORD_HASH` - パスワードハッシュ値
- パスワードはSHA-256でハッシュ化して保存

**プロジェクト設定値:**
- ユーザー名: `lolup_user`
- パスワード: `lollolup`
- パスワードハッシュ（SHA-256）: `02a65e04e69708a9fe8ce3e017e7557a5ca1079b9bbf1671a1f33e9b2887ceb6`

---

## 2. 機能要件

### 2.1 ログイン画面

**画面仕様:**
- パスワード入力フィールド（ユーザー名は固定またはオプション）
- ログインボタン
- エラーメッセージ表示エリア
- シンプルで使いやすいUI（Tailwind CSSで実装）
- パスワード表示/非表示トグル機能

**動作フロー:**
1. ユーザーがパスワードを入力
2. クライアント側でパスワードをSHA-256でハッシュ化
3. 環境変数の`VITE_DEFAULT_PASSWORD_HASH`と照合
4. 認証成功 → セッショントークン生成 → LocalStorage保存 → ホーム画面へ
5. 認証失敗 → エラーメッセージ表示

### 2.2 認証状態管理

**実装方法:**
- `AuthContext` の作成（React Context API使用）
- グローバルな認証状態の提供

**認証状態:**
```typescript
interface AuthState {
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}
```

**認証関数:**
- `login(password: string): Promise<boolean>` - ログイン処理
- `logout(): void` - ログアウト処理
- `checkAuth(): boolean` - 認証状態確認

**セッション管理:**
- LocalStorageに保存するデータ構造:
  ```typescript
  interface SessionData {
    token: string;        // ランダム生成されたセッショントークン
    expiresAt: number;    // Unix timestamp
  }
  ```
- デフォルト有効期限: 24時間（環境変数で設定可能）
- アプリ起動時にトークンの有効期限をチェック

### 2.3 ルート保護

**Protected Route コンポーネント:**
```
<ProtectedRoute>
  └─ 認証チェック
      ├─ 認証済み → 子コンポーネント表示
      └─ 未認証 → ログイン画面へリダイレクト
```

**保護対象ルート:**
- `/` - ロビー画面（LobbyView）
- `/room/:roomId` - セッション画面（SessionView）
- `/broadcast/:roomId` - 配信者画面（BroadcasterView）
- `/watch/:roomId` - 視聴者画面（ViewerView）

**非保護ルート:**
- `/login` - ログイン画面（新規追加）

---

## 3. ファイル構成

```
reaction-sharing-app/
├── src/
│   ├── contexts/
│   │   ├── WebRTCContext.tsx        # 既存
│   │   └── AuthContext.tsx          # 【新規】認証状態管理コンテキスト
│   ├── components/
│   │   ├── auth/                    # 【新規】認証関連コンポーネント
│   │   │   ├── LoginView.tsx        # ログイン画面
│   │   │   └── ProtectedRoute.tsx   # ルート保護コンポーネント
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx    # 既存
│   │   │   └── PasswordInput.tsx    # 【新規】パスワード入力コンポーネント
│   │   ├── lobby/                   # 既存
│   │   ├── session/                 # 既存
│   │   └── broadcast/               # 既存
│   ├── utils/
│   │   ├── auth.ts                  # 【新規】認証ユーティリティ
│   │   └── storage.ts               # 【新規】LocalStorage操作
│   ├── config/
│   │   ├── environment.ts           # 既存
│   │   └── auth.config.ts           # 【新規】認証設定
│   └── App.tsx                      # 【修正】ルート設定にログイン画面追加
├── .env.local                       # 【新規】ローカル環境変数（gitignore）
└── .env.example                     # 【新規】環境変数のサンプル
```

---

## 4. データフロー

### 4.1 起動時のフロー

```
App起動
  ↓
AuthContext初期化
  ↓
LocalStorageからセッションデータ取得
  ↓
  ├─ トークンが存在し、有効期限内
  │   ↓
  │   認証済み状態で起動（既存画面表示）
  │
  └─ トークンが存在しない、または期限切れ
      ↓
      未認証状態でログイン画面表示
```

### 4.2 ログイン時のフロー

```
ユーザーがパスワード入力
  ↓
ログインボタンクリック
  ↓
パスワードをSHA-256でハッシュ化
  ↓
環境変数VITE_DEFAULT_PASSWORD_HASHと比較
  ↓
  ├─ 一致
  │   ↓
  │   ランダムなセッショントークン生成
  │   ↓
  │   有効期限を計算（現在時刻 + 24時間）
  │   ↓
  │   LocalStorageに保存
  │   ↓
  │   AuthContextの状態を更新（authenticated: true）
  │   ↓
  │   ホーム画面（/）へリダイレクト
  │
  └─ 不一致
      ↓
      エラーメッセージ表示
      「パスワードが正しくありません」
```

### 4.3 ルートアクセス時のフロー

```
保護されたルートへのアクセス
  ↓
ProtectedRouteコンポーネント実行
  ↓
AuthContextから認証状態を取得
  ↓
  ├─ authenticated === true
  │   ↓
  │   子コンポーネント（実際のページ）を表示
  │
  └─ authenticated === false
      ↓
      /loginへリダイレクト
```

### 4.4 ログアウト時のフロー

```
ログアウトボタンクリック
  ↓
logout()関数実行
  ↓
LocalStorageからセッションデータ削除
  ↓
AuthContextの状態を更新（authenticated: false）
  ↓
/loginへリダイレクト
```

---

## 5. セキュリティ考慮事項

### 5.1 パスワード管理

**環境変数での管理:**
- `.env.local`ファイルでパスワードハッシュを管理
- `.env.local`は`.gitignore`に追加（絶対にコミットしない）
- 本番環境では環境変数として設定（デプロイ時に設定）

**ハッシュ化:**
- パスワードは必ずSHA-256でハッシュ化
- 平文パスワードは環境変数に保存しない
- クライアント側でもハッシュ化してから照合

### 5.2 クライアント側セキュリティ

**実装上の配慮:**
- パスワードの平文をメモリ上に長時間保持しない
- セッショントークンにはcrypto APIで生成したランダム文字列を使用
- トークンに必ず有効期限を設定
- LocalStorageへの保存時にJSON.stringifyで安全に保存

**セッション管理:**
- トークンは推測困難なランダム文字列（UUID v4など）
- 有効期限切れのトークンは自動削除
- ページリロード時に有効期限を再チェック

### 5.3 制限事項の明示

⚠️ **重要: この実装の限界について**

この実装は**フロントエンドのみの保護**であり、以下の制限があります:

1. **JavaScriptコードは誰でも閲覧可能**
   - ブラウザの開発者ツールでソースコード確認可能
   - ビルド後のコードも読み取り可能

2. **環境変数もビルド後のコードに含まれる**
   - `VITE_*`変数はビルド時にコードに埋め込まれる
   - 技術的な知識があれば抽出可能

3. **真の意味でのセキュリティは保証されない**
   - バイパスは技術的に可能
   - 一般ユーザーに対する簡易的な保護のみ

**適用用途:**
- プライベートな小規模利用
- デモ環境の簡易保護
- 開発環境のアクセス制限

**不適用用途:**
- 機密情報を扱うアプリケーション
- 商用サービス
- 法的な保護が必要な場合

### 5.4 推奨される追加セキュリティ対策（将来的な拡張）

**バックエンド実装（推奨）:**
- バックエンドAPIでの認証実装
- JWTトークンの使用
- データベースでのユーザー管理
- セッション管理の強化

**その他の対策:**
- HTTPSの強制（本番環境必須）
- レートリミット（ブルートフォース攻撃対策）
- IPアドレス制限
- 2要素認証（将来的に）

---

## 6. 環境変数設定

### 6.1 環境変数一覧

```env
# 認証機能の有効/無効
VITE_AUTH_ENABLED=true

# デフォルトユーザー名
VITE_DEFAULT_USERNAME=lolup_user

# パスワードのSHA-256ハッシュ値
# パスワード: "lollolup" のハッシュ
VITE_DEFAULT_PASSWORD_HASH=02a65e04e69708a9fe8ce3e017e7557a5ca1079b9bbf1671a1f33e9b2887ceb6

# セッション有効期限（時間単位）
VITE_SESSION_DURATION_HOURS=24
```

### 6.2 パスワードハッシュの生成方法

**方法1: Node.jsで生成**
```javascript
const crypto = require('crypto');
const password = 'your_password_here';
const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log(hash);
```

**方法2: ブラウザコンソールで生成**
```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

hashPassword('your_password_here').then(console.log);
```

**方法3: オンラインツール**
- SHA-256ハッシュ生成ツールを使用（信頼できるサイトのみ）
- 例: https://emn178.github.io/online-tools/sha256.html

### 6.3 ファイル配置

**.env.local（ローカル開発用）**
```env
VITE_AUTH_ENABLED=true
VITE_DEFAULT_USERNAME=lolup_user
VITE_DEFAULT_PASSWORD_HASH=02a65e04e69708a9fe8ce3e017e7557a5ca1079b9bbf1671a1f33e9b2887ceb6
VITE_SESSION_DURATION_HOURS=24
```

**.env.example（リポジトリにコミット）**
```env
# Authentication Settings
VITE_AUTH_ENABLED=true
VITE_DEFAULT_USERNAME=lolup_user
# Password: lollolup
VITE_DEFAULT_PASSWORD_HASH=02a65e04e69708a9fe8ce3e017e7557a5ca1079b9bbf1671a1f33e9b2887ceb6
VITE_SESSION_DURATION_HOURS=24

# How to generate password hash:
# echo -n "your_password" | shasum -a 256
# or use Node.js:
# node -e "console.log(require('crypto').createHash('sha256').update('your_password').digest('hex'))"
```

**.gitignore（必須）**
```
.env.local
.env*.local
```

---

## 7. UI/UX設計

### 7.1 ログイン画面

**レイアウト:**
```
┌─────────────────────────────────────┐
│                                     │
│          [アプリロゴ/タイトル]          │
│                                     │
│     ┌─────────────────────────┐    │
│     │   ログインカード          │    │
│     │                         │    │
│     │  パスワード認証          │    │
│     │  ┌──────────────────┐   │    │
│     │  │ [パスワード] [👁]  │   │    │
│     │  └──────────────────┘   │    │
│     │                         │    │
│     │  [  ログイン  ]          │    │
│     │                         │    │
│     │  ⚠ エラーメッセージ     │    │
│     └─────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**デザイン要素:**
- 中央配置のログインカード（max-width: 400px）
- アプリロゴまたはタイトルを上部に表示
- パスワードフィールド:
  - type="password" / type="text"切り替え可能
  - show/hideアイコンボタン
  - 十分な入力領域（padding, font-size）
- ログインボタン:
  - 青系の背景色（primary color）
  - ホバー時の色変化
  - ローディング状態表示（スピナー）
  - disabled状態のスタイル
- エラーメッセージ:
  - 赤文字（text-red-600）
  - フェードインアニメーション
  - アイコン付き（⚠️）

**アクセシビリティ:**
- ラベルの明確な記述
- フォームのaria属性設定
- Enterキーでログイン可能
- エラー時のスクリーンリーダー対応

### 7.2 既存画面への追加要素

**ヘッダーにログアウトボタン（オプション）:**
- 各画面の右上にログアウトボタン配置
- アイコン + テキスト、またはアイコンのみ
- クリックで確認ダイアログ表示（オプション）
- ログアウト後はログイン画面へ

**セッション期限切れ通知:**
- トースト通知またはモーダル
- 「セッションの有効期限が切れました。再度ログインしてください。」
- 自動的にログイン画面へリダイレクト

### 7.3 カラーパレット（既存のTailwind設定を使用）

```css
/* ログイン画面のカラースキーム例 */
- 背景: bg-gray-50
- カード: bg-white, shadow-lg
- ボーダー: border-gray-300
- プライマリボタン: bg-blue-600, hover:bg-blue-700
- エラー: text-red-600, bg-red-50
- 入力フィールド: border-gray-300, focus:border-blue-500
```

---

## 8. 実装優先順位

### Phase 1: 基本認証機能（MVP）

**目標:** 最小限の認証機能を実装し、動作確認

**実装内容:**
1. 環境変数設定（`.env.local`, `.env.example`）
2. 認証ユーティリティ作成（`utils/auth.ts`, `utils/storage.ts`）
3. AuthContext作成（`contexts/AuthContext.tsx`）
4. ログイン画面作成（`components/auth/LoginView.tsx`）
5. 基本的なスタイリング

**成果物:**
- ログイン画面でパスワード認証が可能
- 認証成功でホーム画面へ遷移
- LocalStorageにセッション保存

### Phase 2: ルート保護

**目標:** 全てのページを認証で保護

**実装内容:**
1. ProtectedRouteコンポーネント作成（`components/auth/ProtectedRoute.tsx`）
2. App.tsxのルート設定修正
   - `/login`ルート追加
   - 既存ルートをProtectedRouteでラップ
3. 認証状態に応じたリダイレクト実装

**成果物:**
- 未認証時は全ページでログイン画面にリダイレクト
- 認証済みユーザーのみ各ページアクセス可能

### Phase 3: UX改善

**目標:** ユーザー体験の向上

**実装内容:**
1. パスワード表示/非表示トグル（`components/common/PasswordInput.tsx`）
2. ローディング状態の表示
3. エラーメッセージのアニメーション
4. セッション期限切れ通知
5. ログアウト機能（ヘッダーにボタン追加）
6. リメンバーミー機能（オプション、有効期限延長）

**成果物:**
- スムーズなログイン体験
- 適切なフィードバック
- セッション管理の可視化

### Phase 4: 追加機能（オプション）

**実装内容:**
1. 自動ログアウト（タブ非アクティブ時）
2. 複数タブ間での認証状態同期
3. パスワード変更機能
4. ログイン履歴の記録

---

## 9. テスト計画

### 9.1 手動テスト項目

**ログイン機能:**
- [ ] 正しいパスワードでログイン成功
- [ ] 間違ったパスワードでログイン失敗
- [ ] 空パスワードでエラー表示
- [ ] Enterキーでログイン実行

**セッション管理:**
- [ ] ログイン後にLocalStorageにトークン保存確認
- [ ] ページリロード後も認証状態維持
- [ ] ブラウザを閉じて再度開いた際の動作確認
- [ ] 有効期限切れ後のログアウト確認

**ルート保護:**
- [ ] 未認証時にルートアクセスで/loginへリダイレクト
- [ ] 認証後に保護されたページアクセス可能
- [ ] ログアウト後に再度保護される

**UI/UX:**
- [ ] パスワード表示/非表示トグル動作
- [ ] ローディング状態の表示
- [ ] エラーメッセージの表示
- [ ] レスポンシブデザイン確認

### 9.2 自動テスト（将来的に）

**単体テスト:**
- auth.tsのハッシュ化関数
- storage.tsのLocalStorage操作
- AuthContextの状態管理

**統合テスト:**
- ログインフローのE2Eテスト
- ルート保護の動作確認

---

## 10. デプロイ時の注意事項

### 10.1 環境変数の設定

**Vercel / Netlify等:**
1. プロジェクト設定画面で環境変数を設定
2. 必要な変数:
   - `VITE_AUTH_ENABLED=true`
   - `VITE_DEFAULT_PASSWORD_HASH=<実際のハッシュ値>`
   - `VITE_SESSION_DURATION_HOURS=24`
3. デプロイ後に認証が有効か確認

### 10.2 セキュリティチェック

- [ ] `.env.local`がリポジトリにコミットされていないか確認
- [ ] 本番環境のパスワードハッシュが開発環境と異なるか確認
- [ ] HTTPSが有効化されているか確認
- [ ] ビルド成果物に機密情報が含まれていないか確認（※フロントエンドのため限界あり）

### 10.3 動作確認

- [ ] 本番環境でログイン機能が動作するか
- [ ] 正しいパスワードでログイン可能か
- [ ] セッションが維持されるか
- [ ] ログアウト機能が動作するか

---

## 11. 今後の拡張案

### 短期的な改善
- パスワードの強度チェック
- ログイン試行回数制限（ブルートフォース対策）
- セッションのアクティビティ監視

### 中期的な改善
- バックエンドAPIの実装
- JWTトークンベースの認証
- ユーザー登録機能
- パスワードリセット機能

### 長期的な改善
- OAuth認証（Google, GitHub等）
- 2要素認証（2FA）
- ロールベースアクセス制御（RBAC）
- 監査ログ

---

## 12. 参考リソース

### ドキュメント
- React Context API: https://react.dev/reference/react/useContext
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- LocalStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

### セキュリティ
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Frontend Security: https://frontendmasters.com/courses/web-security/

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-11-06 | 1.0.0 | 初版作成 |
| 2025-11-06 | 1.1.0 | デフォルトユーザー名とパスワード設定を追加<br>- ユーザー名: lolup_user<br>- パスワード: lollolup（ハッシュ値記載） |

---

## 付録: コードスニペット例

### A. パスワードハッシュ化関数

```typescript
// utils/auth.ts
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

### B. セッションデータの型定義

```typescript
// types/auth.ts
export interface SessionData {
  token: string;
  expiresAt: number;
}

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}
```

### C. 環境変数の型定義

```typescript
// config/auth.config.ts
export const authConfig = {
  enabled: import.meta.env.VITE_AUTH_ENABLED === 'true',
  passwordHash: import.meta.env.VITE_DEFAULT_PASSWORD_HASH || '',
  sessionDurationHours: Number(import.meta.env.VITE_SESSION_DURATION_HOURS) || 24,
} as const;
```

---

**このドキュメントは実装時の参照資料として使用してください。**
