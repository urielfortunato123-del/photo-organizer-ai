import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, Play, X, AlertTriangle, FolderOpen, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  current: number;
  total: number;
  currentFileName?: string;
  startTime?: number;
  successCount: number;
  errorCount: number;
  onCancel: () => void;
  onViewResults: () => void;
  onProcessMore: () => void;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isProcessing,
  current,
  total,
  currentFileName,
  startTime,
  successCount,
  errorCount,
  onCancel,
  onViewResults,
  onProcessMore,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const notifiedRef = useRef(false);
  
  const { 
    isSupported, 
    permission, 
    requestPermission, 
    notifyProcessingComplete 
  } = useBrowserNotifications();
  
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  
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

  // Detect completion and send notification
  useEffect(() => {
    if (!isProcessing && current > 0 && current >= total) {
      setIsCompleted(true);
      
      // Send browser notification only once
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notifyProcessingComplete(successCount, errorCount);
      }
    } else if (isProcessing) {
      setIsCompleted(false);
      notifiedRef.current = false;
    }
  }, [isProcessing, current, total, successCount, errorCount, notifyProcessingComplete]);

  if (!isProcessing && !isCompleted) return null;

  const estimatedTime = getEstimatedTime();

  return (
    <>
      {/* Semi-transparent overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="glass-card p-8 max-w-md w-full mx-4 space-y-6 animate-scale-in">
          {isCompleted ? (
            // Completed state
            <>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Processamento concluído!
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {successCount} {successCount === 1 ? 'foto processada' : 'fotos processadas'} com sucesso
                    {errorCount > 0 && (
                      <span className="text-destructive ml-1">
                        , {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-success/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-success">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Sucesso</p>
                </div>
                <div className={cn(
                  "rounded-xl p-4 text-center",
                  errorCount > 0 ? "bg-destructive/10" : "bg-secondary"
                )}>
                  <p className={cn(
                    "text-2xl font-bold",
                    errorCount > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setIsCompleted(false);
                    onViewResults();
                  }}
                  className="w-full gnome-btn-primary"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Ver Resultados
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCompleted(false);
                    onProcessMore();
                  }}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Processar Mais
                </Button>
              </div>
            </>
          ) : (
            // Processing state
            <>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Processando fotos...
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Por favor, aguarde
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-3">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">{progress}%</span>
                  <span className="text-muted-foreground">
                    {current} de {total} fotos
                  </span>
                </div>
              </div>

              {/* Current file */}
              {currentFileName && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Processando agora:</p>
                  <p className="text-sm text-foreground truncate font-mono">
                    {currentFileName}
                  </p>
                </div>
              )}

              {/* Estimated time */}
              {estimatedTime && (
                <p className="text-center text-sm text-muted-foreground">
                  {estimatedTime}
                </p>
              )}

              {/* Notification toggle & Cancel button */}
              <div className="flex gap-2">
                {isSupported && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={requestPermission}
                    className={cn(
                      "shrink-0",
                      permission === 'granted' 
                        ? "border-primary/50 text-primary" 
                        : "border-muted text-muted-foreground"
                    )}
                    title={permission === 'granted' ? 'Notificações ativas' : 'Ativar notificações'}
                  >
                    {permission === 'granted' ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Cancelar Processamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O processamento será interrompido. As fotos já processadas serão mantidas.
              <br /><br />
              <strong>{current} de {total}</strong> fotos já foram processadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Processando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelConfirm(false);
                onCancel();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProcessingOverlay;
