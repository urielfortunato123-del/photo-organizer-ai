import { useCallback, useRef } from 'react';
import { ProcessingResult } from '@/services/api';

interface CacheEntry {
  hash: string;
  result: ProcessingResult;
  timestamp: number;
}

// Simple hash function for image data
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_KEY = 'obraphoto_image_cache';

function loadCache(): Map<string, CacheEntry> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    
    const entries: [string, CacheEntry][] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out expired entries
    const valid = entries.filter(([, entry]) => now - entry.timestamp < CACHE_TTL);
    return new Map(valid);
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, CacheEntry>): void {
  try {
    const entries = Array.from(cache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save cache:', e);
  }
}

export function useImageCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(loadCache());

  const getHash = useCallback(async (file: File): Promise<string> => {
    return hashFile(file);
  }, []);

  const getCached = useCallback((hash: string): ProcessingResult | null => {
    const entry = cacheRef.current.get(hash);
    if (!entry) return null;
    
    // Check if still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cacheRef.current.delete(hash);
      saveCache(cacheRef.current);
      return null;
    }
    
    return entry.result;
  }, []);

  const setCache = useCallback((hash: string, result: ProcessingResult): void => {
    cacheRef.current.set(hash, {
      hash,
      result,
      timestamp: Date.now()
    });
    saveCache(cacheRef.current);
  }, []);

  const setCacheBulk = useCallback((entries: { hash: string; result: ProcessingResult }[]): void => {
    const now = Date.now();
    entries.forEach(({ hash, result }) => {
      cacheRef.current.set(hash, { hash, result, timestamp: now });
    });
    saveCache(cacheRef.current);
  }, []);

  const clearCache = useCallback((): void => {
    cacheRef.current.clear();
    localStorage.removeItem(CACHE_KEY);
  }, []);

  const removeFromCache = useCallback((hash: string): void => {
    cacheRef.current.delete(hash);
    saveCache(cacheRef.current);
  }, []);

  const getCacheStats = useCallback((): { total: number; size: string } => {
    const total = cacheRef.current.size;
    const stored = localStorage.getItem(CACHE_KEY) || '';
    const sizeKB = (stored.length * 2) / 1024; // UTF-16
    return { 
      total, 
      size: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(1)} KB`
    };
  }, []);

  return {
    getHash,
    getCached,
    setCache,
    setCacheBulk,
    clearCache,
    removeFromCache,
    getCacheStats
  };
}

// Standalone function for use outside React
export async function getFileHash(file: File): Promise<string> {
  return hashFile(file);
}
