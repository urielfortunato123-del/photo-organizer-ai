import React, { useState } from 'react';
import { X, FileImage, FolderOpen, Brain, Edit2, Check, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProcessingResult } from '@/services/api';
import { cn } from '@/lib/utils';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProcessingResult | null;
  imageUrl?: string;
  ocrText?: string;
  onUpdateResult?: (updated: ProcessingResult) => void;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  result,
  imageUrl,
  ocrText,
  onUpdateResult,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPortico, setEditedPortico] = useState(result?.portico || '');
  const [editedDisciplina, setEditedDisciplina] = useState(result?.disciplina || '');
  const [editedService, setEditedService] = useState(result?.service || '');

  if (!result) return null;

  const handleStartEdit = () => {
    setEditedPortico(result.portico || '');
    setEditedDisciplina(result.disciplina || '');
    setEditedService(result.service || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onUpdateResult) {
      onUpdateResult({
        ...result,
        portico: editedPortico,
        disciplina: editedDisciplina,
        service: editedService,
        method: 'heuristica', // Mark as manually edited
        confidence: 1.0, // Manual = 100% confidence
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
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
            {result.filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Image Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="aspect-video bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
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

            {/* OCR Text */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Texto OCR Extraído</Label>
              <Textarea 
                readOnly 
                value={ocrText || 'Nenhum texto extraído'}
                className="h-[200px] bg-secondary/50 font-mono text-xs resize-none"
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
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Pórtico</Label>
                  <Input 
                    value={editedPortico}
                    onChange={(e) => setEditedPortico(e.target.value.toUpperCase())}
                    placeholder="PORTICO_P_10"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Disciplina</Label>
                  <Input 
                    value={editedDisciplina}
                    onChange={(e) => setEditedDisciplina(e.target.value.toUpperCase())}
                    placeholder="FUNDACAO"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Serviço</Label>
                  <Input 
                    value={editedService}
                    onChange={(e) => setEditedService(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    placeholder="CONCRETAGEM_BLOCO"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pórtico</p>
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
              </div>
            )}

            <div className="pt-2 border-t border-border grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Método</p>
                <p className="font-medium flex items-center gap-1">
                  {result.method === 'heuristica' ? 'Heurística' : 
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
                <p className="text-xs text-muted-foreground">Data Detectada</p>
                <p className="font-medium font-mono">{result.data_detectada || '-'}</p>
              </div>
            </div>

            {result.tecnico && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Análise Técnica (IA)</p>
                <p className="text-sm text-foreground">{result.tecnico}</p>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Caminho de Destino</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
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
