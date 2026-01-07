import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  Play, ImageIcon, CheckCircle2, XCircle, 
  Upload, Table as TableIcon, FolderTree, Folder,
  User, Sparkles, RefreshCw, FolderArchive, FileSpreadsheet,
  Plus, X, Database, Clock, FileText, AlertTriangle, Zap, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import GnomeSidebar from '@/components/GnomeSidebar';
import UploadZone from '@/components/UploadZone';
import ProcessingOptions from '@/components/ProcessingOptions';
import EditableResultsTable from '@/components/EditableResultsTable';
import StatsCard from '@/components/StatsCard';
import TreeView from '@/components/TreeView';
import ProcessingProgress from '@/components/ProcessingProgress';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';
import ResultsFilters, { ResultFilters } from '@/components/ResultsFilters';
import StatisticsCard from '@/components/StatisticsCard';
import DetailedReport from '@/components/DetailedReport';
import CooldownOverlay from '@/components/CooldownOverlay';
import ErrorsReport from '@/components/ErrorsReport';
import { exportToExcelXML } from '@/utils/exportExcel';
import { useImageCache } from '@/hooks/useImageCache';
import { useTrialSession } from '@/hooks/useTrialSession';
import { useAuth } from '@/hooks/useAuth';
import { useOCR, extractStructuredData } from '@/hooks/useOCR';
import { useProcessingQueue } from '@/hooks/useProcessingQueue';
import { useFileStorage } from '@/hooks/useFileStorage';
import { 
  api, 
  ProcessingResult, 
  TreeNode,
  buildTreeFromResults,
  PreProcessedOCR
} from '@/services/api';

// Config (otimizado): lotes maiores + cooldown curto
const PROCESSING_CONFIG = {
  batchSize: 10,          // Fotos por lote enviado à IA
  groupSize: 100,         // Fotos antes do cooldown
  cooldownSeconds: 10,    // Intervalo de 10s (como você pediu)
  delayBetweenBatches: 100, // 100ms entre lotes
};

const Index: React.FC = () => {
  const imageCache = useImageCache();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { extractText, terminate: terminateOCR } = useOCR();
  const { 
    processQueue, 
    queueStats, 
    abort: abortQueue, 
    reset: resetQueue, 
    skipCooldown,
    pause: pauseQueue,
    resume: resumeQueue,
    setResults: setQueueResults,
    isCooldown,
    isPaused,
  } = useProcessingQueue(PROCESSING_CONFIG);
  
  // File storage for persistence across refresh
  const { saveFiles, loadFiles, clearFiles, storedCount, isLoading: isLoadingFiles } = useFileStorage();
  
  // Cooldown for reprocess button (30 seconds)
  const [reprocessCooldown, setReprocessCooldown] = useState(0);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const { 
    isTrialActive, 
    canStartTrial, 
    startTrial, 
    formatRemainingTime,
    sessionsUsedToday,
    sessionsUsedThisWeek,
    maxSessionsPerDay,
    maxSessionsPerWeek
  } = useTrialSession();
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());
  const [defaultPortico, setDefaultPortico] = useState('');
  const [empresa, setEmpresa] = useState('HABITECHENE');
  const [organizeByDate, setOrganizeByDate] = useState(true);
  const [iaPriority, setIaPriority] = useState(true);
  const [economicMode, setEconomicMode] = useState(false);
  const [useLocalOCR, setUseLocalOCR] = useState(true); // OCR local ativado por padrão
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  
  // Progress tracking
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>();
  
  // Photo preview modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    result: ProcessingResult | null;
    imageUrl?: string;
  }>({ isOpen: false, result: null });
  
  // Detailed report modal
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  
  // Errors report modal
  const [showErrorsReport, setShowErrorsReport] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<ResultFilters>({
    search: '',
    portico: '',
    disciplina: '',
    method: '',
    minConfidence: 0,
  });

  // Load files from storage on mount
  useEffect(() => {
    const restoreFiles = async () => {
      if (filesLoaded) return;
      
      const stored = await loadFiles();
      if (stored.length > 0) {
        setFiles(stored);
        toast({
          title: "Arquivos restaurados",
          description: `${stored.length} arquivo(s) carregados da sessão anterior.`,
        });
      }
      setFilesLoaded(true);
    };
    
    if (!isLoadingFiles) {
      restoreFiles();
    }
  }, [isLoadingFiles, filesLoaded, loadFiles, toast]);

  // Save files to storage when they change
  useEffect(() => {
    if (filesLoaded && files.length > 0) {
      saveFiles(files);
    }
  }, [files, filesLoaded, saveFiles]);

  // Generate file URLs when files change
  useEffect(() => {
    const urls = new Map<string, string>();
    files.forEach(file => {
      urls.set(file.name, URL.createObjectURL(file));
    });
    setFileUrls(urls);
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  // Update tree when results change
  useEffect(() => {
    if (results.length > 0) {
      setTreeData(buildTreeFromResults(results));
    }
  }, [results]);

  // Extract unique values for filter dropdowns
  const uniquePorticos = useMemo(() => 
    [...new Set(results.map(r => r.portico).filter(Boolean) as string[])],
    [results]
  );
  
  const uniqueDisciplinas = useMemo(() => 
    [...new Set(results.map(r => r.disciplina).filter(Boolean) as string[])],
    [results]
  );

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (filters.search && !r.filename.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.portico && r.portico !== filters.portico) {
        return false;
      }
      if (filters.disciplina && r.disciplina !== filters.disciplina) {
        return false;
      }
      if (filters.method && r.method !== filters.method) {
        return false;
      }
      if (filters.minConfidence > 0 && (r.confidence || 0) * 100 < filters.minConfidence) {
        return false;
      }
      return true;
    });
  }, [results, filters]);

  const successCount = results.filter(r => r.status === 'Sucesso').length;
  const errorCount = results.filter(r => r.status.includes('Erro')).length;

  // Track processed filenames to avoid duplicates
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());

  // Cooldown timer effect
  useEffect(() => {
    if (reprocessCooldown <= 0) return;
    const timer = setInterval(() => {
      setReprocessCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [reprocessCooldown]);

  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingProcessFiles, setPendingProcessFiles] = useState<File[]>([]);

  // Estimate cost based on file count
  // OCR local reduz custo em ~60-70% por usar prompts menores
  // Economic mode: ~$0.001-0.002 per image (com OCR local)
  // Standard mode: ~$0.002-0.004 per image (com OCR local)
  const estimateCost = (count: number, isEconomic: boolean, hasOCR: boolean) => {
    const factor = hasOCR ? 0.4 : 1; // OCR local reduz 60%
    const minCost = count * (isEconomic ? 0.0025 : 0.005) * factor;
    const maxCost = count * (isEconomic ? 0.005 : 0.01) * factor;
    return `$${minCost.toFixed(2)} - $${maxCost.toFixed(2)}`;
  };

  // Estimate photos per $20
  const estimatePhotosPerBudget = (isEconomic: boolean, hasOCR: boolean) => {
    if (hasOCR) {
      return isEconomic ? '10.000-20.000' : '5.000-10.000';
    }
    return isEconomic ? '4.000-8.000' : '2.000-4.000';
  };

  const handleProcess = async () => {
    // Filter out already processed files
    const newFiles = files.filter(f => !processedFiles.has(f.name));
    
    if (newFiles.length === 0) {
      toast({
        title: "Nenhuma foto nova",
        description: files.length > 0 
          ? "Todas as fotos já foram processadas. Adicione novas fotos."
          : "Adicione fotos para processar",
        variant: "destructive",
      });
      return;
    }

    // If more than 50 files, show confirmation dialog
    if (newFiles.length > 50) {
      setPendingProcessFiles(newFiles);
      setShowConfirmDialog(true);
      return;
    }

    // Otherwise process directly
    await executeProcessing(newFiles);
  };

  const executeProcessing = async (filesToProcess: File[]) => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    setProcessingProgress({ current: 0, total: filesToProcess.length, currentFile: 'Preparando...' });

    const config = {
      default_portico: defaultPortico,
      empresa: empresa,
      organize_by_date: organizeByDate,
      ia_priority: iaPriority,
      economicMode: economicMode,
      useLocalOCR: useLocalOCR,
    };

    // Função de extração OCR local
    const ocrExtractor = useLocalOCR ? async (file: File): Promise<PreProcessedOCR | null> => {
      try {
        const { ensureJpegCompatible } = await import('@/utils/imageFormat');
        const normalized = await ensureJpegCompatible(file);
        const result = await extractText(normalized);
        return {
          rawText: result.rawText,
          rodovia: result.rodovia,
          km_inicio: result.km_inicio,
          km_fim: result.km_fim,
          sentido: result.sentido,
          data: result.data,
          hora: result.hora,
          hasPlaca: result.hasPlaca,
          confidence: result.confidence,
        };
      } catch {
        return null;
      }
    } : undefined;

    try {
      // Use the queue for processing - no limits!
      await processQueue(
        filesToProcess,
        config,
        ocrExtractor,
        // onBatchComplete - update results incrementally
        (batchResults) => {
          setResults(prev => [...prev, ...batchResults]);
          batchResults.forEach(r => {
            setProcessedFiles(prev => new Set([...prev, r.filename]));
          });
          setActiveTab('results');
          
          // Update progress based on queue stats
          setProcessingProgress({
            current: queueStats.processed,
            total: queueStats.total,
            currentFile: queueStats.currentFile,
          });
        },
        // onComplete
        (allResults) => {
          const successCount = allResults.filter(r => r.status === 'Sucesso').length;
          const creditErrors = allResults.filter(r => r.status.includes('402') || r.status.includes('crédito')).length;
          
          if (creditErrors > 0) {
            toast({
              title: "Processamento interrompido",
              description: `Limite de créditos atingido. ${successCount} fotos processadas.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Processamento concluído!",
              description: `${successCount} de ${filesToProcess.length} fotos analisadas com sucesso.`,
            });
          }
          
          setIsProcessing(false);
          setProcessingProgress({ current: 0, total: 0, currentFile: '' });
          setProcessingStartTime(undefined);
          setPendingProcessFiles([]);
        }
      );
    } catch (error) {
      console.error('Processing error:', error);
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      
      toast({
        title: errorMsg.includes('crédito') ? "Limite de créditos" : "Erro no processamento",
        description: errorMsg,
        variant: "destructive",
      });
      
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentFile: '' });
      setProcessingStartTime(undefined);
      setPendingProcessFiles([]);
    }
  };

  // Sync queue stats with processing progress
  useEffect(() => {
    if (queueStats.isProcessing) {
      setProcessingProgress({
        current: queueStats.processed,
        total: queueStats.total,
        currentFile: queueStats.currentFile,
      });
    }
  }, [queueStats]);

  // Helper to check if a result is incomplete (OK but no data)
  const isIncompleteResult = (r: ProcessingResult) => {
    return r.status === 'Sucesso' && (
      !r.portico || r.portico === '-' || r.portico === '' ||
      !r.disciplina || r.disciplina === '-' || r.disciplina === '' ||
      !r.service || r.service === '-' || r.service === ''
    );
  };

  // Helper to check if result needs reprocessing
  const needsReprocessing = (r: ProcessingResult) => {
    return r.status.includes('Erro') || isIncompleteResult(r);
  };

  const handleRetryFailed = async () => {
    console.log('handleRetryFailed called');
    console.log('Total results:', results.length);
    
    // Include both errors AND incomplete results (OK but no data)
    const failedResults = results.filter(needsReprocessing);
    console.log('Failed/incomplete results:', failedResults.length, failedResults.map(r => ({ name: r.filename, status: r.status, portico: r.portico })));
    
    if (failedResults.length === 0) {
      toast({
        title: "Nenhum erro encontrado",
        description: "Não há fotos com erro ou incompletas para reprocessar.",
      });
      return;
    }

    console.log('Available files:', files.length, files.map(f => f.name));
    const failedFiles = files.filter(f => 
      failedResults.some(r => r.filename === f.name)
    );
    console.log('Matched files for retry:', failedFiles.length);

    if (failedFiles.length === 0) {
      toast({
        title: "Arquivos não encontrados",
        description: "Os arquivos originais não estão mais disponíveis.",
        variant: "destructive",
      });
      return;
    }

    // Remove from cache so they get reprocessed
    failedResults.forEach(r => {
      if (r.hash) {
        imageCache.removeFromCache(r.hash);
      }
    });

    // Remove from processed files so they can be reprocessed
    setProcessedFiles(prev => {
      const updated = new Set(prev);
      failedResults.forEach(r => updated.delete(r.filename));
      return updated;
    });

    console.log(`Reprocessing ${failedFiles.length} files:`, failedFiles.map(f => f.name));

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    setProcessingProgress({ current: 0, total: failedFiles.length, currentFile: '' });

    const config = {
      default_portico: defaultPortico,
      empresa: empresa,
      organize_by_date: organizeByDate,
      ia_priority: true,
      economicMode: economicMode,
    };

    try {
      const retryResults = await api.processPhotos(
        failedFiles,
        config,
        (current, total, filename) => {
          setProcessingProgress({ current, total, currentFile: filename });
        },
        // Don't use cache for retries
        undefined,
        // Callback for batch completion - replace failed results in real-time
        (batchResults) => {
          setResults(prev => {
            const updated = [...prev];
            for (const newResult of batchResults) {
              const idx = updated.findIndex(r => r.filename === newResult.filename);
              if (idx >= 0) {
                updated[idx] = newResult;
              } else {
                updated.push(newResult);
              }
            }
            return updated;
          });
        }
      );

      // Cache successful results
      retryResults
        .filter(r => r.status === 'Sucesso' && r.hash)
        .forEach(r => imageCache.setCache(r.hash!, r));

      toast({
        title: "Reprocessamento concluído!",
        description: `${failedFiles.length} fotos reprocessadas.`,
      });
    } catch (error) {
      console.error('Retry error:', error);
      toast({
        title: "Erro no reprocessamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentFile: '' });
      setProcessingStartTime(undefined);
      // Set cooldown after reprocessing
      setReprocessCooldown(30);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });

  // Estado para popup de download
  const [downloadPopup, setDownloadPopup] = useState<{
    show: boolean;
    partNumber: number;
    totalParts: number;
    blob: Blob | null;
    filename: string;
    countdown: number;
  }>({ show: false, partNumber: 0, totalParts: 0, blob: null, filename: '', countdown: 10 });
  
  const downloadBlobRef = useRef<{ blob: Blob; filename: string } | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para baixar o blob atual
  const executeDownload = useCallback(() => {
    if (!downloadBlobRef.current) return;
    
    const { blob, filename } = downloadBlobRef.current;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 500);
    setTimeout(() => URL.revokeObjectURL(url), 300000);
    
    setDownloadPopup(prev => ({ ...prev, show: false }));
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Ref para resolver a Promise quando download é feito
  const downloadResolveRef = useRef<(() => void) | null>(null);

  // Mostra popup e inicia countdown
  const showDownloadPopup = useCallback((blob: Blob, filename: string, partNumber: number, totalParts: number): Promise<void> => {
    return new Promise((resolve) => {
      downloadBlobRef.current = { blob, filename };
      downloadResolveRef.current = resolve;
      
      let countdown = 10;
      setDownloadPopup({
        show: true,
        partNumber,
        totalParts,
        blob,
        filename,
        countdown,
      });

      countdownIntervalRef.current = setInterval(() => {
        countdown -= 1;
        setDownloadPopup(prev => ({ ...prev, countdown }));
        
        if (countdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          executeDownload();
          if (downloadResolveRef.current) {
            downloadResolveRef.current();
            downloadResolveRef.current = null;
          }
        }
      }, 1000);
    });
  }, [executeDownload]);

  const handleDownloadNow = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    executeDownload();
    if (downloadResolveRef.current) {
      downloadResolveRef.current();
      downloadResolveRef.current = null;
    }
  }, [executeDownload]);

  const handleExportZIP = async () => {
    const successResults = results.filter((r) => r.status === 'Sucesso' && r.dest);

    if (successResults.length === 0) {
      toast({
        title: "Nenhuma foto para exportar",
        description: "Não há fotos com classificação bem-sucedida.",
        variant: "destructive",
      });
      return;
    }

    const sanitizeZipPart = (part: string) =>
      part
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    setIsExporting(true);
    
    const CHUNK_SIZE = 50;
    const totalParts = Math.ceil(successResults.length / CHUNK_SIZE);
    const dateStr = new Date().toISOString().split('T')[0];

    try {
      for (let partIndex = 0; partIndex < totalParts; partIndex++) {
        const startIdx = partIndex * CHUNK_SIZE;
        const endIdx = Math.min(startIdx + CHUNK_SIZE, successResults.length);
        const chunkResults = successResults.slice(startIdx, endIdx);
        
        setZipProgress({ current: startIdx, total: successResults.length });
        
        const zip = new JSZip();
        let addedCount = 0;
        
        for (let i = 0; i < chunkResults.length; i++) {
          const result = chunkResults[i];
          const file = files.find((f) => f.name === result.filename);
          if (!file || !result.dest) continue;

          try {
            const arrayBuffer = await file.arrayBuffer();
            const destParts = result.dest.split('/').filter(Boolean).map(sanitizeZipPart);
            const safeFilename = sanitizeZipPart(result.filename);
            const basePath = destParts.join('/');
            
            // Adiciona a foto
            zip.file(`${basePath}/${safeFilename}`, arrayBuffer);
            
            // Cria arquivo TXT com análise da IA (mesmo nome da foto, extensão .txt)
            const txtFilename = safeFilename.replace(/\.[^.]+$/, '.txt');
            
            // Formata coordenadas GPS se disponíveis
            const gpsStr = (result.gps_lat && result.gps_lon) 
              ? `${result.gps_lat.toFixed(6)}, ${result.gps_lon.toFixed(6)}`
              : 'Não disponível';
            
            // Formata KM (pode ter km_inicio e km_fim)
            const kmStr = result.km_inicio 
              ? (result.km_fim ? `${result.km_inicio} - ${result.km_fim}` : result.km_inicio)
              : 'Não identificado';
            
            const analiseContent = [
              `ANÁLISE DA FOTO: ${result.filename}`,
              `${'='.repeat(50)}`,
              ``,
              `📍 LOCALIZAÇÃO`,
              `   Rodovia: ${result.rodovia || 'Não identificada'}`,
              `   KM: ${kmStr}`,
              `   Sentido: ${result.sentido || 'Não identificado'}`,
              `   Coordenadas GPS: ${gpsStr}`,
              ``,
              `🔧 CLASSIFICAÇÃO`,
              `   Serviço/Contrato: ${result.portico || 'Não identificado'}`,
              `   Disciplina: ${result.disciplina || 'Não identificada'}`,
              `   Frente de Serviço: ${result.service || 'Não identificada'}`,
              ``,
              `📅 DATA/HORA`,
              `   Data Detectada: ${result.data_detectada || 'Não identificada'}`,
              `   Data EXIF: ${result.exif_date || 'Não disponível'}`,
              ``,
              `🤖 ANÁLISE DA IA`,
              `   ${result.ocr_text || 'Sem observações disponíveis'}`,
              ``,
              `📊 METADADOS`,
              `   Status: ${result.status}`,
              `   Confiança: ${result.confidence ? Math.round(result.confidence * 100) + '%' : 'N/A'}`,
              `   Método: ${result.method || 'N/A'}`,
              `   Dispositivo: ${result.device || 'N/A'}`,
              `   Hash: ${result.hash || 'N/A'}`,
              ``,
              `${'='.repeat(50)}`,
              `Gerado por ObraPhoto em ${new Date().toLocaleString('pt-BR')}`,
            ].join('\n');
            
            zip.file(`${basePath}/${txtFilename}`, analiseContent);
            
            addedCount++;
            setZipProgress({ current: startIdx + i + 1, total: successResults.length });
          } catch (err) {
            console.warn(`Erro ao adicionar ${result.filename}:`, err);
          }
        }

        if (addedCount === 0) continue;

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        if (zipBlob.size < 100) continue;

        const filename = totalParts > 1 
          ? `obraphoto_${dateStr}_parte${partIndex + 1}de${totalParts}.zip`
          : `obraphoto_organizado_${dateStr}.zip`;

        // Mostra popup e aguarda (10s ou clique)
        await showDownloadPopup(zipBlob, filename, partIndex + 1, totalParts);
        
        // Pausa extra entre partes
        if (partIndex < totalParts - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Exportação concluída!",
        description: `${successResults.length} fotos em ${totalParts} arquivo(s).`,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setZipProgress({ current: 0, total: 0 });
    }
  };

  const handleViewPhoto = (result: ProcessingResult, imageUrl?: string) => {
    setPreviewModal({ isOpen: true, result, imageUrl });
  };

  const handleUpdateResult = (updated: ProcessingResult) => {
    setResults(prev => prev.map(r => 
      r.filename === updated.filename ? updated : r
    ));
    setPreviewModal({ isOpen: false, result: null });
    toast({
      title: "Classificação atualizada",
      description: `${updated.filename} foi reclassificado.`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* GNOME Sidebar */}
      <GnomeSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        resultsCount={results.length}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Trial Banner - Show when user needs to start trial */}
        {!isTrialActive && canStartTrial && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Modo Degustação Disponível</p>
                  <p className="text-sm text-muted-foreground">
                    {sessionsUsedToday}/{maxSessionsPerDay} sessões usadas hoje | {sessionsUsedThisWeek}/{maxSessionsPerWeek} esta semana
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  const started = await startTrial();
                  if (started) {
                    toast({ title: "Degustação iniciada!", description: "Você tem 30 minutos para usar o sistema." });
                  } else {
                    toast({ title: "Limite atingido", description: "Você já usou todas as sessões disponíveis.", variant: "destructive" });
                  }
                }}
                className="gnome-btn-primary"
              >
                <Clock className="w-4 h-4 mr-2" />
                Iniciar Degustação (30 min)
              </Button>
            </div>
          </div>
        )}

        {/* Trial Limit Reached Banner */}
        {!isTrialActive && !canStartTrial && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20">
            <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
              <XCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">
                Limite de degustação atingido ({maxSessionsPerDay}x/dia, {maxSessionsPerWeek}x/semana). Entre em contato para acesso completo.
              </p>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="p-6 border-b border-border bg-card">
            <ProcessingProgress
              current={processingProgress.current}
              total={processingProgress.total}
              currentFileName={processingProgress.currentFile}
              startTime={processingStartTime}
              isProcessing={isProcessing}
              isPaused={isPaused}
              currentBatch={queueStats.currentBatch}
              totalBatches={queueStats.totalBatches}
              queued={queueStats.queued}
              errorsCount={queueStats.errors.length}
              onAbort={abortQueue}
              onPause={pauseQueue}
              onResume={resumeQueue}
              onShowErrors={() => setShowErrorsReport(true)}
            />
          </div>
        )}

        {/* Stats Bar */}
        {results.length > 0 && !isProcessing && (
          <div className="p-6 border-b border-border bg-card/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
              <StatsCard
                icon={ImageIcon}
                label="Processadas"
                value={results.length}
                variant="primary"
              />
              <StatsCard
                icon={CheckCircle2}
                label="Sucesso"
                value={successCount}
                variant="success"
              />
              <StatsCard
                icon={XCircle}
                label="Erros"
                value={errorCount}
              />
              <StatsCard
                icon={TableIcon}
                label="Filtradas"
                value={filteredResults.length}
              />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fade-in">
              {/* Accumulated results banner */}
              {results.length > 0 && (
                <div className="gnome-card p-4 bg-primary/10 border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderArchive className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {results.length} fotos já processadas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Adicione mais fotos e continue processando. Cache: {imageCache.getCacheStats().total} itens ({imageCache.getCacheStats().size})
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        imageCache.clearCache();
                        toast({ title: "Cache limpo", description: "O cache de imagens foi removido." });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Database className="w-4 h-4 mr-1" />
                      Limpar cache
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setResults([]);
                        setProcessedFiles(new Set());
                        setFiles([]);
                        setTreeData([]);
                        await clearFiles(); // Clear from IndexedDB too
                        toast({ title: "Sessão limpa", description: "Todos os resultados e arquivos foram removidos." });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar tudo
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Upload de Fotos</h2>
                  <p className="text-muted-foreground">Adicione fotos de obra para análise automática com IA</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="gnome-card p-6">
                    <UploadZone files={files} onFilesChange={setFiles} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleProcess}
                      disabled={isProcessing || files.length === 0}
                      className="gnome-btn-primary flex-1 h-12 text-base"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {files.filter(f => !processedFiles.has(f.name)).length > 0 
                            ? `Analisar ${files.filter(f => !processedFiles.has(f.name)).length} Novas Fotos`
                            : files.length > 0 
                              ? 'Todas já processadas'
                              : 'Adicionar Fotos'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <ProcessingOptions
                    defaultPortico={defaultPortico}
                    onDefaultPorticoChange={setDefaultPortico}
                    empresa={empresa}
                    onEmpresaChange={setEmpresa}
                    organizeByDate={organizeByDate}
                    onOrganizeByDateChange={setOrganizeByDate}
                    iaPriority={iaPriority}
                    onIaPriorityChange={setIaPriority}
                    economicMode={economicMode}
                    onEconomicModeChange={setEconomicMode}
                    useLocalOCR={useLocalOCR}
                    onUseLocalOCRChange={setUseLocalOCR}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              {results.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">Resultados da Análise</h2>
                      <p className="text-muted-foreground">{results.length} fotos processadas</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowDetailedReport(true)}
                        disabled={isProcessing}
                        className="rounded-xl border-primary/50 text-primary hover:bg-primary/10"
                      >
                        <FileText className="w-4 h-4" />
                        Relatório Detalhado
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => exportToExcelXML(results, `obraphoto_${new Date().toISOString().split('T')[0]}.xls`)}
                        disabled={isProcessing}
                        className="rounded-xl"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </Button>
                      <Button
                        onClick={handleExportZIP}
                        disabled={isProcessing || isExporting}
                        className="gnome-btn-primary min-w-[140px]"
                      >
                        {isExporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {zipProgress.total > 0 
                              ? `${zipProgress.current}/${zipProgress.total}` 
                              : 'Gerando...'}
                          </>
                        ) : (
                          <>
                            <FolderArchive className="w-4 h-4" />
                            Baixar ZIP
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <ResultsFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    porticos={uniquePorticos}
                    disciplinas={uniqueDisciplinas}
                  />

                  {/* Statistics */}
                  <StatisticsCard results={results} />
                  
                  {/* Results Table */}
                  <EditableResultsTable 
                    results={filteredResults} 
                    isProcessing={isProcessing}
                    fileUrls={fileUrls}
                    onViewPhoto={handleViewPhoto}
                    onUpdateResult={handleUpdateResult}
                  />
                  
                  {/* Show reprocess button for errors OR incomplete results */}
                  {(() => {
                    const incompleteCount = results.filter(isIncompleteResult).length;
                    const totalNeedsReprocess = errorCount + incompleteCount;
                    
                    if (totalNeedsReprocess > 0) {
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={handleRetryFailed}
                            disabled={isProcessing || reprocessCooldown > 0}
                            className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <RefreshCw className={`w-4 h-4 ${reprocessCooldown > 0 ? '' : ''}`} />
                            {reprocessCooldown > 0 
                              ? `Aguarde ${reprocessCooldown}s`
                              : `Reprocessar ${totalNeedsReprocess} ${totalNeedsReprocess === 1 ? 'Foto' : 'Fotos'}${
                                  errorCount > 0 && incompleteCount > 0 
                                    ? ` (${errorCount} erros + ${incompleteCount} incompletas)`
                                    : errorCount > 0 
                                      ? ' com Erro' 
                                      : ' Incompletas'
                                }`}
                          </Button>
                          {reprocessCooldown > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Intervalo para evitar sobrecarga da IA
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              ) : (
                <div className="gnome-card p-16 text-center">
                  <TableIcon className="w-20 h-20 mx-auto mb-6 text-muted-foreground/30" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Nenhum resultado ainda
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Processe algumas fotos para ver os resultados aqui
                  </p>
                  <Button 
                    onClick={() => setActiveTab('upload')}
                    className="gnome-btn-primary"
                  >
                    <Upload className="w-4 h-4" />
                    Ir para Upload
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tree View Tab */}
          {activeTab === 'tree' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Estrutura de Pastas</h2>
                  <p className="text-muted-foreground">Visualize a organização das fotos</p>
                </div>
                <Button
                  onClick={handleExportZIP}
                  disabled={isExporting || results.length === 0}
                  className="gnome-btn-primary min-w-[140px]"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {zipProgress.total > 0 
                        ? `${zipProgress.current}/${zipProgress.total}` 
                        : 'Gerando...'}
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-4 h-4" />
                      Baixar ZIP
                    </>
                  )}
                </Button>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="gnome-card p-6">
                    {/* Editable root folder */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                      <Folder className="w-5 h-5 text-primary" />
                      <input
                        type="text"
                        value={empresa}
                        onChange={(e) => {
                          const newEmpresa = e.target.value.toUpperCase().replace(/\s+/g, '_');
                          setEmpresa(newEmpresa);
                          // Update all results with new empresa
                          setResults(prev => prev.map(r => ({
                            ...r,
                            empresa: newEmpresa,
                            dest: r.dest?.replace(/^[^/]+/, newEmpresa)
                          })));
                        }}
                        className="font-mono font-semibold text-foreground bg-transparent border-b border-dashed border-primary/50 focus:border-primary outline-none px-1"
                        placeholder="NOME_EMPRESA"
                      />
                      <span className="text-muted-foreground font-mono">/</span>
                      <span className="font-mono text-muted-foreground">FOTOS/</span>
                    </div>
                    
                    <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                      {treeData.length > 0 ? (
                        <TreeView data={treeData} />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FolderTree className="w-16 h-16 mx-auto mb-4 opacity-30" />
                          <p>Nenhuma estrutura para exibir</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <div className="gnome-card p-6">
                    <h4 className="font-semibold text-foreground mb-4">Estrutura Padrão</h4>
                    <div className="space-y-2 text-sm font-mono text-muted-foreground bg-secondary/50 p-4 rounded-xl">
                      <p className="text-primary font-semibold">FOTOS/</p>
                      <p className="pl-4">└─ SERVICO (SP270, etc)/</p>
                      <p className="pl-8">└─ ESTRUTURA (SEGURANÇA, etc)/</p>
                      <p className="pl-12">└─ ATIVIDADE (ALAMBRADO, etc)/</p>
                      <p className="pl-16">└─ TIPO (INSTALACAO, etc)/</p>
                      <p className="pl-20">└─ MES_ANO/</p>
                      <p className="pl-24">└─ DIA_MES/</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Atividades da mesma estrutura ficam agrupadas
                    </p>
                  </div>

                  <div className="gnome-card p-6">
                    <h4 className="font-semibold text-foreground mb-4">Legenda</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="confidence-high">90%+</span>
                        <span className="text-sm text-muted-foreground">Alta confiança</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="confidence-medium">50-89%</span>
                        <span className="text-sm text-muted-foreground">Média confiança</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="confidence-low">&lt;50%</span>
                        <span className="text-sm text-muted-foreground">Baixa confiança</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            Desenvolvido por <span className="font-medium text-foreground">Uriel da Fonseca Fortunato</span>
          </p>
        </footer>
      </main>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, result: null })}
        result={previewModal.result}
        imageUrl={previewModal.imageUrl}
        onUpdateResult={handleUpdateResult}
      />

      {/* Detailed Report Modal */}
      {showDetailedReport && (
        <DetailedReport
          results={results}
          fileUrls={fileUrls}
          empresa={empresa}
          onClose={() => setShowDetailedReport(false)}
        />
      )}

      {/* Cooldown Overlay */}
      <CooldownOverlay
        isActive={isCooldown}
        durationSeconds={queueStats.cooldownSeconds}
        onComplete={() => {}} // Handled by the hook
        onSkip={skipCooldown}
        processedCount={queueStats.processed}
        nextBatchCount={queueStats.nextGroupSize}
        totalRemaining={queueStats.queued}
        estimatedTotalTime={queueStats.estimatedTotalTime}
      />

      {/* Errors Report Modal */}
      <ErrorsReport
        isOpen={showErrorsReport}
        onClose={() => setShowErrorsReport(false)}
        errors={queueStats.errors}
        onRetryAll={handleRetryFailed}
      />

      {/* Download Popup com Countdown */}
      <AlertDialog open={downloadPopup.show}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-primary" />
              Download Pronto - Parte {downloadPopup.partNumber}/{downloadPopup.totalParts}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  O arquivo <strong>{downloadPopup.filename}</strong> está pronto para download.
                </p>
                <div className="flex items-center justify-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-secondary"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={220}
                        strokeDashoffset={220 - (220 * downloadPopup.countdown) / 10}
                        className="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground">
                      {downloadPopup.countdown}
                    </span>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Download automático em {downloadPopup.countdown} segundos...
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleDownloadNow}
              className="bg-primary w-full"
            >
              <FolderArchive className="w-4 h-4 mr-2" />
              Baixar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Large Batches */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Processar {pendingProcessFiles.length} Fotos
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  As fotos serão processadas em <strong>grupos de {PROCESSING_CONFIG.groupSize}</strong> com intervalo de <strong>{PROCESSING_CONFIG.cooldownSeconds} segundos</strong> entre eles.
                </p>
                <div className="bg-secondary/50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      <strong>{Math.ceil(pendingProcessFiles.length / PROCESSING_CONFIG.groupSize)} grupos</strong> 
                      {' '}({PROCESSING_CONFIG.groupSize} fotos cada)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {Math.ceil(pendingProcessFiles.length / PROCESSING_CONFIG.batchSize)} lotes de {PROCESSING_CONFIG.batchSize} fotos
                    </span>
                  </div>
                  <p className="text-sm">
                    <strong>Custo estimado:</strong> {estimateCost(pendingProcessFiles.length, economicMode, useLocalOCR)}
                    {economicMode && <span className="ml-2 text-green-500">(Econômico)</span>}
                    {useLocalOCR && <span className="ml-2 text-blue-500">(OCR Local)</span>}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  A cada {PROCESSING_CONFIG.groupSize} fotos, haverá uma pausa de {PROCESSING_CONFIG.cooldownSeconds} segundos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => executeProcessing(pendingProcessFiles)}
              className="bg-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Iniciar Processamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
