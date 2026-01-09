import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FileImage, Edit2, Check, X, Eye, Download, AlertTriangle, Brain, MapPin, Trash2, Filter, RefreshCw, ExternalLink } from 'lucide-react';
import { LocationMap, parseDMSCoordinates } from '@/components/LocationMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ProcessingResult, MONTH_NAMES } from '@/services/api';
import { useAprendizadoOCR } from '@/hooks/useAprendizadoOCR';
import { toast } from 'sonner';

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

interface EditableResultsTableProps {
  results: ProcessingResult[];
  isProcessing: boolean;
  fileUrls?: Map<string, string>;
  onViewPhoto?: (result: ProcessingResult, imageUrl?: string) => void;
  onUpdateResult?: (updated: ProcessingResult) => void;
  onBulkUpdate?: (updates: ProcessingResult[]) => void;
  onDeletePhotos?: (filenames: string[]) => void;
  onReprocessSelected?: (filenames: string[]) => void;
  recentlyReprocessed?: Set<string>;
}

const DISCIPLINAS = [
  'FUNDACAO', 'ESTRUTURA', 'PORTICO_FREE_FLOW', 'ALVENARIA', 'COBERTURA',
  'REVESTIMENTO', 'ACABAMENTO', 'ESQUADRIAS', 'IMPERMEABILIZACAO',
  'HIDRAULICA', 'ELETRICA', 'AR_CONDICIONADO', 'DRENAGEM', 'TERRAPLENAGEM',
  'PAVIMENTACAO', 'OAC', 'OAE', 'SINALIZACAO', 'BARREIRAS', 'SEGURANCA',
  'PAISAGISMO', 'MANUTENCAO', 'DEMOLICAO', 'CONTENCAO', 'INFRAESTRUTURA',
  'EQUIPAMENTOS', 'MOBILIZACAO', 'LOUCAS_METAIS', 'INCENDIO', 'ENSAIOS', 'OUTROS'
];

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

// Check if result is incomplete (OK but missing essential data)
const isIncompleteResult = (r: ProcessingResult): boolean => {
  return r.status === 'Sucesso' && (
    !r.portico || r.portico === '-' || r.portico === '' ||
    !r.disciplina || r.disciplina === '-' || r.disciplina === '' ||
    !r.service || r.service === '-' || r.service === ''
  );
};

// Build destination path
const buildDestPath = (portico: string, disciplina: string, servico: string, data?: string): string => {
  const basePath = `organized_photos/${portico}/${disciplina}/${servico}`;
  
  if (data) {
    const match = data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month] = match;
      const monthNum = parseInt(month, 10);
      const monthName = MONTH_NAMES[monthNum] || `${month}_MES`;
      return `${basePath}/${monthNum.toString().padStart(2, '0')}_${monthName}/${day}_${month}`;
    }
  }
  
  return basePath;
};

const EditableResultsTable: React.FC<EditableResultsTableProps> = ({ 
  results, 
  isProcessing, 
  fileUrls,
  onViewPhoto,
  onUpdateResult,
  onBulkUpdate,
  onDeletePhotos,
  onReprocessSelected,
  recentlyReprocessed = new Set()
}) => {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProcessingResult>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [originalValues, setOriginalValues] = useState<Partial<ProcessingResult>>({});
  const [mapResult, setMapResult] = useState<ProcessingResult | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const { salvarCorrecao } = useAprendizadoOCR();

  // Extrai coordenadas do resultado (EXIF ou OCR)
  const getCoordinates = (result: ProcessingResult): { lat: number; lng: number } | null => {
    // Primeiro tenta GPS do EXIF
    if (result.gps_lat && result.gps_lon) {
      return { lat: result.gps_lat, lng: result.gps_lon };
    }
    // Depois tenta extrair do texto OCR
    if (result.ocr_text) {
      return parseDMSCoordinates(result.ocr_text);
    }
    return null;
  };

  // Gera URL do Google Maps para busca por localização
  const getLocationSearchUrl = (result: ProcessingResult): { url: string; type: 'gps' | 'address' | 'highway' } | null => {
    // Se tem coordenadas GPS, usa diretamente
    const coords = getCoordinates(result);
    if (coords) {
      return { 
        url: `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
        type: 'gps'
      };
    }
    
    // Se tem endereço completo (extraído da foto), usa para busca
    const endereco = (result as any).endereco;
    const cidade = (result as any).cidade;
    const estado = (result as any).estado;
    
    if (endereco || cidade) {
      const parts = [endereco, cidade, estado || 'Brasil'].filter(Boolean);
      const searchQuery = encodeURIComponent(parts.join(', '));
      return { 
        url: `https://www.google.com/maps/search/${searchQuery}`,
        type: 'address'
      };
    }
    
    // Se tem rodovia + KM, gera busca no Google Maps
    if (result.rodovia && result.km_inicio) {
      const rodovia = result.rodovia.replace('_', '-').replace('-', ' ');
      const km = result.km_inicio.replace('+', ' ');
      const searchQuery = encodeURIComponent(`${rodovia} km ${km} Brasil`);
      return { 
        url: `https://www.google.com/maps/search/${searchQuery}`,
        type: 'highway'
      };
    }
    
    return null;
  };

  if (results.length === 0 && !isProcessing) {
    return null;
  }

  const handleStartEdit = (result: ProcessingResult) => {
    setEditingRow(result.filename);
    const currentValues = {
      filename: result.filename || '',
      portico: result.portico || '',
      disciplina: result.disciplina || '',
      service: result.service || '',
      data_detectada: result.data_detectada || '',
    };
    setEditValues(currentValues);
    setOriginalValues(currentValues);
  };

  const handleSaveEdit = async (result: ProcessingResult) => {
    if (onUpdateResult) {
      const newDest = buildDestPath(
        editValues.portico || result.portico || 'NAO_IDENTIFICADO',
        editValues.disciplina || result.disciplina || 'OUTROS',
        editValues.service || result.service || 'NAO_IDENTIFICADO',
        editValues.data_detectada
      );

      // Detecta se houve correção no pórtico
      const porticoMudou = editValues.portico && 
        editValues.portico !== originalValues.portico &&
        originalValues.portico !== editValues.portico;

      // Salva aprendizado se houver correção
      if (porticoMudou && result.ocr_text) {
        const salvo = await salvarCorrecao({
          textoOCR: result.ocr_text,
          identificacaoErrada: originalValues.portico || 'NAO_IDENTIFICADO',
          identificacaoCorreta: editValues.portico,
          obraId: result.obra_id
        });
        
        if (salvo) {
          toast.success('Aprendizado salvo!', {
            description: `Sistema aprendeu: "${result.ocr_text}" → ${editValues.portico}`,
            icon: <Brain className="w-4 h-4" />
          });
        }
      }

      onUpdateResult({
        ...result,
        filename: editValues.filename || result.filename,
        portico: editValues.portico || result.portico,
        disciplina: editValues.disciplina || result.disciplina,
        service: editValues.service || result.service,
        data_detectada: editValues.data_detectada || result.data_detectada,
        dest: newDest,
        method: 'heuristica',
        confidence: 1.0,
        status: 'Sucesso',
      });
    }
    setEditingRow(null);
    setEditValues({});
    setOriginalValues({});
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
    setOriginalValues({});
  };

  const toggleRowSelection = (filename: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === results.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(results.map(r => r.filename)));
    }
  };

  // Quick selection helpers
  const selectOnlyErrors = () => {
    const errorFilenames = results
      .filter(r => r.status.includes('Erro'))
      .map(r => r.filename);
    setSelectedRows(new Set(errorFilenames));
  };

  const selectOnlyIncomplete = () => {
    const incompleteFilenames = results
      .filter(isIncompleteResult)
      .map(r => r.filename);
    setSelectedRows(new Set(incompleteFilenames));
  };

  const selectProblematic = () => {
    const problematicFilenames = results
      .filter(r => r.status.includes('Erro') || isIncompleteResult(r))
      .map(r => r.filename);
    setSelectedRows(new Set(problematicFilenames));
  };

  // Count helpers
  const errorCount = results.filter(r => r.status.includes('Erro')).length;
  const incompleteCount = results.filter(isIncompleteResult).length;
  const problematicCount = errorCount + incompleteCount;

  const handleBulkDelete = () => {
    if (onDeletePhotos && selectedRows.size > 0) {
      onDeletePhotos(Array.from(selectedRows));
      setSelectedRows(new Set());
      setShowBulkDeleteConfirm(false);
      toast.success(`${selectedRows.size} foto(s) excluída(s)`);
    }
  };
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
              {selectedRows.size > 0 && ` • ${selectedRows.size} selecionada(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && onReprocessSelected && !isProcessing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onReprocessSelected(Array.from(selectedRows));
                setSelectedRows(new Set());
              }}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Reprocessar ({selectedRows.size})
            </Button>
          )}
          {selectedRows.size > 0 && onDeletePhotos && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Excluir ({selectedRows.size})
            </Button>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Processando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Selection Bar */}
      {problematicCount > 0 && (
        <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Seleção rápida:
          </span>
          {errorCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectOnlyErrors}
              className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-3 h-3" />
              Erros ({errorCount})
            </Button>
          )}
          {incompleteCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectOnlyIncomplete}
              className="h-7 text-xs gap-1 border-warning/50 text-warning hover:bg-warning/10"
            >
              <AlertTriangle className="w-3 h-3" />
              Incompletos ({incompleteCount})
            </Button>
          )}
          {problematicCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectProblematic}
              className="h-7 text-xs gap-1"
            >
              Todos problemáticos ({problematicCount})
            </Button>
          )}
          {selectedRows.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              className="h-7 text-xs"
            >
              Limpar seleção
            </Button>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedRows.size} foto(s) selecionada(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedRows.size} foto(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox 
                  checked={selectedRows.size === results.length && results.length > 0}
                  onCheckedChange={toggleAllSelection}
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold w-16">Preview</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-20">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Arquivo</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Frente</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Disciplina</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Serviço</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-16">GPS</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Confiança</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => {
              const imageUrl = fileUrls?.get(result.filename);
              const isEditing = editingRow === result.filename;
              const wasReprocessed = recentlyReprocessed.has(result.filename);
              const coords = getCoordinates(result);
              
              return (
                <TableRow 
                  key={`${result.filename}-${index}`}
                  className={cn(
                    "border-border animate-fade-in",
                    selectedRows.has(result.filename) && "bg-primary/5",
                    isEditing && "bg-warning/5",
                    wasReprocessed && "bg-success/5 ring-1 ring-success/30"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedRows.has(result.filename)}
                      onCheckedChange={() => toggleRowSelection(result.filename)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div 
                      className="w-10 h-10 rounded-lg overflow-hidden bg-secondary flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary"
                      onClick={() => onViewPhoto?.(result, imageUrl)}
                    >
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
                    {wasReprocessed && result.status === 'Sucesso' && !isIncompleteResult(result) ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="status-badge flex items-center gap-1 w-fit bg-success/20 text-success border-success/30">
                            <RefreshCw className="w-3 h-3" />
                            Atualizado
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Foto reprocessada recentemente</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : result.status === 'Sucesso' && !isIncompleteResult(result) ? (
                      <span className="status-badge status-success flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    ) : isIncompleteResult(result) ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="status-badge flex items-center gap-1 w-fit bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Incompleto
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">Dados incompletos - será reprocessado</p>
                        </TooltipContent>
                      </Tooltip>
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
                    {isEditing ? (
                      <Input 
                        value={editValues.filename || ''}
                        onChange={(e) => setEditValues({...editValues, filename: e.target.value})}
                        className="h-8 w-28 font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground truncate max-w-[100px] block">
                        {result.filename}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        value={editValues.portico || ''}
                        onChange={(e) => setEditValues({...editValues, portico: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                        className="h-8 w-24 font-mono text-xs"
                      />
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {result.portico || '-'}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Select 
                        value={editValues.disciplina || ''} 
                        onValueChange={(v) => setEditValues({...editValues, disciplina: v})}
                      >
                        <SelectTrigger className="h-8 w-32 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCIPLINAS.map(d => (
                            <SelectItem key={d} value={d} className="font-mono text-xs">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-foreground">
                        {result.disciplina || '-'}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        value={editValues.service || ''}
                        onChange={(e) => setEditValues({...editValues, service: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                        className="h-8 w-28 font-mono text-xs"
                      />
                    ) : (
                      <span className="text-sm text-foreground truncate max-w-[120px] block">
                        {result.service || '-'}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        value={editValues.data_detectada || ''}
                        onChange={(e) => setEditValues({...editValues, data_detectada: e.target.value})}
                        placeholder="DD/MM/AAAA"
                        className="h-8 w-24 font-mono text-xs"
                        maxLength={10}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {result.data_detectada || '-'}
                      </span>
                    )}
                  </TableCell>
                  
                  {/* GPS / Location Column */}
                  <TableCell>
                    {(() => {
                      const location = getLocationSearchUrl(result);
                      const hasGPS = coords !== null;
                      const endereco = (result as any).endereco;
                      const cidade = (result as any).cidade;
                      
                      if (location) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => window.open(location.url, '_blank')}
                                className={cn(
                                  "flex items-center gap-1 transition-colors cursor-pointer",
                                  location.type === 'gps' ? "text-primary hover:text-primary/80" : 
                                  location.type === 'address' ? "text-success hover:text-success/80" :
                                  "text-warning hover:text-warning/80"
                                )}
                              >
                                <MapPin className="w-4 h-4" />
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {location.type === 'gps' ? (
                                <>
                                  <p className="text-xs font-mono">{coords!.lat.toFixed(6)}, {coords!.lng.toFixed(6)}</p>
                                  <p className="text-xs text-muted-foreground">📍 GPS exato - Clique para abrir</p>
                                </>
                              ) : location.type === 'address' ? (
                                <>
                                  <p className="text-xs">{endereco || cidade}</p>
                                  <p className="text-xs text-muted-foreground">🏠 Endereço - Clique para buscar</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs font-mono">{result.rodovia} KM {result.km_inicio}</p>
                                  <p className="text-xs text-muted-foreground">🛣️ Rodovia - Clique para buscar</p>
                                </>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      
                      return <span className="text-muted-foreground text-xs">-</span>;
                    })()}
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
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-success hover:text-success"
                            onClick={() => handleSaveEdit(result)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(result)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onViewPhoto?.(result, imageUrl)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {getCoordinates(result) && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7 text-blue-500 hover:text-blue-600"
                              onClick={() => setMapResult(result)}
                              title="Ver no mapa"
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal do Mapa */}
      <Dialog open={!!mapResult} onOpenChange={(open) => !open && setMapResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Localização: {mapResult?.portico || mapResult?.filename}
            </DialogTitle>
          </DialogHeader>
          {mapResult && getCoordinates(mapResult) && (
            <div className="space-y-3">
              <LocationMap
                latitude={getCoordinates(mapResult)!.lat}
                longitude={getCoordinates(mapResult)!.lng}
                locationName={mapResult.portico || mapResult.service || 'Localização'}
              />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>📍 {getCoordinates(mapResult)!.lat.toFixed(6)}, {getCoordinates(mapResult)!.lng.toFixed(6)}</span>
                {mapResult.rodovia && <span>🛣️ {mapResult.rodovia}</span>}
                {mapResult.km_inicio && <span>📏 KM {mapResult.km_inicio}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditableResultsTable;
