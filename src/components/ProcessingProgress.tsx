import React from 'react';
import { Loader2, Clock, FileImage, Layers, Pause } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessingProgressProps {
  current: number;
  total: number;
  currentFileName?: string;
  startTime?: number;
  isProcessing: boolean;
  currentBatch?: number;
  totalBatches?: number;
  queued?: number;
  onAbort?: () => void;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  current,
  total,
  currentFileName,
  startTime,
  isProcessing,
  currentBatch,
  totalBatches,
  queued,
  onAbort,
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
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Processando {current} de {total} fotos
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
        
        <div className="flex items-center gap-3">
          {estimatedTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {estimatedTime}
            </div>
          )}
          {onAbort && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAbort}
              className="h-8 text-destructive hover:bg-destructive/10"
            >
              <Pause className="w-3 h-3 mr-1" />
              Pausar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
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
