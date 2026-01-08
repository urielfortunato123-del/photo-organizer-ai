import { useState, useEffect, useCallback } from 'react';

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null;
    
    try {
      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch {
      return null;
    }
  }, [isSupported, permission]);

  const notifyProcessingComplete = useCallback((
    successCount: number,
    errorCount: number
  ) => {
    if (document.visibilityState === 'visible') return;

    const title = errorCount > 0 
      ? 'Processamento concluído com avisos'
      : 'Processamento concluído!';
    
    const body = errorCount > 0
      ? `${successCount} fotos processadas, ${errorCount} com erro`
      : `${successCount} fotos processadas com sucesso`;

    sendNotification(title, { body, tag: 'processing-complete' });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyProcessingComplete,
  };
};
