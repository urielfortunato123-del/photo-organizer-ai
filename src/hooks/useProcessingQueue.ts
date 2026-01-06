import { useState, useCallback, useRef } from 'react';
import { ProcessingResult, ProcessingConfig, PreProcessedOCR, api, hashFile } from '@/services/api';
import { useImageCache } from '@/hooks/useImageCache';

export interface QueueStats {
  total: number;
  processed: number;
  queued: number;
  currentBatch: number;
  totalBatches: number;
  isProcessing: boolean;
  currentFile: string;
  startTime?: number;
}

export interface UseProcessingQueueOptions {
  batchSize?: number; // Fotos por lote enviado para IA (padrão: 5)
  maxConcurrentBatches?: number; // Lotes por vez (padrão: 1)
  delayBetweenBatches?: number; // Delay entre lotes em ms (padrão: 2000)
}

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_DELAY = 2000;

export const useProcessingQueue = (options: UseProcessingQueueOptions = {}) => {
  const { 
    batchSize = DEFAULT_BATCH_SIZE,
    delayBetweenBatches = DEFAULT_DELAY 
  } = options;

  const imageCache = useImageCache();
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    processed: 0,
    queued: 0,
    currentBatch: 0,
    totalBatches: 0,
    isProcessing: false,
    currentFile: '',
  });
  
  const abortRef = useRef(false);
  const processingRef = useRef(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processQueue = useCallback(async (
    files: File[],
    config: ProcessingConfig,
    ocrExtractor?: (file: File) => Promise<PreProcessedOCR | null>,
    onBatchComplete?: (batchResults: ProcessingResult[]) => void,
    onComplete?: (allResults: ProcessingResult[]) => void
  ) => {
    if (processingRef.current) {
      console.warn('Processamento já em andamento');
      return;
    }

    processingRef.current = true;
    abortRef.current = false;

    const totalFiles = files.length;
    const totalBatches = Math.ceil(totalFiles / batchSize);
    const allResults: ProcessingResult[] = [];
    const processedFiles = new Set<string>();
    
    setQueueStats({
      total: totalFiles,
      processed: 0,
      queued: totalFiles,
      currentBatch: 0,
      totalBatches,
      isProcessing: true,
      currentFile: 'Preparando...',
      startTime: Date.now(),
    });

    // Step 1: Hash all files and check cache
    const filesToProcess: { file: File; hash: string }[] = [];
    const cachedResults: ProcessingResult[] = [];

    setQueueStats(prev => ({ ...prev, currentFile: 'Verificando cache...' }));

    for (const file of files) {
      if (abortRef.current) break;
      
      const hash = await hashFile(file);
      const cached = imageCache.getCached(hash);
      
      if (cached) {
        cachedResults.push({ ...cached, filename: file.name });
        processedFiles.add(file.name);
      } else {
        filesToProcess.push({ file, hash });
      }
    }

    if (cachedResults.length > 0) {
      allResults.push(...cachedResults);
      setResults(prev => [...prev, ...cachedResults]);
      onBatchComplete?.(cachedResults);
      
      setQueueStats(prev => ({
        ...prev,
        processed: cachedResults.length,
        queued: filesToProcess.length,
        currentFile: `${cachedResults.length} do cache`,
      }));
    }

    console.log(`[Queue] Cache: ${cachedResults.length}, Para processar: ${filesToProcess.length}`);

    if (filesToProcess.length === 0) {
      setQueueStats(prev => ({ ...prev, isProcessing: false }));
      processingRef.current = false;
      onComplete?.(allResults);
      return allResults;
    }

    // Step 2: Process in batches
    const updatedTotalBatches = Math.ceil(filesToProcess.length / batchSize);
    let processedCount = cachedResults.length;
    let creditErrorOccurred = false;

    for (let batchIndex = 0; batchIndex < updatedTotalBatches; batchIndex++) {
      if (abortRef.current || creditErrorOccurred) break;

      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, filesToProcess.length);
      const batch = filesToProcess.slice(start, end);

      setQueueStats(prev => ({
        ...prev,
        currentBatch: batchIndex + 1,
        totalBatches: updatedTotalBatches,
        queued: filesToProcess.length - start,
        currentFile: `Lote ${batchIndex + 1}/${updatedTotalBatches} - Preparando OCR...`,
      }));

      // Prepare batch: base64 + OCR
      const batchWithData: { file: File; hash: string; base64: string; ocrData?: PreProcessedOCR }[] = [];
      
      for (const item of batch) {
        if (abortRef.current) break;
        
        setQueueStats(prev => ({
          ...prev,
          currentFile: `OCR: ${item.file.name}`,
        }));

        const base64 = await fileToBase64(item.file);
        
        let ocrData: PreProcessedOCR | undefined;
        if (config.useLocalOCR && ocrExtractor) {
          try {
            const extracted = await ocrExtractor(item.file);
            if (extracted) ocrData = extracted;
          } catch (e) {
            console.warn(`OCR falhou para ${item.file.name}:`, e);
          }
        }
        
        batchWithData.push({ ...item, base64, ocrData });
      }

      // Send to IA
      setQueueStats(prev => ({
        ...prev,
        currentFile: `Analisando lote ${batchIndex + 1}...`,
      }));

      try {
        const { results: batchResults, errors } = await api.analyzeBatch(
          batchWithData,
          config.default_portico,
          config.empresa,
          config.economicMode
        );

        // Process results
        for (const result of batchResults) {
          if (!config.organize_by_date && result.dest) {
            const parts = result.dest.split('/');
            result.dest = parts.slice(0, 5).join('/');
          }
          allResults.push(result);
          if (result.hash) {
            imageCache.setCache(result.hash, result);
          }
        }

        setResults(prev => [...prev, ...batchResults]);
        onBatchComplete?.(batchResults);

        // Handle errors
        const errorResults: ProcessingResult[] = [];
        for (const err of errors) {
          const originalFile = batchWithData.find(f => f.hash === err.hash);
          
          if (err.error.includes('402') || err.error.includes('crédito')) {
            creditErrorOccurred = true;
          }
          
          const errorResult: ProcessingResult = {
            filename: originalFile?.file.name || 'unknown',
            hash: err.hash,
            status: `Erro: ${err.error}`,
            method: 'ia_forcada',
            confidence: 0,
          };
          allResults.push(errorResult);
          errorResults.push(errorResult);
        }

        if (errorResults.length > 0) {
          setResults(prev => [...prev, ...errorResults]);
          onBatchComplete?.(errorResults);
        }

        processedCount += batch.length;
        
        setQueueStats(prev => ({
          ...prev,
          processed: processedCount,
          queued: filesToProcess.length - end,
        }));

        // Delay between batches (unless last)
        if (batchIndex + 1 < updatedTotalBatches && !abortRef.current && !creditErrorOccurred) {
          setQueueStats(prev => ({
            ...prev,
            currentFile: `Aguardando próximo lote...`,
          }));
          await delay(delayBetweenBatches);
        }

      } catch (error) {
        console.error('Batch error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('crédito')) {
          creditErrorOccurred = true;
          
          // Mark remaining as skipped
          for (let i = start; i < filesToProcess.length; i++) {
            const item = filesToProcess[i];
            const skipResult: ProcessingResult = {
              filename: item.file.name,
              hash: item.hash,
              status: 'Ignorado: Limite de créditos',
              method: 'ia_forcada',
              confidence: 0,
            };
            allResults.push(skipResult);
          }
          
          setResults(prev => [...prev, ...allResults.filter(r => r.status.includes('Ignorado'))]);
          break;
        }
        
        // For other errors, mark batch as failed and continue
        for (const item of batch) {
          const errorResult: ProcessingResult = {
            filename: item.file.name,
            hash: item.hash,
            status: `Erro: ${errorMsg}`,
            method: 'ia_forcada',
            confidence: 0,
          };
          allResults.push(errorResult);
        }
        
        setResults(prev => [...prev, ...batch.map(item => ({
          filename: item.file.name,
          hash: item.hash,
          status: `Erro: ${errorMsg}`,
          method: 'ia_forcada' as const,
          confidence: 0,
        }))]);

        processedCount += batch.length;
        
        // Continue with next batch after a longer delay
        await delay(delayBetweenBatches * 2);
      }
    }

    // Finished
    setQueueStats(prev => ({
      ...prev,
      isProcessing: false,
      currentFile: creditErrorOccurred ? 'Interrompido (créditos)' : 'Concluído!',
      processed: allResults.length,
      queued: 0,
    }));

    processingRef.current = false;
    onComplete?.(allResults);
    
    return allResults;
  }, [batchSize, delayBetweenBatches, imageCache]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setQueueStats({
      total: 0,
      processed: 0,
      queued: 0,
      currentBatch: 0,
      totalBatches: 0,
      isProcessing: false,
      currentFile: '',
    });
  }, []);

  return {
    processQueue,
    abort,
    reset,
    results,
    setResults,
    queueStats,
    isProcessing: queueStats.isProcessing,
  };
};
