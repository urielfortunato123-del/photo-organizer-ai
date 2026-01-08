import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, FileImage, HardDrive, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ValidationResult {
  valid: File[];
  invalid: { file: File; reason: string }[];
  warnings: { file: File; reason: string }[];
  totalSize: number;
  hasErrors: boolean;
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  empresa: string;
  frenteServico?: string;
  onContinue: () => void;
  onRemoveFile: (fileName: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.heic'];
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB

const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  files,
  empresa,
  frenteServico,
  onContinue,
  onRemoveFile,
}) => {
  const validation = useMemo<ValidationResult>(() => {
    const valid: File[] = [];
    const invalid: { file: File; reason: string }[] = [];
    const warnings: { file: File; reason: string }[] = [];
    let totalSize = 0;

    files.forEach(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExt = VALID_EXTENSIONS.includes(ext);

      if (!isValidExt) {
        invalid.push({ file, reason: `Formato inválido (${ext})` });
        return;
      }

      valid.push(file);
      totalSize += file.size;

      // Check for large files
      if (file.size > LARGE_FILE_THRESHOLD) {
        warnings.push({ file, reason: `Arquivo grande (${formatFileSize(file.size)}) - será comprimido` });
      }
    });

    return {
      valid,
      invalid,
      warnings,
      totalSize,
      hasErrors: invalid.length > 0 || !empresa,
    };
  }, [files, empresa]);

  const canProceed = validation.valid.length > 0 && empresa;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-primary" />
            Validação Pré-Processamento
          </DialogTitle>
          <DialogDescription>
            Revise os arquivos antes de processar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Verificações passadas</span>
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <FileImage className="w-3 h-3" />
                {validation.valid.length} fotos válidas (JPG, PNG, HEIC)
              </p>
              <p className="flex items-center gap-2">
                <HardDrive className="w-3 h-3" />
                Tamanho total: {formatFileSize(validation.totalSize)}
              </p>
              <p className="flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                Empresa definida: <strong className="text-foreground">{empresa || 'Não definida'}</strong>
              </p>
            </div>
          </div>

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Avisos ({validation.warnings.length})</span>
              </div>
              <ScrollArea className="h-24 pl-6">
                <div className="space-y-1 text-sm">
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="truncate flex-1">{w.file.name}</span>
                      <Badge variant="outline" className="text-warning border-warning/50 text-[10px]">
                        {w.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Errors */}
          {validation.invalid.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Arquivos inválidos ({validation.invalid.length})</span>
              </div>
              <ScrollArea className="h-32 pl-6">
                <div className="space-y-1 text-sm">
                  {validation.invalid.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-destructive/5 p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground">{item.file.name}</p>
                        <p className="text-xs text-destructive">{item.reason}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFile(item.file.name)}
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Missing empresa error */}
          {!empresa && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/5 p-3 rounded-lg">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Empresa não definida. Configure nas opções.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Corrigir Problemas
          </Button>
          {validation.invalid.length === 0 && canProceed && (
            <Button
              onClick={onContinue}
              className="flex-1 gnome-btn-primary"
            >
              Processar {validation.valid.length} Fotos
            </Button>
          )}
          {validation.invalid.length > 0 && validation.valid.length > 0 && canProceed && (
            <Button
              onClick={onContinue}
              variant="outline"
              className="flex-1 border-warning text-warning hover:bg-warning/10"
            >
              Continuar com {validation.valid.length} válidas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationModal;
