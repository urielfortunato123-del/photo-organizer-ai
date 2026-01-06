import React, { useState, useEffect, useCallback } from 'react';
import { Timer, Coffee, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CooldownOverlayProps {
  isActive: boolean;
  durationSeconds: number;
  onComplete: () => void;
  processedCount: number;
  nextBatchCount: number;
  totalRemaining: number;
}

const CooldownOverlay: React.FC<CooldownOverlayProps> = ({
  isActive,
  durationSeconds,
  onComplete,
  processedCount,
  nextBatchCount,
  totalRemaining,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

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
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, durationSeconds, onComplete]);

  if (!isActive) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = ((durationSeconds - remainingSeconds) / durationSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-8 p-8 max-w-md">
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
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
            <Coffee className="w-6 h-6 text-primary" />
            Intervalo de Processamento
          </h2>
          <p className="text-muted-foreground">
            Aguardando para não sobrecarregar a IA...
          </p>
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

        {/* Animated dots */}
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
