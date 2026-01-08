import React, { useState, useEffect } from 'react';
import { X, FileImage, FolderOpen, Brain, Edit2, Check, RotateCcw, Calendar, Sparkles, MapPin, Route, AlertCircle, AlertTriangle, Navigation, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProcessingResult, MONTH_NAMES } from '@/services/api';
import { cn } from '@/lib/utils';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProcessingResult | null;
  imageUrl?: string;
  ocrText?: string;
  onUpdateResult?: (updated: ProcessingResult) => void;
}

// Disciplinas disponíveis
const DISCIPLINAS = [
  'FUNDACAO', 'ESTRUTURA', 'PORTICO_FREE_FLOW', 'ALVENARIA', 'COBERTURA',
  'REVESTIMENTO', 'ACABAMENTO', 'ESQUADRIAS', 'IMPERMEABILIZACAO',
  'HIDRAULICA', 'ELETRICA', 'AR_CONDICIONADO', 'DRENAGEM', 'TERRAPLENAGEM',
  'PAVIMENTACAO', 'OAC', 'OAE', 'SINALIZACAO', 'BARREIRAS', 'SEGURANCA',
  'PAISAGISMO', 'MANUTENCAO', 'DEMOLICAO', 'CONTENCAO', 'INFRAESTRUTURA',
  'EQUIPAMENTOS', 'MOBILIZACAO', 'LOUCAS_METAIS', 'INCENDIO', 'ENSAIOS', 'OUTROS'
];

// Serviços por disciplina (principais)
const SERVICOS_POR_DISCIPLINA: Record<string, string[]> = {
  FUNDACAO: ['ESTACA_RAIZ', 'ESTACA_HELICE', 'SAPATA_ISOLADA', 'BLOCO_COROAMENTO', 'BALDRAME', 'ESCAVACAO_FUNDACAO', 'CONCRETAGEM_BLOCO', 'CRAVACAO_ESTACA'],
  ESTRUTURA: ['PILAR', 'VIGA', 'LAJE', 'FORMA', 'DESFORMA', 'ARMACAO', 'CONCRETAGEM', 'ESCORAMENTO', 'ESTRUTURA_METALICA'],
  PORTICO_FREE_FLOW: ['ICAMENTO_PORTICO', 'MONTAGEM_PORTICO', 'IMPLANTACAO_PORTICO', 'INSTALACAO_RFID', 'LINHA_VIDA', 'GUARDA_CORPO_PORTICO', 'SALA_TECNICA', 'CHUMBADOR'],
  ACABAMENTO: ['PINTURA_INTERNA', 'PINTURA_EXTERNA', 'PINTURA_FACHADA', 'PINTURA_EPOXI', 'TEXTURA', 'FORRO', 'RODAPE', 'REJUNTAMENTO'],
  REVESTIMENTO: ['CHAPISCO', 'EMBOCO', 'REBOCO', 'CERAMICA', 'PORCELANATO', 'PISO', 'CONTRAPISO'],
  TERRAPLENAGEM: ['CORTE', 'ATERRO', 'COMPACTACAO', 'ESCAVACAO', 'CARGA_TRANSPORTE', 'REGULARIZACAO_PLATAFORMA', 'TALUDE'],
  DRENAGEM: ['BUEIRO', 'BOCA_LOBO', 'SARJETA', 'MEIO_FIO', 'DESCIDA_DAGUA', 'CANALETA', 'GABIAO'],
  CONTENCAO: ['CORTINA_ATIRANTADA', 'TIRANTE', 'PROTENSAO_TIRANTE', 'SOLO_GRAMPEADO', 'MURO_GABIAO', 'PROJECAO_CONCRETO'],
  PAVIMENTACAO: ['SUB_BASE', 'BASE', 'IMPRIMACAO', 'CBUQ', 'ASFALTO', 'RECAPEAMENTO', 'PISO_INTERTRAVADO'],
  SINALIZACAO: ['PLACA_SINALIZACAO', 'PINTURA_SOLO', 'DEFENSA_METALICA', 'TACHA', 'BALIZADOR'],
  BARREIRAS: ['BARREIRA_RIGIDA', 'BARREIRA_NEW_JERSEY', 'BARREIRA_CONCRETO', 'EXECUCAO_BARREIRA'],
  SEGURANCA: ['ALAMBRADO', 'CERCA', 'CAMERA', 'CFTV', 'GUARITA'],
  PAISAGISMO: ['PLANTIO_GRAMA', 'GRAMA', 'JARDIM', 'HIDROSSEMEADURA', 'BIOMANTA', 'PODA'],
  MANUTENCAO: ['LIMPEZA_TERRENO', 'ROCAGEM', 'CAPINA', 'REMOCAO_ENTULHO', 'REPARO'],
  DEMOLICAO: ['DEMOLICAO_TOTAL', 'DEMOLICAO_PARCIAL', 'REMOCAO', 'CORTE_CONCRETO'],
  ELETRICA: ['ELETRODUTO', 'CABEAMENTO', 'QUADRO_ELETRICO', 'TOMADA', 'LUMINARIA', 'ATERRAMENTO'],
  HIDRAULICA: ['TUBULACAO_AGUA_FRIA', 'TUBULACAO_ESGOTO', 'CAIXA_DAGUA', 'BOMBA', 'VASO_SANITARIO'],
  OUTROS: ['NAO_IDENTIFICADO', 'REGISTRO', 'GERAL']
};

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  imageUrl,
  ocrText,
  onUpdateResult,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFilename, setEditedFilename] = useState('');
  const [editedPortico, setEditedPortico] = useState('');
  const [editedDisciplina, setEditedDisciplina] = useState('');
  const [editedService, setEditedService] = useState('');
  const [editedData, setEditedData] = useState('');
  const [availableServicos, setAvailableServicos] = useState<string[]>([]);
  
  // Image zoom state
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Reset form when result changes
  useEffect(() => {
    if (result) {
      setEditedFilename(result.filename || '');
      setEditedPortico(result.portico || '');
      setEditedDisciplina(result.disciplina || '');
      setEditedService(result.service || '');
      setEditedData(result.data_detectada || '');
      setIsEditing(false);
    }
  }, [result]);

  // Update available services when discipline changes
  useEffect(() => {
    const servicos = SERVICOS_POR_DISCIPLINA[editedDisciplina] || SERVICOS_POR_DISCIPLINA['OUTROS'];
    setAvailableServicos(servicos);
    
    // If current service is not in new discipline, reset it
    if (!servicos.includes(editedService)) {
      setEditedService(servicos[0] || '');
    }
  }, [editedDisciplina]);

  if (!result) return null;

  const handleStartEdit = () => {
    setEditedFilename(result.filename || '');
    setEditedPortico(result.portico || '');
    setEditedDisciplina(result.disciplina || '');
    setEditedService(result.service || '');
    setEditedData(result.data_detectada || '');
    setIsEditing(true);
  };

  // Build destination path
  const buildDestPath = (portico: string, disciplina: string, servico: string, data?: string): string => {
    const basePath = `organized_photos/${portico}/${disciplina}/${servico}`;
    
    if (data) {
      // Parse date DD/MM/YYYY
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

  const handleSaveEdit = () => {
    if (onUpdateResult) {
      const newDest = buildDestPath(editedPortico, editedDisciplina, editedService, editedData);
      
      onUpdateResult({
        ...result,
        filename: editedFilename || result.filename,
        portico: editedPortico,
        disciplina: editedDisciplina,
        service: editedService,
        data_detectada: editedData || undefined,
        dest: newDest,
        method: 'heuristica', // Mark as manually edited
        confidence: 1.0, // Manual = 100% confidence
        status: 'Sucesso', // Mark as success after manual edit
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedFilename(result.filename || '');
    setEditedPortico(result.portico || '');
    setEditedDisciplina(result.disciplina || '');
    setEditedService(result.service || '');
    setEditedData(result.data_detectada || '');
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-primary" />
            {isEditing ? (
              <Input 
                value={editedFilename}
                onChange={(e) => setEditedFilename(e.target.value)}
                className="h-7 font-mono text-sm max-w-[300px]"
                placeholder="Nome do arquivo..."
              />
            ) : (
              result.filename
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Expanded Image Modal */}
          {isImageExpanded && imageUrl && (
            <div 
              className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
              onClick={() => {
                setIsImageExpanded(false);
                setZoomLevel(1);
              }}
            >
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-2 text-sm text-white bg-secondary/80 rounded">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
                  disabled={zoomLevel >= 4}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => {
                    setIsImageExpanded(false);
                    setZoomLevel(1);
                  }}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Scrollable Image Container */}
              <div 
                className="flex-1 overflow-auto flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={imageUrl} 
                  alt={result.filename}
                  className="max-w-none transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  draggable={false}
                />
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full">
                Clique fora ou no X para fechar • Use os botões para zoom
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Image Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preview</Label>
                {imageUrl && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsImageExpanded(true)}
                  >
                    <Maximize2 className="h-3 w-3" />
                    Expandir
                  </Button>
                )}
              </div>
              <div 
                className={cn(
                  "aspect-video bg-secondary rounded-lg overflow-hidden flex items-center justify-center",
                  imageUrl && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                )}
                onClick={() => imageUrl && setIsImageExpanded(true)}
              >
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={result.filename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Preview não disponível</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis / OCR Text */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Análise da IA
              </Label>
              <Textarea 
                readOnly 
                value={result.tecnico || ocrText || 'Nenhuma análise disponível'}
                className="h-[200px] bg-secondary/50 text-xs resize-none"
              />
            </div>
          </div>

          {/* Classification Info */}
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-warning" />
                Classificação
              </h4>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSaveEdit}>
                    <Check className="w-3 h-3 mr-1" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Frente de Serviço</Label>
                  <Input 
                    value={editedPortico}
                    onChange={(e) => setEditedPortico(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    placeholder="P_10, CORTINA_01..."
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Disciplina</Label>
                  <Select value={editedDisciplina} onValueChange={setEditedDisciplina}>
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {DISCIPLINAS.map(disc => (
                        <SelectItem key={disc} value={disc} className="font-mono text-sm">
                          {disc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Serviço</Label>
                  <Select value={editedService} onValueChange={setEditedService}>
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableServicos.map(serv => (
                        <SelectItem key={serv} value={serv} className="font-mono text-sm">
                          {serv}
                        </SelectItem>
                      ))}
                      {/* Allow custom service */}
                      <SelectItem value="__custom__" className="font-mono text-sm text-muted-foreground">
                        + Personalizado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editedService === '__custom__' && (
                    <Input 
                      value=""
                      onChange={(e) => setEditedService(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                      placeholder="Digite o serviço..."
                      className="font-mono text-sm mt-1"
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Data (DD/MM/AAAA)
                  </Label>
                  <Input 
                    value={editedData}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d/]/g, '');
                      // Auto-format as DD/MM/YYYY
                      if (value.length === 2 && !value.includes('/')) {
                        value += '/';
                      } else if (value.length === 5 && value.split('/').length === 2) {
                        value += '/';
                      }
                      if (value.length <= 10) {
                        setEditedData(value);
                      }
                    }}
                    placeholder="DD/MM/AAAA"
                    className="font-mono text-sm"
                    maxLength={10}
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frente de Serviço</p>
                  <p className="font-mono text-sm font-medium">{result.portico || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disciplina</p>
                  <p className="font-mono text-sm font-medium">{result.disciplina || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Serviço</p>
                  <p className="font-mono text-sm font-medium">{result.service || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-mono text-sm font-medium">{result.data_detectada || '-'}</p>
                </div>
              </div>
            )}

            {/* Location info */}
            {(result.rodovia || result.km_inicio || result.gps_lat) && (
              <div className="glass-card p-3 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  Localização
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  {result.rodovia && (
                    <div>
                      <p className="text-xs text-muted-foreground">Rodovia</p>
                      <p className="font-mono text-sm font-medium text-primary">{result.rodovia}</p>
                    </div>
                  )}
                  {result.km_inicio && (
                    <div>
                      <p className="text-xs text-muted-foreground">KM</p>
                      <p className="font-mono text-sm font-medium">
                        {result.km_inicio}{result.km_fim ? ` - ${result.km_fim}` : ''}
                      </p>
                    </div>
                  )}
                  {result.sentido && (
                    <div>
                      <p className="text-xs text-muted-foreground">Sentido</p>
                      <p className="font-mono text-sm font-medium flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {result.sentido}
                      </p>
                    </div>
                  )}
                  {result.gps_lat && result.gps_lon && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">GPS</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {result.gps_lat.toFixed(6)}, {result.gps_lon.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alertas */}
            {result.alertas && Object.values(result.alertas).some(Boolean) && (
              <div className="glass-card p-3 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Alertas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.alertas.sem_placa && (
                    <Badge variant="outline" className="border-warning/50 text-warning bg-warning/5">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Sem placa de identificação
                    </Badge>
                  )}
                  {result.alertas.texto_ilegivel && (
                    <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/5">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Texto ilegível
                    </Badge>
                  )}
                  {result.alertas.evidencia_fraca && (
                    <Badge variant="outline" className="border-warning/50 text-warning bg-warning/5">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Evidência fraca para auditoria
                    </Badge>
                  )}
                  {result.alertas.km_inconsistente && (
                    <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/5">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      KM inconsistente
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Método</p>
                <p className="font-medium flex items-center gap-1">
                  {result.method === 'heuristica' ? 'Manual/Heurística' : 
                   result.method === 'ia_fallback' ? 'IA Fallback' : 
                   result.method === 'ia_forcada' ? 'IA Forçada' : '-'}
                  {result.method !== 'heuristica' && <Brain className="w-3 h-3 text-primary" />}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confiança</p>
                <p className={cn("font-medium", getConfidenceColor(result.confidence))}>
                  {result.confidence ? `${Math.round(result.confidence * 100)}%` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn(
                  "font-medium",
                  result.status === 'Sucesso' ? 'text-success' : 'text-destructive'
                )}>
                  {result.status}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Caminho de Destino</p>
              <p className="font-mono text-xs text-primary break-all bg-secondary/50 p-2 rounded">
                {result.dest || 'Não definido'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoPreviewModal;
