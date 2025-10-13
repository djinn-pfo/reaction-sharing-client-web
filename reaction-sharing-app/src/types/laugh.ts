/**
 * 笑い声プリセットシステム - 型定義
 *
 * このファイルは笑い声プリセット機能に関する全ての型定義を含みます。
 */

/**
 * プリセット情報（API取得用）
 */
export interface LaughPreset {
  /** プリセットID（例: "male1_small"） */
  id: string;

  /** パターン名（例: "male1"） */
  pattern: string;

  /** レベル（small | medium | large） */
  level: string;

  /** 音声ファイルのURL（例: "/static/laughs/presets/male1_small.wav"） */
  url: string;

  /** 音声の長さ（秒） */
  duration: number;

  /** ファイルサイズ（バイト） */
  size: number;
}

/**
 * バックエンドAPIレスポンス（実際の形式）
 */
export interface BackendPresetItem {
  /** パターンID（例: "male1", "female1"） */
  id: string;

  /** 性別（実際は使わない） */
  gender: string;

  /** レベルごとのファイルURL */
  files: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface BackendPresetsResponse {
  status: string;
  totalSize: number;
  presets: BackendPresetItem[];
}

/**
 * プリセット一覧APIレスポンス（フロントエンド内部用）
 */
export interface PresetsResponse {
  /** プリセットの配列（18個） */
  presets: LaughPreset[];
}

/**
 * IndexedDB保存用プリセット
 */
export interface LaughPresetDB {
  /** プリセットID（Primary Key） */
  id: string;

  /** パターン名 */
  pattern: string;

  /** レベル */
  level: string;

  /** 音声の長さ（秒） */
  duration: number;

  /** ファイルサイズ（バイト） */
  size: number;

  /** WAVファイルのバイナリデータ */
  audioData: ArrayBuffer;

  /** ダウンロード日時（Unix timestamp） */
  downloadedAt: number;
}

/**
 * LocalStorage保存用設定
 */
export interface LaughSettings {
  /** 選択されたパターン（例: "male1"） */
  selectedPattern: string;

  /** 設定のバージョン */
  version: string;

  /** 更新日時（Unix timestamp） */
  updatedAt: number;
}

/**
 * 笑い声レベル
 */
export type LaughLevel = 'small' | 'medium' | 'large';

/**
 * 笑い声トリガー判定結果
 */
export interface LaughTriggerResult {
  /** トリガーすべきかどうか */
  shouldTrigger: boolean;

  /** 判定されたレベル（トリガーしない場合はnull） */
  level: LaughLevel | null;

  /** プリセットID（例: "male1_medium"、トリガーしない場合はnull） */
  presetId: string | null;
}

/**
 * パターン情報（UI表示用）
 */
export interface PatternInfo {
  /** パターンID（例: "male1"） */
  id: string;

  /** 表示ラベル（例: "男性1"） */
  label: string;

  /** 絵文字（例: "😄"） */
  emoji: string;
}

/**
 * WebSocketメッセージ: 笑い声トリガー（送信）
 */
export interface LaughTriggerMessage {
  /** メッセージタイプ */
  type: 'laugh:trigger';

  /** データ */
  data: {
    /** プリセットID */
    presetId: string;

    /** 送信タイムスタンプ */
    timestamp: number;
  };

  /** メッセージタイムスタンプ */
  timestamp: number;
}

/**
 * WebSocketメッセージ: 笑い声トリガー（受信・ブロードキャスト）
 */
export interface LaughTriggerBroadcastMessage {
  /** メッセージタイプ */
  type: 'laugh:trigger';

  /** 送信者のユーザーID */
  userId: string;

  /** データ */
  data: {
    /** プリセットID */
    presetId: string;

    /** 送信タイムスタンプ */
    timestamp: number;
  };

  /** メッセージタイムスタンプ */
  timestamp: number;
}
