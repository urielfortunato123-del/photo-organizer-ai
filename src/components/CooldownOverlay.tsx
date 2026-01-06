import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timer, Coffee, Sparkles, Volume2, VolumeX, SkipForward, Bell, BellOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CooldownOverlayProps {
  isActive: boolean;
  durationSeconds: number;
  onComplete: () => void;
  onSkip?: () => void;
  processedCount: number;
  nextBatchCount: number;
  totalRemaining: number;
  estimatedTotalTime?: string;
}

const CooldownOverlay: React.FC<CooldownOverlayProps> = ({
  isActive,
  durationSeconds,
  onComplete,
  onSkip,
  processedCount,
  nextBatchCount,
  totalRemaining,
  estimatedTotalTime,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifyEnabled, setBrowserNotifyEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      setBrowserNotifyEnabled(true);
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setBrowserNotifyEnabled(permission === 'granted');
    }
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (!browserNotifyEnabled || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'obraphoto-cooldown',
      });
    }
  }, [browserNotifyEnabled]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Pleasant notification melody
      oscillator.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio notification not available');
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!isActive) {
      setRemainingSeconds(durationSeconds);
      return;
    }

    setRemainingSeconds(durationSeconds);
    
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          playNotificationSound();
          sendBrowserNotification(
            'ObraPhoto - Cooldown Finalizado!',
            `Iniciando próximo lote de ${nextBatchCount} fotos...`
          );
          onComplete();
          return 0;
        }
        // Play a tick sound at 10 seconds remaining
        if (prev === 11) {
          playNotificationSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, durationSeconds, onComplete, playNotificationSound, sendBrowserNotification, nextBatchCount]);

  if (!isActive) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = ((durationSeconds - remainingSeconds) / durationSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6 p-8 max-w-lg">
        {/* Animated Timer Ring */}
        <div className="relative w-48 h-48 mx-auto">
          {/* Background ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            {/* Progress ring */}
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary transition-all duration-1000"
              style={{
                strokeDasharray: 2 * Math.PI * 88,
                strokeDashoffset: 2 * Math.PI * 88 * (1 - progress / 100),
              }}
            />
          </svg>
          
          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Timer className="w-8 h-8 text-primary mb-2 animate-pulse" />
            <span className="text-5xl font-bold text-foreground font-mono tracking-wider">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
            <Coffee className="w-6 h-6 text-primary" />
            Intervalo de Processamento
          </h2>
          <p className="text-muted-foreground">
            Aguardando para não sobrecarregar a IA...
          </p>
          {estimatedTotalTime && (
            <p className="text-sm text-primary flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo total estimado: {estimatedTotalTime}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 bg-card/50 rounded-2xl p-4 border border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{processedCount}</p>
            <p className="text-xs text-muted-foreground">Processadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{nextBatchCount}</p>
            <p className="text-xs text-muted-foreground">Próximo Lote</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{totalRemaining}</p>
            <p className="text-xs text-muted-foreground">Na Fila</p>
          </div>
        </div>

        {/* Skip Button */}
        {onSkip && (
          <Button
            onClick={onSkip}
            variant="outline"
            size="lg"
            className="w-full border-primary/50 text-primary hover:bg-primary/10"
          >
            <SkipForward className="w-5 h-5 mr-2" />
            Pular Cooldown e Continuar
          </Button>
        )}

        {/* Sound & Browser Notification toggles */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-muted-foreground hover:text-foreground"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 mr-2" />
            ) : (
              <VolumeX className="w-4 h-4 mr-2" />
            )}
            {soundEnabled ? 'Som ativado' : 'Som desativado'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!browserNotifyEnabled) {
                requestNotificationPermission();
              } else {
                setBrowserNotifyEnabled(false);
              }
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {browserNotifyEnabled ? (
              <Bell className="w-4 h-4 mr-2" />
            ) : (
              <BellOff className="w-4 h-4 mr-2" />
            )}
            {browserNotifyEnabled ? 'Notificações ativas' : 'Ativar notificações'}
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">
            O próximo lote iniciará automaticamente
          </span>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CooldownOverlay;
