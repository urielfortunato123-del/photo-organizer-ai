import React from 'react';
import { CheckCircle2, XCircle, Loader2, FileImage, FolderOpen, Brain } from 'lucide-react';
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

export interface ProcessingResult {
  filename: string;
  service?: string;
  dest?: string;
  status: string;
  tecnico?: string;
}

interface ResultsTableProps {
  results: ProcessingResult[];
  isProcessing: boolean;
}

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
            <h3 className="font-semibold text-foreground">Resultados</h3>
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
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Arquivo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Serviço</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Destino</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Análise Técnica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow 
                key={`${result.filename}-${index}`}
                className="border-border animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
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
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-foreground truncate max-w-[150px]">
                      {result.filename}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">
                    {result.service || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  {result.dest ? (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                        {result.dest.split('/').slice(-3).join('/')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {result.tecnico ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-2 cursor-help">
                          <Brain className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {result.tecnico.slice(0, 50)}...
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-sm">
                        <p className="text-xs">{result.tecnico}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
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
