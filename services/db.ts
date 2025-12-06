
import { RecentDesign } from '../types';

const DB_NAME = 'SpecFactoryDB';
const STORE_NAME = 'designs';
const VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveRecentDesign = async (design: RecentDesign): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // We overwrite if ID exists, or add new
      store.put(design);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save to IndexedDB", e);
    // Fallback or silent fail to prevent app crash
  }
};

export const getRecentDesigns = async (): Promise<RecentDesign[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as RecentDesign[];
        // Sort by ID (timestamp) descending
        results.sort((a, b) => Number(b.id) - Number(a.id));
        // Limit to most recent 10 to keep things snappy
        resolve(results.slice(0, 10));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load from IndexedDB", e);
    return [];
  }
};
