import React from 'react';
import { Brain, TrendingUp, Database, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IntelligenceIndicatorProps {
  totalObras: number;
  totalVariacoes: number;
  totalIdentificacoes: number;
  ultimaAtualizacao: string | null;
}

const IntelligenceIndicator: React.FC<IntelligenceIndicatorProps> = ({
  totalObras,
  totalVariacoes,
  totalIdentificacoes,
  ultimaAtualizacao
}) => {
  // Calcula "nível de inteligência" baseado nos dados
  const nivelInteligencia = Math.min(100, Math.round(
    (totalObras * 2) + 
    (totalVariacoes * 0.5) + 
    (totalIdentificacoes * 0.1)
  ));
  
  const getCorNivel = () => {
    if (nivelInteligencia >= 80) return 'text-green-500';
    if (nivelInteligencia >= 50) return 'text-yellow-500';
    if (nivelInteligencia >= 20) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getDescricaoNivel = () => {
    if (nivelInteligencia >= 80) return 'Sistema muito inteligente';
    if (nivelInteligencia >= 50) return 'Sistema aprendendo bem';
    if (nivelInteligencia >= 20) return 'Sistema iniciando aprendizado';
    return 'Sistema começando do zero';
  };

  const formatarData = (data: string | null) => {
    if (!data) return 'Nunca';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(data));
    } catch {
      return 'Desconhecido';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg cursor-help border border-border/50 hover:border-primary/50 transition-colors">
            <Brain className={`w-4 h-4 ${getCorNivel()}`} />
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground">{nivelInteligencia}%</span>
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Brain className={`w-5 h-5 ${getCorNivel()}`} />
              <div>
                <p className="font-semibold text-sm">{getDescricaoNivel()}</p>
                <p className="text-xs text-muted-foreground">Nível: {nivelInteligencia}/100</p>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Database className="w-3 h-3" />
                  Obras conhecidas
                </span>
                <span className="font-semibold text-foreground">{totalObras}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  Variações aprendidas
                </span>
                <span className="font-semibold text-foreground">{totalVariacoes}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  Total identificações
                </span>
                <span className="font-semibold text-foreground">{totalIdentificacoes.toLocaleString('pt-BR')}</span>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
              Última atualização: {formatarData(ultimaAtualizacao)}
            </p>
            
            <p className="text-[10px] text-primary/80 italic">
              🧠 O sistema aprende automaticamente a cada análise!
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default IntelligenceIndicator;
