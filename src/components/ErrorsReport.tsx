import React from 'react';
import { AlertTriangle, X, RefreshCw, FileWarning, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ErrorItem {
  filename: string;
  error: string;
  hash?: string;
}

interface ErrorsReportProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ErrorItem[];
  onRetryAll?: () => void;
}

const ErrorsReport: React.FC<ErrorsReportProps> = ({
  isOpen,
  onClose,
  errors,
  onRetryAll,
}) => {
  // Group errors by type
  const groupedErrors = errors.reduce((acc, err) => {
    const errorType = err.error.includes('402') || err.error.includes('crédito')
      ? 'Limite de Créditos'
      : err.error.includes('timeout') || err.error.includes('Timeout')
      ? 'Timeout'
      : err.error.includes('network') || err.error.includes('Network')
      ? 'Erro de Rede'
      : err.error.includes('OCR')
      ? 'Erro de OCR'
      : 'Outros Erros';
    
    if (!acc[errorType]) {
      acc[errorType] = [];
    }
    acc[errorType].push(err);
    return acc;
  }, {} as Record<string, ErrorItem[]>);

  const errorTypeColors: Record<string, string> = {
    'Limite de Créditos': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Timeout': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Erro de Rede': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Erro de OCR': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Outros Erros': 'bg-muted text-muted-foreground border-border',
  };

  // Download log function
  const handleDownloadLog = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logContent = generateLogContent();
    
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `obraphoto-erros-${timestamp}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateLogContent = () => {
    const lines: string[] = [];
    const now = new Date();
    
    lines.push('=' .repeat(60));
    lines.push('  OBRAPHOTO AI - RELATÓRIO DE ERROS');
    lines.push('=' .repeat(60));
    lines.push('');
    lines.push(`Data/Hora: ${now.toLocaleString('pt-BR')}`);
    lines.push(`Total de erros: ${errors.length}`);
    lines.push(`Navegador: ${navigator.userAgent}`);
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('  RESUMO POR TIPO DE ERRO');
    lines.push('-'.repeat(60));
    
    Object.entries(groupedErrors).forEach(([errorType, items]) => {
      lines.push(`  ${errorType}: ${items.length} erro(s)`);
    });
    
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('  DETALHES DOS ERROS');
    lines.push('-'.repeat(60));
    lines.push('');
    
    Object.entries(groupedErrors).forEach(([errorType, items]) => {
      lines.push(`### ${errorType} (${items.length} arquivos) ###`);
      lines.push('');
      
      items.forEach((item, idx) => {
        lines.push(`[${idx + 1}] Arquivo: ${item.filename}`);
        lines.push(`    Erro: ${item.error}`);
        if (item.hash) {
          lines.push(`    Hash: ${item.hash}`);
        }
        lines.push('');
      });
    });
    
    lines.push('-'.repeat(60));
    lines.push('  INFORMAÇÕES ADICIONAIS');
    lines.push('-'.repeat(60));
    lines.push(`URL: ${window.location.href}`);
    lines.push(`Versão: ObraPhoto AI v2.0`);
    lines.push('');
    lines.push('Para suporte, envie este arquivo para: suporte@obraphoto.ai');
    lines.push('');
    lines.push('=' .repeat(60));
    
    return lines.join('\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-destructive" />
            Relatório de Erros
          </DialogTitle>
          <DialogDescription>
            {errors.length} arquivo(s) com erro durante o processamento
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedErrors).map(([errorType, items]) => (
              <div key={errorType} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={errorTypeColors[errorType] || errorTypeColors['Outros Erros']}>
                    {errorType} ({items.length})
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.filename}-${idx}`}
                      className="p-3 bg-card/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.filename}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleDownloadLog}
            className="border-muted-foreground/30 hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Log
          </Button>
          
          <div className="flex gap-3">
            {onRetryAll && errors.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  onRetryAll();
                  onClose();
                }}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reprocessar Todos
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorsReport;
