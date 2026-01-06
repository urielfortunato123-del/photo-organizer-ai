import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'obraphoto_files';
const STORE_NAME = 'uploaded_files';
const DB_VERSION = 1;

interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  data: ArrayBuffer;
  relativePath?: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const useFileStorage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [storedCount, setStoredCount] = useState(0);

  // Check stored count on mount
  useEffect(() => {
    const checkCount = async () => {
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          setStoredCount(countRequest.result);
          setIsLoading(false);
        };
        countRequest.onerror = () => setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };
    checkCount();
  }, []);

  // Save files to IndexedDB
  const saveFiles = useCallback(async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing files first
    store.clear();
    
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const storedFile: StoredFile = {
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        data: arrayBuffer,
        relativePath: (file as any).webkitRelativePath || undefined,
      };
      store.put(storedFile);
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        setStoredCount(files.length);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, []);

  // Load files from IndexedDB
  const loadFiles = useCallback(async (): Promise<File[]> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const storedFiles: StoredFile[] = request.result;
          const files = storedFiles.map(sf => {
            const blob = new Blob([sf.data], { type: sf.type });
            const file = new File([blob], sf.name, {
              type: sf.type,
              lastModified: sf.lastModified,
            });
            // Preserve relative path if available
            if (sf.relativePath) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: sf.relativePath,
                writable: false,
              });
            }
            return file;
          });
          resolve(files);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error loading files:', error);
      return [];
    }
  }, []);

  // Clear all stored files
  const clearFiles = useCallback(async (): Promise<void> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      
      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          setStoredCount(0);
          resolve();
        };
        transaction.onerror = () => resolve();
      });
    } catch {
      // Ignore errors
    }
  }, []);

  // Get storage info
  const getStorageInfo = useCallback(async (): Promise<{ count: number; size: number }> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const files: StoredFile[] = request.result;
          const totalSize = files.reduce((acc, f) => acc + f.size, 0);
          resolve({ count: files.length, size: totalSize });
        };
        request.onerror = () => resolve({ count: 0, size: 0 });
      });
    } catch {
      return { count: 0, size: 0 };
    }
  }, []);

  return {
    saveFiles,
    loadFiles,
    clearFiles,
    getStorageInfo,
    isLoading,
    storedCount,
  };
};
