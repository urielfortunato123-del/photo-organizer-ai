import React from 'react';
import { Loader2, Clock, FileImage, Layers, Pause, Play, XCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProcessingProgressProps {
  current: number;
  total: number;
  currentFileName?: string;
  startTime?: number;
  isProcessing: boolean;
  isPaused?: boolean;
  currentBatch?: number;
  totalBatches?: number;
  queued?: number;
  errorsCount?: number;
  onAbort?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onShowErrors?: () => void;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  current,
  total,
  currentFileName,
  startTime,
  isProcessing,
  isPaused = false,
  currentBatch,
  totalBatches,
  queued,
  errorsCount = 0,
  onAbort,
  onPause,
  onResume,
  onShowErrors,
}) => {
  if (!isProcessing || total === 0) return null;

  const progress = Math.round((current / total) * 100);
  
  // Calculate estimated time remaining
  const getEstimatedTime = () => {
    if (!startTime || current === 0) return null;
    
    const elapsed = Date.now() - startTime;
    const avgTimePerFile = elapsed / current;
    const remaining = (total - current) * avgTimePerFile;
    
    if (remaining < 1000) return 'Finalizando...';
    if (remaining < 60000) return `~${Math.ceil(remaining / 1000)}s restantes`;
    return `~${Math.ceil(remaining / 60000)}min restantes`;
  };

  const estimatedTime = getEstimatedTime();

  return (
    <div className="glass-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isPaused ? "bg-yellow-500/20" : "bg-primary/20"
          )}>
            {isPaused ? (
              <Pause className="w-5 h-5 text-yellow-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isPaused ? 'Pausado' : `Processando ${current} de ${total} fotos`}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {currentFileName && (
                <span className="flex items-center gap-1">
                  <FileImage className="w-3 h-3" />
                  {currentFileName}
                </span>
              )}
              {currentBatch && totalBatches && (
                <span className="flex items-center gap-1 ml-2">
                  <Layers className="w-3 h-3" />
                  Lote {currentBatch}/{totalBatches}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {errorsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowErrors}
              className="h-8 text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {errorsCount} erro{errorsCount > 1 ? 's' : ''}
            </Button>
          )}
          
          {estimatedTime && !isPaused && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {estimatedTime}
            </div>
          )}
          
          {/* Pause/Resume button */}
          {isPaused ? (
            onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="h-8 text-green-500 border-green-500/50 hover:bg-green-500/10"
              >
                <Play className="w-3 h-3 mr-1" />
                Continuar
              </Button>
            )
          ) : (
            onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                className="h-8 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10"
              >
                <Pause className="w-3 h-3 mr-1" />
                Pausar
              </Button>
            )
          )}
          
          {onAbort && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAbort}
              className="h-8 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={progress} className={cn("h-2", isPaused && "opacity-50")} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% concluído</span>
          <div className="flex gap-3">
            {queued !== undefined && queued > 0 && (
              <span className="text-primary">{queued} na fila</span>
            )}
            <span>{total - current} restantes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;
