// Minimal helpers for File System Access API + IndexedDB persistence
// Works in Chromium-based browsers. Falls back gracefully if unsupported.

// ---- IndexedDB key-value helpers ----
const DB_NAME = "bobinavisor-idb";
const STORE_NAME = "kv";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- FS Access helpers ----
export function isFsSupported() {
  return typeof window !== "undefined" && !!window.showDirectoryPicker;
}

const DIR_HANDLE_KEY = "directory-handle";

export async function saveDirectoryHandle(handle) {
  // FileSystemDirectoryHandle is structured-cloneable and can be saved in IDB
  try {
    await idbSet(DIR_HANDLE_KEY, handle);
    return true;
  } catch (e) {
    console.warn("No se pudo guardar el handle del directorio en IDB", e);
    return false;
  }
}

export async function getSavedDirectoryHandle() {
  try {
    return await idbGet(DIR_HANDLE_KEY);
  } catch (e) {
    console.warn("No se pudo obtener el handle del directorio desde IDB", e);
    return null;
  }
}

export async function verifyPermission(handle, readWrite = false) {
  try {
    const opts = { mode: readWrite ? "readwrite" : "read" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
    return false;
  } catch (e) {
    console.warn("Error verificando permiso del directorio", e);
    return false;
  }
}

export async function readCsvFilesFromDirectory(dirHandle) {
  const files = [];
  async function recurseDirectory(handle) {
    for await (const [name, entry] of handle.entries()) {
      try {
        if (entry.kind === "file") {
          if (name.toLowerCase().endsWith(".csv")) {
            const file = await entry.getFile();
            files.push(file);
          }
        } else if (entry.kind === "directory") {
          await recurseDirectory(entry);
        }
      } catch (e) {
        console.warn(`No se pudo leer entrada ${name}`, e);
      }
    }
  }
  await recurseDirectory(dirHandle);
  return files;
}
