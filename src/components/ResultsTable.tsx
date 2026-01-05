import React from 'react';
import { CheckCircle2, XCircle, Loader2, FileImage, BarChart3, Eye, Cpu, MapPin, Route } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProcessingResult } from '@/services/api';
import AlertBadge from '@/components/AlertBadge';

interface ResultsTableProps {
  results: ProcessingResult[];
  isProcessing: boolean;
  fileUrls?: Map<string, string>;
  onViewPhoto?: (result: ProcessingResult, imageUrl?: string) => void;
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

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  results, 
  isProcessing, 
  fileUrls,
  onViewPhoto 
}) => {
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
              <TableHead className="text-muted-foreground font-semibold w-16">Preview</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-20">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Arquivo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Frente</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Rodovia/KM</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Disciplina</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Serviço</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-16">Alertas</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Confiança</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => {
              const imageUrl = fileUrls?.get(result.filename);
              
              return (
                <TableRow 
                  key={`${result.filename}-${index}`}
                  className="border-border animate-fade-in hover:bg-secondary/30 cursor-pointer"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => onViewPhoto?.(result, imageUrl)}
                >
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={result.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  
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
                    <span className="font-mono text-xs text-foreground truncate max-w-[100px] block">
                      {result.filename}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm font-medium text-foreground">
                      {result.portico || '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {result.rodovia || result.km_inicio ? (
                      <div className="flex items-center gap-1 text-xs">
                        {result.rodovia && (
                          <span className="font-mono text-primary">{result.rodovia}</span>
                        )}
                        {result.km_inicio && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="flex items-center gap-0.5 text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {result.km_inicio}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              KM: {result.km_inicio}{result.km_fim ? ` - ${result.km_fim}` : ''}
                              {result.sentido && <span className="ml-1">({result.sentido})</span>}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-foreground">
                      {result.disciplina || '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-foreground truncate max-w-[120px] block">
                      {result.service || '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-mono">
                      {result.data_detectada || '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <AlertBadge alertas={result.alertas} compact />
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPhoto?.(result, imageUrl);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResultsTable;
