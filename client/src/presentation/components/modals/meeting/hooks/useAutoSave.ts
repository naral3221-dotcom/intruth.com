/**
 * useAutoSave - 회의자료 자동저장 훅
 * localStorage에 임시 저장하고, 선택적으로 서버에 DRAFT로 저장
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveConfig {
  /** localStorage 키 */
  storageKey: string;
  /** 디바운스 시간 (ms) */
  debounceMs?: number;
  /** 서버 저장 콜백 (선택) */
  onServerSave?: (data: unknown) => Promise<void>;
  /** 서버 저장 간격 (ms, 선택) */
  serverSaveInterval?: number;
}

interface AutoSaveReturn<T> {
  /** 저장 상태 */
  status: SaveStatus;
  /** 마지막 저장 시간 */
  lastSavedAt: Date | null;
  /** 데이터 저장 (디바운스됨) */
  save: (data: T) => void;
  /** 즉시 저장 */
  saveNow: (data: T) => void;
  /** 저장된 데이터 불러오기 */
  loadSavedData: () => T | null;
  /** 저장된 데이터 삭제 */
  clearSavedData: () => void;
}

export function useAutoSave<T>(config: AutoSaveConfig): AutoSaveReturn<T> {
  const {
    storageKey,
    debounceMs = 2000,
    onServerSave,
    serverSaveInterval = 5 * 60 * 1000, // 5분
  } = config;

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastServerSaveRef = useRef<number>(0);
  const dataRef = useRef<T | null>(null);

  // localStorage에 저장
  const saveToLocalStorage = useCallback((data: T) => {
    try {
      const saveData = {
        data,
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setLastSavedAt(new Date());
      setStatus('saved');
    } catch (error) {
      console.error('Auto-save to localStorage failed:', error);
      setStatus('error');
    }
  }, [storageKey]);

  // 서버에 저장 (선택적)
  const saveToServer = useCallback(async (data: T) => {
    if (!onServerSave) return;

    const now = Date.now();
    if (now - lastServerSaveRef.current < serverSaveInterval) {
      return; // 서버 저장 간격 미달
    }

    try {
      setStatus('saving');
      await onServerSave(data);
      lastServerSaveRef.current = now;
      setStatus('saved');
    } catch (error) {
      console.error('Auto-save to server failed:', error);
      setStatus('error');
    }
  }, [onServerSave, serverSaveInterval]);

  // 디바운스된 저장
  const debouncedSave = useDebouncedCallback((data: T) => {
    dataRef.current = data;
    saveToLocalStorage(data);
    saveToServer(data);
  }, debounceMs);

  // 즉시 저장
  const saveNow = useCallback((data: T) => {
    debouncedSave.cancel();
    dataRef.current = data;
    saveToLocalStorage(data);
    saveToServer(data);
  }, [debouncedSave, saveToLocalStorage, saveToServer]);

  // 저장된 데이터 불러오기
  const loadSavedData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      if (parsed.data) {
        setLastSavedAt(new Date(parsed.savedAt));
        return parsed.data as T;
      }
      return null;
    } catch (error) {
      console.error('Failed to load saved data:', error);
      return null;
    }
  }, [storageKey]);

  // 저장된 데이터 삭제
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSavedAt(null);
      setStatus('idle');
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }, [storageKey]);

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (dataRef.current) {
        saveToLocalStorage(dataRef.current);
      }
    };
  }, [saveToLocalStorage]);

  return {
    status,
    lastSavedAt,
    save: debouncedSave,
    saveNow,
    loadSavedData,
    clearSavedData,
  };
}

/**
 * 자동저장 상태 표시 컴포넌트에서 사용할 텍스트
 */
export function getSaveStatusText(status: SaveStatus, lastSavedAt: Date | null): string {
  switch (status) {
    case 'saving':
      return '저장 중...';
    case 'saved':
      if (lastSavedAt) {
        const diff = Date.now() - lastSavedAt.getTime();
        if (diff < 60000) return '방금 저장됨';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전 저장됨`;
        return `${Math.floor(diff / 3600000)}시간 전 저장됨`;
      }
      return '저장됨';
    case 'error':
      return '저장 실패';
    default:
      return '';
  }
}
