import { supabase } from '@/integrations/supabase/client';

export interface ProcessingConfig {
  default_portico?: string;
  empresa?: string;
  organize_by_date: boolean;
  ia_priority: boolean;
}

export interface ProcessingResult {
  filename: string;
  service?: string;
  portico?: string;
  disciplina?: string;
  empresa?: string;
  dest?: string;
  status: string;
  tecnico?: string;
  method?: 'heuristica' | 'ia_fallback' | 'ia_forcada';
  confidence?: number;
  data_detectada?: string;
  ocr_text?: string;
  hash?: string;
}

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  path?: string;
}

// Month names in PT-BR
export const MONTH_NAMES: Record<number, string> = {
  1: '01_JANEIRO',
  2: '02_FEVEREIRO',
  3: '03_MARCO',
  4: '04_ABRIL',
  5: '05_MAIO',
  6: '06_JUNHO',
  7: '07_JULHO',
  8: '08_AGOSTO',
  9: '09_SETEMBRO',
  10: '10_OUTUBRO',
  11: '11_NOVEMBRO',
  12: '12_DEZEMBRO',
};

// Convert file to base64
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

// Hash file for caching
export const hashFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

// Build destination path based on classification
const buildDestPath = (
  empresa: string,
  portico: string,
  disciplina: string,
  servico: string,
  dataStr: string | null,
  organizeByDate: boolean
): string => {
  let path = `${empresa}/FOTOS/${portico}/${disciplina}/${servico}`;
  
  if (organizeByDate && dataStr) {
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const day = match[1];
      const month = parseInt(match[2], 10);
      const year = match[3];
      const monthName = MONTH_NAMES[month] || `${month.toString().padStart(2, '0')}_MES`;
      const monthYear = `${monthName}_${year}`;
      const dayMonth = `${day}_${month.toString().padStart(2, '0')}`;
      path += `/${monthYear}/${dayMonth}`;
    }
  }
  
  return path;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getHttpStatusFromInvokeError = (err: unknown): number | undefined => {
  const anyErr = err as Record<string, unknown>;
  return (
    (anyErr?.status as number) ??
    ((anyErr?.context as Record<string, unknown>)?.status as number) ??
    ((anyErr?.context as Record<string, unknown>)?.statusCode as number) ??
    ((anyErr?.cause as Record<string, unknown>)?.status as number) ??
    ((anyErr?.cause as Record<string, unknown>)?.statusCode as number)
  );
};

const getMessageFromInvokeError = (err: unknown): string => {
  const anyErr = err as Record<string, unknown>;
  return (
    (anyErr?.message as string) ||
    (anyErr?.error_description as string) ||
    (anyErr?.error as string) ||
    (typeof anyErr === 'string' ? anyErr : '') ||
    'Falha na análise'
  );
};

const isRateLimitError = (err: unknown) => {
  const status = getHttpStatusFromInvokeError(err);
  const msg = getMessageFromInvokeError(err).toLowerCase();
  return status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('rate limited');
};

const isCreditLimitError = (err: unknown) => {
  const status = getHttpStatusFromInvokeError(err);
  const msg = getMessageFromInvokeError(err).toLowerCase();
  return status === 402 || msg.includes('402') || msg.includes('crédito') || msg.includes('payment');
};

export const api = {
  // Analyze single image with AI
  async analyzeImage(file: File, defaultPortico?: string, empresa?: string): Promise<ProcessingResult> {
    const empresaNome = empresa || 'EMPRESA';
    const hash = await hashFile(file);
    
    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageBase64,
          filename: file.name,
          defaultPortico,
        },
      });

      if (error) {
        if (isCreditLimitError(error)) {
          throw new Error('Limite de créditos atingido (402).');
        }
        if (isRateLimitError(error)) {
          throw new Error('Limite de requisições atingido (429). Tente novamente em alguns instantes.');
        }
        throw new Error(getMessageFromInvokeError(error));
      }

      return {
        filename: file.name,
        hash,
        status: 'Sucesso',
        portico: data.portico,
        disciplina: data.disciplina,
        service: data.servico,
        empresa: empresaNome,
        data_detectada: data.data,
        tecnico: data.analise_tecnica,
        confidence: data.confidence,
        method: 'ia_forcada',
        ocr_text: data.ocr_text,
        dest: buildDestPath(empresaNome, data.portico, data.disciplina, data.servico, data.data, true),
      };
    } catch (error) {
      const finalStatus = getHttpStatusFromInvokeError(error);
      const finalMsg = getMessageFromInvokeError(error);

      return {
        filename: file.name,
        hash,
        status: `Erro${finalStatus ? ` (${finalStatus})` : ''}: ${finalMsg}`,
        method: 'ia_forcada',
        confidence: 0,
      };
    }
  },

  // Analyze batch of images
  async analyzeBatch(
    files: { file: File; hash: string; base64: string }[],
    defaultPortico?: string,
    empresa?: string
  ): Promise<{ results: ProcessingResult[]; errors: { hash: string; error: string }[] }> {
    const empresaNome = empresa || 'EMPRESA';

    try {
      const images = files.map(f => ({
        imageBase64: f.base64,
        filename: f.file.name,
        hash: f.hash,
      }));

      const { data, error } = await supabase.functions.invoke('analyze-batch', {
        body: {
          images,
          defaultPortico,
        },
      });

      if (error) {
        if (isCreditLimitError(error)) {
          throw new Error('Limite de créditos atingido (402).');
        }
        if (isRateLimitError(error)) {
          throw new Error('Limite de requisições atingido (429).');
        }
        throw new Error(getMessageFromInvokeError(error));
      }

      const results: ProcessingResult[] = (data.results || []).map((r: { hash: string; result: Record<string, unknown> }) => {
        const originalFile = files.find(f => f.hash === r.hash);
        return {
          filename: originalFile?.file.name || 'unknown',
          hash: r.hash,
          status: 'Sucesso',
          portico: r.result.portico as string,
          disciplina: r.result.disciplina as string,
          service: r.result.servico as string,
          empresa: empresaNome,
          data_detectada: r.result.data as string | undefined,
          tecnico: r.result.analise_tecnica as string,
          confidence: r.result.confidence as number,
          method: 'ia_forcada' as const,
          ocr_text: r.result.ocr_text as string,
          dest: buildDestPath(
            empresaNome,
            r.result.portico as string,
            r.result.disciplina as string,
            r.result.servico as string,
            r.result.data as string | null,
            true
          ),
        };
      });

      const errors: { hash: string; error: string }[] = data.errors || [];

      return { results, errors };
    } catch (error) {
      console.error('Batch analysis error:', error);
      throw error;
    }
  },

  // Process multiple photos with caching and batching
  // Now includes credit protection: stops immediately on 402 errors
  async processPhotos(
    files: File[], 
    config: ProcessingConfig,
    onProgress?: (current: number, total: number, filename: string) => void,
    cache?: {
      getCached: (hash: string) => ProcessingResult | null;
      setCache: (hash: string, result: ProcessingResult) => void;
      setCacheBulk: (entries: { hash: string; result: ProcessingResult }[]) => void;
    },
    onBatchComplete?: (batchResults: ProcessingResult[]) => void,
    options?: {
      maxFiles?: number; // Limit max files per batch
      stopOnCreditError?: boolean; // Stop immediately on 402
    }
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const empresaNome = config.empresa || 'EMPRESA';
    const maxFiles = options?.maxFiles || 50; // Default max 50 files
    const stopOnCreditError = options?.stopOnCreditError ?? true;
    
    // Limit files to prevent excessive credit usage
    const limitedFiles = files.slice(0, maxFiles);
    if (files.length > maxFiles) {
      console.warn(`Limiting processing to ${maxFiles} files (${files.length} requested)`);
    }
    
    // Step 1: Hash all files and check cache
    const filesToProcess: { file: File; hash: string; base64?: string }[] = [];
    const cachedResults: ProcessingResult[] = [];

    for (let i = 0; i < limitedFiles.length; i++) {
      const file = limitedFiles[i];
      const hash = await hashFile(file);
      
      if (cache) {
        const cached = cache.getCached(hash);
        if (cached) {
          // Update filename in case it changed
          cachedResults.push({ ...cached, filename: file.name });
          onProgress?.(i + 1, limitedFiles.length, `${file.name} (cache)`);
          continue;
        }
      }
      
      filesToProcess.push({ file, hash });
    }

    console.log(`Cache hits: ${cachedResults.length}, to process: ${filesToProcess.length}`);
    results.push(...cachedResults);
    
    // Notify about cached results immediately
    if (cachedResults.length > 0 && onBatchComplete) {
      onBatchComplete(cachedResults);
    }

    if (filesToProcess.length === 0) {
      return results;
    }

    // Step 2: If IA is disabled, use simple classification
    if (!config.ia_priority) {
      for (const { file, hash } of filesToProcess) {
        const result: ProcessingResult = {
          filename: file.name,
          hash,
          status: 'Sucesso',
          portico: config.default_portico || 'NAO_IDENTIFICADO',
          disciplina: 'GERAL',
          service: 'REGISTRO',
          empresa: empresaNome,
          method: 'heuristica',
          confidence: 0.5,
          dest: `${empresaNome}/FOTOS/${config.default_portico || 'NAO_IDENTIFICADO'}/GERAL/REGISTRO`,
        };
        results.push(result);
        cache?.setCache(hash, result);
      }
      return results;
    }

    // Step 3: Convert files to base64 for batch processing
    const filesWithBase64: { file: File; hash: string; base64: string }[] = [];
    for (const item of filesToProcess) {
      const base64 = await fileToBase64(item.file);
      filesWithBase64.push({ ...item, base64 });
    }

    // Step 4: Process in batches of up to 5
    const BATCH_SIZE = 5;
    let processedCount = cachedResults.length;
    let creditErrorOccurred = false;

    for (let i = 0; i < filesWithBase64.length; i += BATCH_SIZE) {
      // Stop if credit error occurred
      if (creditErrorOccurred && stopOnCreditError) {
        console.log('Stopping processing due to credit limit error');
        // Mark remaining files as skipped
        for (let j = i; j < filesWithBase64.length; j++) {
          const item = filesWithBase64[j];
          results.push({
            filename: item.file.name,
            hash: item.hash,
            status: 'Ignorado: Processamento interrompido (limite de créditos)',
            method: 'ia_forcada',
            confidence: 0,
          });
        }
        break;
      }

      const batch = filesWithBase64.slice(i, i + BATCH_SIZE);
      
      onProgress?.(processedCount + 1, limitedFiles.length, `Lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

      try {
        const { results: batchResults, errors } = await this.analyzeBatch(
          batch,
          config.default_portico,
          empresaNome
        );

        // Apply organize_by_date setting
        const processedBatchResults: ProcessingResult[] = [];
        for (const result of batchResults) {
          if (!config.organize_by_date && result.dest) {
            const parts = result.dest.split('/');
            result.dest = parts.slice(0, 5).join('/');
          }
          results.push(result);
          processedBatchResults.push(result);
          if (cache && result.hash) {
            cache.setCache(result.hash, result);
          }
        }
        
        // Notify about new results immediately
        if (processedBatchResults.length > 0 && onBatchComplete) {
          onBatchComplete(processedBatchResults);
        }

        // Handle errors
        const errorResults: ProcessingResult[] = [];
        for (const err of errors) {
          const originalFile = batch.find(f => f.hash === err.hash);
          
          // Check if it's a credit error
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
          results.push(errorResult);
          errorResults.push(errorResult);
        }
        
        // Notify about error results
        if (errorResults.length > 0 && onBatchComplete) {
          onBatchComplete(errorResults);
        }

        processedCount += batch.length;
        onProgress?.(processedCount, limitedFiles.length, batch[batch.length - 1].file.name);

        // Delay between batches to avoid rate limits (increased for safety)
        if (i + BATCH_SIZE < filesWithBase64.length) {
          await delay(3000);
        }
      } catch (error) {
        console.error('Batch error:', error);
        
        // Check if it's a credit limit error
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('crédito')) {
          creditErrorOccurred = true;
          
          // Mark current batch as failed
          for (const item of batch) {
            results.push({
              filename: item.file.name,
              hash: item.hash,
              status: 'Erro: Limite de créditos atingido (402)',
              method: 'ia_forcada',
              confidence: 0,
            });
          }
          
          if (onBatchComplete) {
            onBatchComplete(batch.map(item => ({
              filename: item.file.name,
              hash: item.hash,
              status: 'Erro: Limite de créditos atingido (402)',
              method: 'ia_forcada',
              confidence: 0,
            })));
          }
          
          // Throw to stop processing
          throw new Error('Limite de créditos atingido. Processamento interrompido para proteger seus créditos.');
        }
        
        // Fallback: process individually for non-credit errors
        for (const item of batch) {
          if (creditErrorOccurred && stopOnCreditError) break;
          
          try {
            const result = await this.analyzeImage(item.file, config.default_portico, empresaNome);
            
            if (!config.organize_by_date && result.dest) {
              const parts = result.dest.split('/');
              result.dest = parts.slice(0, 5).join('/');
            }
            
            results.push(result);
            if (cache && result.hash) {
              cache.setCache(result.hash, result);
            }
            
            // Notify about each individual result
            if (onBatchComplete) {
              onBatchComplete([result]);
            }
            
            processedCount++;
            onProgress?.(processedCount, limitedFiles.length, item.file.name);
            await delay(4000); // Longer delay for individual processing
          } catch (fileError) {
            const fileErrorMsg = fileError instanceof Error ? fileError.message : String(fileError);
            
            // Check for credit error
            if (fileErrorMsg.includes('402') || fileErrorMsg.toLowerCase().includes('crédito')) {
              creditErrorOccurred = true;
            }
            
            const errorResult: ProcessingResult = {
              filename: item.file.name,
              hash: item.hash,
              status: `Erro: ${fileErrorMsg}`,
              method: 'ia_forcada',
              confidence: 0,
            };
            results.push(errorResult);
            
            // Notify about error result too
            if (onBatchComplete) {
              onBatchComplete([errorResult]);
            }
            
            processedCount++;
          }
        }
      }
    }
    
    return results;
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    return true;
  },
};

// Mock tree data for visualization (since we don't have actual file storage)
export const mockTreeData: TreeNode[] = [
  {
    name: 'CORTINA_ATIRANTADA_KM_167',
    type: 'folder',
    children: [
      {
        name: 'FUNDACAO',
        type: 'folder',
        children: [
          {
            name: 'CONCRETAGEM_BLOCO_B1',
            type: 'folder',
            children: [
              {
                name: '10_OUTUBRO',
                type: 'folder',
                children: [
                  { name: '12_10', type: 'folder', children: [] },
                  { name: '13_10', type: 'folder', children: [] },
                  { name: '15_10', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'DRENAGEM',
        type: 'folder',
        children: [
          {
            name: 'BUEIRO_TUBULAR',
            type: 'folder',
            children: [
              {
                name: '09_SETEMBRO',
                type: 'folder',
                children: [
                  { name: '28_09', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// Build tree from results
export const buildTreeFromResults = (results: ProcessingResult[]): TreeNode[] => {
  const tree: TreeNode[] = [];
  const successResults = results.filter(r => r.status === 'Sucesso' && r.dest);
  
  for (const result of successResults) {
    if (!result.dest) continue;
    
    const parts = result.dest.split('/').filter(p => p && p !== 'organized_photos');
    let currentLevel = tree;
    
    for (const part of parts) {
      let existing = currentLevel.find(n => n.name === part);
      if (!existing) {
        existing = { name: part, type: 'folder', children: [] };
        currentLevel.push(existing);
      }
      currentLevel = existing.children || [];
    }
  }
  
  return tree;
};
