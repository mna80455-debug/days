const DB_NAME = 'days_app_db';
const STORE_NAME = 'vision_board';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const saveVisionImages = async (uid, images) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(images, uid);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed:', err);
  }
};

export const loadVisionImages = async (uid) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(uid);
      request.onsuccess = (e) => resolve(e.target.result || Array(6).fill(''));
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB load failed:', err);
    return Array(6).fill('');
  }
};
