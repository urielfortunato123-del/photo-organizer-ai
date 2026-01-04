import React, { useRef } from 'react';
import { ProcessingResult } from '@/services/api';
import { 
  FileText, Printer, Calendar, MapPin, Wrench, 
  CheckCircle2, XCircle, Sparkles, Camera, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DetailedReportProps {
  results: ProcessingResult[];
  fileUrls: Map<string, string>;
  empresa?: string;
  onClose: () => void;
}

const getConfidenceColor = (confidence: number | undefined) => {
  const value = (confidence || 0) * 100;
  if (value >= 80) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
  if (value >= 50) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
  return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
};

const getStatusIcon = (status: string) => {
  if (status === 'Sucesso') {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  }
  return <XCircle className="w-5 h-5 text-red-500" />;
};

const DetailedReport: React.FC<DetailedReportProps> = ({
  results,
  fileUrls,
  empresa = 'EMPRESA',
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const successCount = results.filter(r => r.status === 'Sucesso').length;
  const errorCount = results.filter(r => r.status.includes('Erro')).length;
  const avgConfidence = results.length > 0
    ? results.reduce((acc, r) => acc + (r.confidence || 0), 0) / results.length * 100
    : 0;

  // Group by discipline
  const byDiscipline: Record<string, ProcessingResult[]> = {};
  results.forEach(r => {
    const disc = r.disciplina || 'NÃO IDENTIFICADO';
    if (!byDiscipline[disc]) byDiscipline[disc] = [];
    byDiscipline[disc].push(r);
  });

  // Group by portico
  const byPortico: Record<string, number> = {};
  results.forEach(r => {
    const port = r.portico || 'NÃO IDENTIFICADO';
    byPortico[port] = (byPortico[port] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header - Hide on print */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Detalhado</h1>
            <p className="text-sm text-muted-foreground">{results.length} fotos analisadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1 print:overflow-visible">
        <div ref={reportRef} className="p-6 max-w-5xl mx-auto print:max-w-none print:p-4">
          
          {/* Report Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-primary print:border-black">
            <h1 className="text-3xl font-bold text-foreground print:text-black mb-2">
              📸 RELATÓRIO DE CLASSIFICAÇÃO DE FOTOS
            </h1>
            <h2 className="text-xl text-primary print:text-gray-700 font-semibold">
              ObraPhoto AI - {empresa}
            </h2>
            <p className="text-muted-foreground print:text-gray-500 mt-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {/* Summary Stats */}
          <div className="mb-8 p-6 bg-card print:bg-gray-50 rounded-lg border border-border print:border-gray-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Resumo Geral
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/10 print:bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-primary print:text-blue-600">{results.length}</div>
                <div className="text-sm text-muted-foreground">Total de Fotos</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 print:bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-muted-foreground">Classificadas</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 print:bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-muted-foreground">Com Erros</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 print:bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">{avgConfidence.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Confiança Média</div>
              </div>
            </div>
          </div>

          {/* Distribution by Portico */}
          <div className="mb-8 p-6 bg-card print:bg-gray-50 rounded-lg border border-border print:border-gray-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Distribuição por Frente de Serviço
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byPortico).sort((a, b) => b[1] - a[1]).map(([port, count]) => (
                <Badge key={port} variant="secondary" className="text-sm py-1 px-3">
                  {port}: <span className="font-bold ml-1">{count}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Photos by Discipline */}
          {Object.entries(byDiscipline).sort((a, b) => b[1].length - a[1].length).map(([disciplina, photos]) => (
            <div key={disciplina} className="mb-8 print:break-inside-avoid">
              <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 print:bg-blue-50 rounded-lg">
                <Wrench className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground print:text-black">
                  {disciplina}
                </h3>
                <Badge className="ml-auto">{photos.length} fotos</Badge>
              </div>

              <div className="space-y-4">
                {photos.map((result, idx) => {
                  const imageUrl = fileUrls.get(result.filename);
                  return (
                    <div 
                      key={`${result.filename}-${idx}`} 
                      className="border border-border print:border-gray-300 rounded-lg overflow-hidden bg-card print:bg-white print:break-inside-avoid"
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <div className="w-full md:w-48 h-48 bg-muted flex-shrink-0">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={result.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              <h4 className="font-semibold text-foreground print:text-black truncate max-w-xs">
                                {result.filename}
                              </h4>
                            </div>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
                              {((result.confidence || 0) * 100).toFixed(0)}% confiança
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Frente:</span>
                              <p className="font-medium">{result.portico || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Disciplina:</span>
                              <p className="font-medium">{result.disciplina || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Serviço:</span>
                              <p className="font-medium">{result.service || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Data:</span>
                              <p className="font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {result.data_detectada || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* AI Analysis */}
                          {result.tecnico && (
                            <div className="mt-3 p-3 bg-muted/50 print:bg-gray-100 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-primary">Análise Técnica da IA:</span>
                              </div>
                              <p className="text-sm text-foreground print:text-gray-700 leading-relaxed">
                                {result.tecnico}
                              </p>
                            </div>
                          )}

                          {/* Destination Path */}
                          {result.dest && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              <span className="font-medium">Destino:</span> {result.dest}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border print:border-gray-300 text-center text-sm text-muted-foreground print:text-gray-500">
            <p>Relatório gerado automaticamente pelo ObraPhoto AI</p>
            <p className="mt-1">© {new Date().getFullYear()} - Classificação inteligente de fotos de obra</p>
          </div>
        </div>
      </ScrollArea>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
            height: auto !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          [data-radix-scroll-area-viewport] {
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DetailedReport;
