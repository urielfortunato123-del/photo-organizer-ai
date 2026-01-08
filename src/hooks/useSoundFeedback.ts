import { useCallback, useState, useEffect } from 'react';

const SOUNDS = {
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkYR5cmx0gI2dpqWci4B1b3J7i5yjpJ2Rhn91bnN/jJujo6CUiH95c3V+jJqipJ+VioB6dHZ+i5igoZ6WjIJ8d3d9ipaen52Yi4R+eXl8iZSbnZqUjYaAfHt8iJKZmpeTj4mDf3x7hpCXmJaSkY2Hg4B+hI+VlpWRkI2KhoOBhI2TlJOQj42LiYaEhYqQkpKQj46NjIqIhoeJjo+Qj46OjY2LiomIiYuNjo6Ojo6NjYyLioqKi4yNjY2NjY2NjIyLi4uLjIyMjIyMjIyMjIyLi4uLi4yMjIyMjIyMjIyMjIuLi4uLi4yMjIyMjIyMjIyMjIyLi4uLi4yMjIyMjIyMjIyMjIyMjIuLi4yMjIyMjIyMjIyMjIyMjIyMi4uLjIyMjIyMjIyMjIyMjIyMjIyMi4yMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyM',
  error: 'data:audio/wav;base64,UklGRiQFAABXQVZFZm10IBAAAAABAAEAQhkAAEIZAAABAAgAZGF0YQAFAACQkJCQkJCQkJCQkJCQkJCQkJCQj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5CQkJCQkJCQkJCQkJCQkJCQkJCQkI+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+QkJCQkJCQkJCQkJCQkJCQkJCQkJCPj4+Pj4+Pj4+Pj4+Pj4+Pj4+PkJCQkJCQkJCQkJCQkJCQkJCQkJCQj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5CQkJCQkJCQkJCQkJCQkJCQkJCQkI+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+QkJCQkJCQkJCQkJCQkJCQkJCQkJCPj4+Pj4+Pj4+Pj4+Pj4+Pj4+PkJCQkJCQkJCQkJCQkJCQkJCQkJCQj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj5CQkJCQkJCQkJCQkJCQkJCQkJCQkI+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+QkJCQkJCQkJCQkJCQkJCQkJCQkJCPj4+Pj4+Pj4+Pj4+Pj4+Pj4+P',
};

export const useSoundFeedback = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playSound = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled]);

  const playSuccess = useCallback(() => playSound('success'), [playSound]);
  const playError = useCallback(() => playSound('error'), [playSound]);

  return {
    soundEnabled,
    setSoundEnabled,
    playSuccess,
    playError,
  };
};
