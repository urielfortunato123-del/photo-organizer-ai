import React from 'react';
import { CheckCircle2, XCircle, Loader2, FileImage, FolderOpen, Brain, Cpu, BarChart3 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ProcessingResult } from '@/services/api';

interface ResultsTableProps {
  results: ProcessingResult[];
  isProcessing: boolean;
}

const getConfidenceClass = (confidence: number | undefined): string => {
  if (!confidence) return 'confidence-low';
  if (confidence >= 0.8) return 'confidence-high';
  if (confidence >= 0.5) return 'confidence-medium';
  return 'confidence-low';
};

const getConfidenceLabel = (confidence: number | undefined): string => {
  if (!confidence) return '0%';
  return `${Math.round(confidence * 100)}%`;
};

const getMethodLabel = (method: string | undefined): string => {
  switch (method) {
    case 'heuristica': return 'Heurística';
    case 'ia_fallback': return 'IA Fallback';
    case 'ia_forcada': return 'IA Forçada';
    default: return '-';
  }
};

const ResultsTable: React.FC<ResultsTableProps> = ({ results, isProcessing }) => {
  if (results.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <FileImage className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Resultados do Processamento</h3>
            <p className="text-xs text-muted-foreground">
              {results.length} {results.length === 1 ? 'foto processada' : 'fotos processadas'}
            </p>
          </div>
        </div>
        {isProcessing && (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processando...</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold w-20">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Arquivo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Pórtico</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Disciplina</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Serviço</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Método</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Confiança</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Destino</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow 
                key={`${result.filename}-${index}`}
                className="border-border animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  {result.status === 'Sucesso' ? (
                    <span className="status-badge status-success flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  ) : result.status.includes('Erro') ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="status-badge status-error flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          Erro
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">{result.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="status-badge status-processing flex items-center gap-1 w-fit">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      ...
                    </span>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono text-xs text-foreground truncate max-w-[120px]">
                      {result.filename}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm font-medium text-foreground">
                    {result.portico || '-'}
                  </span>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-foreground">
                    {result.disciplina || '-'}
                  </span>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-foreground">
                    {result.service || '-'}
                  </span>
                </TableCell>
                
                <TableCell>
                  <span className="text-xs text-muted-foreground font-mono">
                    {result.data_detectada || '-'}
                  </span>
                </TableCell>
                
                <TableCell>
                  {result.method ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className={cn(
                          result.method === 'heuristica' ? 'method-heuristica' : 'method-ia',
                          'flex items-center gap-1 w-fit'
                        )}>
                          {result.method === 'heuristica' ? (
                            <BarChart3 className="w-3 h-3" />
                          ) : (
                            <Cpu className="w-3 h-3" />
                          )}
                          {getMethodLabel(result.method)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {result.method === 'heuristica' && 'Classificado por regras e padrões'}
                          {result.method === 'ia_fallback' && 'IA ativada por OCR fraco ou serviço não identificado'}
                          {result.method === 'ia_forcada' && 'IA ativada manualmente pelo usuário'}
                        </p>
                        {result.tecnico && (
                          <p className="text-xs mt-1 text-muted-foreground">{result.tecnico}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {result.confidence !== undefined ? (
                    <span className={cn(getConfidenceClass(result.confidence), 'inline-block')}>
                      {getConfidenceLabel(result.confidence)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {result.dest ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-2 cursor-help">
                          <FolderOpen className="w-4 h-4 text-warning flex-shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                            .../{result.dest.split('/').slice(-2).join('/')}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-md">
                        <p className="font-mono text-xs break-all">{result.dest}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResultsTable;
