import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ImagePlus, X, FolderTree, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

const UploadZone: React.FC<UploadZoneProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStats, setScanStats] = useState({ folders: 0, images: 0, current: '' });

  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.heic'];
    const lowerName = fileName.toLowerCase();
    return imageExtensions.some(ext => lowerName.endsWith(ext));
  };

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

  // Recursive folder reading - collect all entries first to avoid iterator issues
  const readDirectoryRecursively = async (
    dirHandle: any,
    path: string = ''
  ): Promise<File[]> => {
    const foundFiles: File[] = [];
    
    // Collect all entries first to avoid async iterator issues
    const allEntries: any[] = [];
    try {
      for await (const entry of dirHandle.values()) {
        allEntries.push(entry);
      }
    } catch (err) {
      console.warn(`Erro ao listar diretório ${path}:`, err);
      return foundFiles;
    }

    console.log(`[Scan] Pasta "${path || 'raiz'}": ${allEntries.length} itens encontrados`);
    
    // Process each entry
    for (const entry of allEntries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        if (isImageFile(entry.name)) {
          try {
            const file = await entry.getFile();
            const fileWithPath = new File([file], entryPath, { type: file.type });
            foundFiles.push(fileWithPath);
            
            // Update stats for each image found
            setScanStats(prev => ({
              ...prev,
              images: prev.images + 1,
              current: entryPath
            }));
          } catch (err) {
            console.warn(`Não foi possível ler: ${entryPath}`, err);
          }
        }
      } else if (entry.kind === 'directory') {
        setScanStats(prev => ({
          ...prev,
          folders: prev.folders + 1,
          current: entryPath
        }));
        
        // Recursively read subdirectory
        const subFiles = await readDirectoryRecursively(entry, entryPath);
        foundFiles.push(...subFiles);
      }
    }
    
    return foundFiles;
  };

  const isPreviewIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const handleSelectFolder = useCallback(async () => {
    if (isPreviewIframe) {
      toast.error('No modo de preview, o navegador bloqueia selecionar pastas. Publique/abra o app em uma aba e tente novamente, ou use o método alternativo.');
      return;
    }

    if (!('showDirectoryPicker' in window)) {
      toast.error('Seu navegador não suporta seleção de pastas. Use Chrome, Edge ou Opera.');
      return;
    }

    try {
      setIsScanning(true);
      setScanStats({ folders: 0, images: 0, current: '' });

      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      toast.info(`Escaneando pasta "${dirHandle.name}"...`);

      const allFiles = await readDirectoryRecursively(dirHandle, dirHandle.name);

      if (allFiles.length === 0) {
        toast.warning('Nenhuma imagem encontrada nas pastas.');
      } else {
        toast.success(`${allFiles.length} imagens encontradas!`);
        onFilesChange([...files, ...allFiles]);
      }
    } catch (err: any) {
      if (err?.name === 'SecurityError') {
        toast.error('O navegador bloqueou a seleção de pasta neste modo. Publique/abra o app em uma aba e tente novamente.');
        return;
      }

      if (err?.name !== 'AbortError') {
        console.error('Erro ao ler pasta:', err);
        toast.error('Erro ao ler a pasta.');
      }
    } finally {
      setIsScanning(false);
      setScanStats({ folders: 0, images: 0, current: '' });
    }
  }, [files, onFilesChange, isPreviewIframe]);

  // Fallback for browsers without showDirectoryPicker
  const handleFolderFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      if (isImageFile(file.name)) {
        const pathName = (file as any).webkitRelativePath || file.name;
        const fileWithPath = new File([file], pathName, { type: file.type });
        imageFiles.push(fileWithPath);
      }
    }

    if (imageFiles.length === 0) {
      toast.warning('Nenhuma imagem encontrada.');
    } else {
      toast.success(`${imageFiles.length} imagens encontradas!`);
      onFilesChange([...files, ...imageFiles]);
    }
    e.target.value = '';
  }, [files, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  return (
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Folder Selection - Two Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Folder Button */}
        <motion.div 
          onClick={!isScanning ? handleSelectFolder : undefined}
          className={cn(
            "relative group cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all duration-200",
            "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10",
            isScanning && "pointer-events-none opacity-70"
          )}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            {isScanning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-8 w-8 text-primary" />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-foreground">Escaneando...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {scanStats.folders} pastas | {scanStats.images} imagens
                  </p>
                </div>
              </>
            ) : (
              <>
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <FolderTree className="h-6 w-6 text-primary" />
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Selecionar Pasta</p>
                  <p className="text-xs text-muted-foreground mt-1">Lê todas as subpastas automaticamente</p>
                </div>
              </>
            )}
          </div>
          {isPreviewIframe && !isScanning && (
            <p className="text-[10px] text-muted-foreground text-center mt-3 leading-tight">
              No preview, o navegador bloqueia seleção de pastas. Publique/abra em uma aba ou use o método alternativo.
            </p>
          )}
        </motion.div>

        {/* Fallback folder input */}
        <motion.div 
          className="relative"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <input
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleFolderFallback}
            disabled={isScanning}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <motion.div 
            className={cn(
              "h-full rounded-xl border-2 border-dashed p-6 transition-all duration-200",
              "border-border bg-secondary/30 hover:border-muted-foreground/50 hover:bg-secondary/50",
              isScanning && "opacity-50 pointer-events-none"
            )}
            whileHover={{ 
              scale: 1.02, 
              y: -4,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
          >
            <div className="flex flex-col items-center gap-3 text-center h-full justify-center">
              <motion.div 
                className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-foreground">Método Alternativo</p>
                <p className="text-xs text-muted-foreground mt-1">Para navegadores mais antigos</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Drop zone for individual files */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
          "border-border bg-secondary/20 hover:border-muted-foreground/40 hover:bg-secondary/30",
          isDragging && "border-primary bg-primary/10"
        )}
        variants={cardVariants}
        initial="hidden"
        animate={isDragging ? { opacity: 1, y: 0, scale: 1.02 } : "visible"}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
        whileHover={{ scale: 1.01 }}
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
          <div className="flex flex-col items-center gap-3">
            <motion.div 
              className={cn(
                "w-12 h-12 rounded-xl bg-secondary flex items-center justify-center transition-transform",
                isDragging && "bg-primary/20"
              )}
              animate={isDragging ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Upload className={cn(
                "w-6 h-6 text-muted-foreground transition-colors",
                isDragging && "text-primary"
              )} />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Ou arraste fotos individuais aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, HEIC • Múltiplos arquivos
              </p>
            </div>
          </div>
        </label>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              </p>
              <motion.button
                onClick={() => onFilesChange([])}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Limpar todos
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto scrollbar-thin p-1">
              <AnimatePresence mode="popLayout">
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    className="relative group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      delay: index * 0.02
                    }}
                    layout
                  >
                    <motion.div 
                      className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border"
                      whileHover={{ scale: 1.05, y: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <motion.button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg"
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                    <p className="text-[10px] text-muted-foreground truncate mt-1 px-1">
                      {file.name}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UploadZone;
