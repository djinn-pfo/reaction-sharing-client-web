/**
 * IndexedDB Manager for Laugh Presets
 *
 * 笑い声プリセットをIndexedDBに保存・取得するマネージャークラス
 */

import type { LaughPresetDB } from '../../types/laugh';

const DB_NAME = 'LolupLiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'laughPresets';

export class IndexedDBManager {
  private db: IDBDatabase | null = null;

  /**
   * データベースを開く
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Object Storeを作成
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('pattern', 'pattern', { unique: false });
          objectStore.createIndex('level', 'level', { unique: false });

          console.log(`📦 [IndexedDB] Created object store: ${STORE_NAME}`);
        }
      };
    });
  }

  /**
   * プリセットを保存
   */
  async savePreset(preset: LaughPresetDB): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(preset);
      request.onsuccess = () => {
        console.log(`💾 [IndexedDB] Saved preset: ${preset.id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * プリセットを取得
   */
  async getPreset(presetId: string): Promise<LaughPresetDB | null> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(presetId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 全プリセットを取得
   */
  async getAllPresets(): Promise<LaughPresetDB[]> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * パターンで検索
   */
  async getPresetsByPattern(pattern: string): Promise<LaughPresetDB[]> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('pattern');

    return new Promise((resolve, reject) => {
      const request = index.getAll(pattern);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * プリセットを削除
   */
  async deletePreset(presetId: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(presetId);
      request.onsuccess = () => {
        console.log(`🗑️ [IndexedDB] Deleted preset: ${presetId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 全プリセットを削除
   */
  async clearAll(): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log(`🗑️ [IndexedDB] Cleared all presets`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * プリセット数を取得
   */
  async count(): Promise<number> {
    const db = await this.open();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * データベースを閉じる
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log(`🔒 [IndexedDB] Database closed`);
    }
  }
}
