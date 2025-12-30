import React, { useCallback, useState } from 'react';
import { Upload, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    onFilesChange([...files, ...droppedFiles]);
  }, [files, onFilesChange]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/')
      );
      onFilesChange([...files, ...selectedFiles]);
    }
  }, [files, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "upload-zone p-8 md:p-12 text-center cursor-pointer group",
          isDragging && "drag-active"
        )}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center transition-all duration-300",
              "group-hover:bg-primary/20 group-hover:scale-110",
              isDragging && "bg-primary/20 scale-110"
            )}>
              <Upload className={cn(
                "w-8 h-8 text-muted-foreground transition-colors",
                "group-hover:text-primary",
                isDragging && "text-primary"
              )} />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-1">
                Arraste suas fotos aqui
              </p>
              <p className="text-sm text-muted-foreground">
                ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Suporta JPG, PNG, HEIC • Múltiplos arquivos
              </p>
            </div>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
            </p>
            <button
              onClick={() => onFilesChange([])}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todos
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto scrollbar-thin p-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative group animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-[10px] text-muted-foreground truncate mt-1 px-1">
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
