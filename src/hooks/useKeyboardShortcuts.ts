import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onUpload?: () => void;
  onResults?: () => void;
  onTree?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement) {
      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape();
      }
      return;
    }

    // Ctrl/Cmd + key shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          handlers.onUpload?.();
          break;
        case 'r':
          e.preventDefault();
          handlers.onResults?.();
          break;
        case 'a':
          e.preventDefault();
          handlers.onTree?.();
          break;
      }
    }

    // Single key shortcuts
    if (e.key === 'Escape' && handlers.onEscape) {
      handlers.onEscape();
    }

    if (e.key === 'Delete' && handlers.onDelete) {
      handlers.onDelete();
    }
  }, [handlers]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
