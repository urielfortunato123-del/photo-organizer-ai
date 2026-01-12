import React from 'react';
import { Brain, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SmartFixStats } from '@/hooks/useAISmartFix';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AISmartFixIndicatorProps {
  stats: SmartFixStats;
  onLimparSinalizacoes?: () => void;
  className?: string;
}

const AISmartFixIndicator: React.FC<AISmartFixIndicatorProps> = ({ 
  stats, 
  onLimparSinalizacoes,
  className 
}) => {
  // Não mostra nada se nunca foi executado
  if (stats.total === 0 && !stats.emProgresso) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-xl border bg-card/50 backdrop-blur-sm",
      stats.emProgresso && "border-primary/50 bg-primary/5",
      !stats.emProgresso && stats.naoCorrigidos > 0 && "border-amber-500/50 bg-amber-500/5",
      !stats.emProgresso && stats.naoCorrigidos === 0 && stats.corrigidos > 0 && "border-green-500/50 bg-green-500/5",
      className
    )}>
      {/* Ícone principal */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full",
        stats.emProgresso && "bg-primary/20 animate-pulse",
        !stats.emProgresso && stats.naoCorrigidos > 0 && "bg-amber-500/20",
        !stats.emProgresso && stats.naoCorrigidos === 0 && "bg-green-500/20"
      )}>
        {stats.emProgresso ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <Brain className={cn(
            "w-5 h-5",
            stats.naoCorrigidos > 0 ? "text-amber-500" : "text-green-500"
          )} />
        )}
      </div>

      {/* Informações */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {stats.emProgresso ? 'Correção IA em andamento...' : 'Correção Inteligente IA'}
          </span>
        </div>

        {stats.emProgresso ? (
          <div className="space-y-1">
            <Progress value={stats.progresso} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Analisando {stats.total} fotos... {stats.progresso}%
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Total analisado */}
            <span className="text-muted-foreground">
              {stats.total} {stats.total === 1 ? 'foto analisada' : 'fotos analisadas'}
            </span>

            {/* Corrigidos */}
            {stats.corrigidos > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {stats.corrigidos} {stats.corrigidos === 1 ? 'corrigida' : 'corrigidas'}
              </span>
            )}

            {/* Não corrigidos (precisam atenção) */}
            {stats.naoCorrigidos > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.naoCorrigidos} {stats.naoCorrigidos === 1 ? 'precisa de atenção' : 'precisam de atenção'}
              </span>
            )}

            {/* Sem erros encontrados */}
            {stats.corrigidos === 0 && stats.naoCorrigidos === 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tudo correto!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Botão para limpar sinalizações com confirmação */}
      {!stats.emProgresso && stats.naoCorrigidos > 0 && onLimparSinalizacoes && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30"
              title="Limpar sinalizações após revisão manual"
            >
              <X className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Limpar sinalizações</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar sinalizações?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja limpar as {stats.naoCorrigidos} {stats.naoCorrigidos === 1 ? 'sinalização' : 'sinalizações'}? 
                Esta ação indica que você revisou manualmente os itens que a IA não conseguiu corrigir automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onLimparSinalizacoes}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default AISmartFixIndicator;
