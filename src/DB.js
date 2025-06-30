import { openDB } from 'idb';

const DB_NAME = 'BillZoDB';
const DB_VERSION = 1;

async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
        
      ['products','cart', 'kot','categories','customers','orders'].forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
        }
      });
    }
  });
}

export async function getAll(storeName) {
  const db = await initDB();
  return db.getAll(storeName);
}

export async function saveItems(storeName, items) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  await store.clear();                       // ← wipe out old entries
  for (const item of items) {
    store.put(item);                         // ← put() will overwrite by key if it already exists
  }

  await tx.done;
}

// DB.js

export async function addItem(storeName, item) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
  
    store.put(item);   // put() will overwrite an existing entry with the same key
    await tx.done;
  }
  

export async function clearStore(storeName) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function deleteItem(storeName, key) {
    const db = await initDB();
    return db.delete(storeName, key);
  }