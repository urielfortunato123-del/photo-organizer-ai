import React from 'react';
import { Brain, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SmartFixStats } from '@/hooks/useAISmartFix';
import { cn } from '@/lib/utils';

interface AISmartFixIndicatorProps {
  stats: SmartFixStats;
  className?: string;
}

const AISmartFixIndicator: React.FC<AISmartFixIndicatorProps> = ({ stats, className }) => {
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
    </div>
  );
};

export default AISmartFixIndicator;
