import React from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ProcessingResult } from '@/services/api';

interface AlertBadgeProps {
  alertas?: ProcessingResult['alertas'];
  compact?: boolean;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ alertas, compact = true }) => {
  if (!alertas) return null;
  
  const activeAlerts: { key: string; label: string; level: 'error' | 'warning' }[] = [];
  
  if (alertas.sem_placa) {
    activeAlerts.push({ key: 'sem_placa', label: 'Sem placa', level: 'warning' });
  }
  if (alertas.texto_ilegivel) {
    activeAlerts.push({ key: 'texto_ilegivel', label: 'Texto ilegível', level: 'error' });
  }
  if (alertas.evidencia_fraca) {
    activeAlerts.push({ key: 'evidencia_fraca', label: 'Evidência fraca', level: 'warning' });
  }
  if (alertas.km_inconsistente) {
    activeAlerts.push({ key: 'km_inconsistente', label: 'KM inconsistente', level: 'error' });
  }
  
  if (activeAlerts.length === 0) return null;
  
  const hasError = activeAlerts.some(a => a.level === 'error');
  
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            hasError 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-warning/10 text-warning'
          )}>
            {hasError ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            {activeAlerts.length}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-1">
            {activeAlerts.map(alert => (
              <div 
                key={alert.key} 
                className={cn(
                  'flex items-center gap-1 text-xs',
                  alert.level === 'error' ? 'text-destructive' : 'text-warning'
                )}
              >
                {alert.level === 'error' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {alert.label}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {activeAlerts.map(alert => (
        <Badge 
          key={alert.key}
          variant="outline"
          className={cn(
            'text-xs',
            alert.level === 'error' 
              ? 'border-destructive/50 text-destructive bg-destructive/5' 
              : 'border-warning/50 text-warning bg-warning/5'
          )}
        >
          {alert.level === 'error' ? (
            <AlertCircle className="w-3 h-3 mr-1" />
          ) : (
            <AlertTriangle className="w-3 h-3 mr-1" />
          )}
          {alert.label}
        </Badge>
      ))}
    </div>
  );
};

interface AlertsSummaryProps {
  results: ProcessingResult[];
}

export const AlertsSummary: React.FC<AlertsSummaryProps> = ({ results }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Count alerts
  const alertCounts = {
    sem_placa: 0,
    texto_ilegivel: 0,
    evidencia_fraca: 0,
    km_inconsistente: 0,
  };
  
  let totalAlerts = 0;
  
  results.forEach(result => {
    if (result.alertas) {
      if (result.alertas.sem_placa) {
        alertCounts.sem_placa++;
        totalAlerts++;
      }
      if (result.alertas.texto_ilegivel) {
        alertCounts.texto_ilegivel++;
        totalAlerts++;
      }
      if (result.alertas.evidencia_fraca) {
        alertCounts.evidencia_fraca++;
        totalAlerts++;
      }
      if (result.alertas.km_inconsistente) {
        alertCounts.km_inconsistente++;
        totalAlerts++;
      }
    }
  });
  
  if (totalAlerts === 0) {
    return (
      <div className="flex items-center gap-2 text-success text-sm">
        <Info className="w-4 h-4" />
        Nenhum alerta detectado
      </div>
    );
  }
  
  const hasErrors = alertCounts.texto_ilegivel > 0 || alertCounts.km_inconsistente > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg transition-colors',
          hasErrors 
            ? 'bg-destructive/10 hover:bg-destructive/15' 
            : 'bg-warning/10 hover:bg-warning/15'
        )}>
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning" />
            )}
            <span className={cn(
              'font-medium',
              hasErrors ? 'text-destructive' : 'text-warning'
            )}>
              {totalAlerts} {totalAlerts === 1 ? 'alerta' : 'alertas'} detectados
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {alertCounts.sem_placa > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Sem placa de identificação</span>
              </div>
              <Badge variant="outline" className="border-warning/50 text-warning">
                {alertCounts.sem_placa}
              </Badge>
            </div>
          )}
          
          {alertCounts.texto_ilegivel > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Texto ilegível</span>
              </div>
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                {alertCounts.texto_ilegivel}
              </Badge>
            </div>
          )}
          
          {alertCounts.evidencia_fraca > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Evidência fraca</span>
              </div>
              <Badge variant="outline" className="border-warning/50 text-warning">
                {alertCounts.evidencia_fraca}
              </Badge>
            </div>
          )}
          
          {alertCounts.km_inconsistente > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">KM inconsistente</span>
              </div>
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                {alertCounts.km_inconsistente}
              </Badge>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AlertBadge;
