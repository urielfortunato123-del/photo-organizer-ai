import React, { useEffect, useState } from 'react';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PhotoPreview {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress?: number;
}

interface PhotoPreviewGridProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  processingFiles?: Set<string>;
  completedFiles?: Set<string>;
  errorFiles?: Set<string>;
  maxVisible?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const truncateFilename = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  const ext = name.split('.').pop() || '';
  const nameWithoutExt = name.slice(0, name.length - ext.length - 1);
  const truncated = nameWithoutExt.slice(0, maxLength - ext.length - 4);
  return `${truncated}...${ext}`;
};

const PhotoPreviewGrid: React.FC<PhotoPreviewGridProps> = ({
  files,
  onRemoveFile,
  onClearAll,
  processingFiles = new Set(),
  completedFiles = new Set(),
  errorFiles = new Set(),
  maxVisible = 20,
}) => {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  // Generate previews for files
  useEffect(() => {
    const newPreviews = new Map<string, string>();
    const filesToPreview = files.slice(0, maxVisible);
    
    filesToPreview.forEach((file, index) => {
      const key = `${file.name}-${index}`;
      if (!previews.has(key)) {
        newPreviews.set(key, URL.createObjectURL(file));
      } else {
        newPreviews.set(key, previews.get(key)!);
      }
    });

    // Revoke old URLs
    previews.forEach((url, key) => {
      if (!newPreviews.has(key)) {
        URL.revokeObjectURL(url);
      }
    });

    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files, maxVisible]);

  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const visibleFiles = files.slice(0, maxVisible);
  const hiddenCount = files.length - maxVisible;

  const getStatus = (fileName: string): 'pending' | 'processing' | 'done' | 'error' => {
    if (errorFiles.has(fileName)) return 'error';
    if (completedFiles.has(fileName)) return 'done';
    if (processingFiles.has(fileName)) return 'processing';
    return 'pending';
  };

  const statusBadge = (status: 'pending' | 'processing' | 'done' | 'error') => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pendente</Badge>;
      case 'processing':
        return (
          <Badge className="text-[10px] px-1.5 py-0 bg-warning/20 text-warning animate-pulse">
            <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
            Processando
          </Badge>
        );
      case 'done':
        return (
          <Badge className="text-[10px] px-1.5 py-0 bg-success/20 text-success">
            <Check className="w-2.5 h-2.5 mr-0.5" />
            Concluído
          </Badge>
        );
      case 'error':
        return (
          <Badge className="text-[10px] px-1.5 py-0 bg-destructive/20 text-destructive">
            <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
            Erro
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with counter and clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-foreground">
            {files.length} {files.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
          </p>
          <Badge variant="outline" className="text-xs">
            {formatFileSize(totalSize)} total
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4 mr-1" />
          Limpar Tudo
        </Button>
      </div>

      {/* Grid of thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin p-1">
        {visibleFiles.map((file, index) => {
          const key = `${file.name}-${index}`;
          const preview = previews.get(key);
          const status = getStatus(file.name);

          return (
            <div
              key={key}
              className={cn(
                "relative group rounded-xl overflow-hidden bg-secondary border transition-all duration-200",
                status === 'processing' && "ring-2 ring-warning/50",
                status === 'done' && "ring-2 ring-success/50",
                status === 'error' && "ring-2 ring-destructive/50",
                "hover:ring-2 hover:ring-primary/50"
              )}
            >
              {/* Thumbnail */}
              <div className="aspect-square relative">
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Processing overlay */}
                {status === 'processing' && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-warning" />
                  </div>
                )}

                {/* Done overlay */}
                {status === 'done' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => onRemoveFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* File info */}
              <div className="p-2 space-y-1">
                <p className="text-[11px] text-foreground truncate font-medium" title={file.name}>
                  {truncateFilename(file.name)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  {statusBadge(status)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Hidden files indicator */}
        {hiddenCount > 0 && (
          <div className="aspect-square rounded-xl bg-secondary/50 border-2 border-dashed border-border flex flex-col items-center justify-center p-4">
            <p className="text-2xl font-bold text-primary">+{hiddenCount}</p>
            <p className="text-xs text-muted-foreground text-center">mais fotos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoPreviewGrid;
