import { supabase } from '@/integrations/supabase/client';
import { extractStructuredData } from '@/hooks/useOCR';

export interface ProcessingConfig {
  default_portico?: string;
  empresa?: string;
  organize_by_date: boolean;
  ia_priority: boolean;
  economicMode?: boolean;
  useLocalOCR?: boolean; // Nova opção para usar OCR local
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
  method?: 'heuristica' | 'ia_fallback' | 'ia_forcada' | 'ocr_ia' | 'banco_conhecimento';
  confidence?: number;
  data_detectada?: string;
  ocr_text?: string;
  hash?: string;
  // Campos para OCR avançado
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  tipo_documento?: string;
  // EXIF data
  exif_date?: string;
  gps_lat?: number;
  gps_lon?: number;
  device?: string;
  // Banco de conhecimento
  obra_id?: string;
  // Alertas
  alertas?: {
    sem_placa?: boolean;
    texto_ilegivel?: boolean;
    evidencia_fraca?: boolean;
    km_inconsistente?: boolean;
  };
}

// Interface para dados OCR pré-processados
export interface PreProcessedOCR {
  rawText?: string;
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  data?: string;
  hora?: string;
  hasPlaca?: boolean;
  confidence?: number;
  contratada?: string; // Usado para armazenar a frente/pórtico identificado pelo OCR
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
// Format: FOTOS/SERVICO(ex: SP270)/ESTRUTURA(ex: SEGURANCA)/ATIVIDADE_DESENVOLVIDA(ex: ALAMBRADO)/TIPO_ATIVIDADE(disciplina)/MES/DIA
// Agrupa por ESTRUTURA (categoria principal do serviço) - tudo de segurança fica junto
const buildDestPath = (
  empresa: string,
  portico: string, // = Serviço/Contrato (ex: SP270)
  disciplina: string, // = Tipo de atividade (ex: INSTALACAO, MANUTENCAO)
  servico: string, // = Atividade desenvolvida (ex: ALAMBRADO E FECHADURA PORTA)
  dataStr: string | null,
  organizeByDate: boolean
): string => {
  // Extrai a categoria/estrutura principal do serviço (primeira palavra)
  // Ex: "SEGURANCA - ALAMBRADO E FECHADURA" -> "SEGURANCA"
  // Ex: "TERRAPLENAGEM - CORTE" -> "TERRAPLENAGEM"
  const estrutura = extractEstrutura(servico);
  
  // Atividade desenvolvida é o serviço completo ou a parte após o "-"
  const atividadeDesenvolvida = extractAtividade(servico);
  
  // Estrutura: FOTOS / SERVICO(portico) / ESTRUTURA / ATIVIDADE_DESENVOLVIDA / TIPO_ATIVIDADE(disciplina)
  let path = `FOTOS/${portico || 'NAO_IDENTIFICADO'}/${estrutura}/${atividadeDesenvolvida}/${disciplina || 'GERAL'}`;
  
  if (organizeByDate && dataStr) {
    // Try DD/MM/YYYY format first
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const day = match[1];
      const month = parseInt(match[2], 10);
      // Format: MES_NOME (e.g., 01_JANEIRO)
      const monthName = MONTH_NAMES[month] || `${month.toString().padStart(2, '0')}_MES`;
      // Format: DIA_MES (e.g., 12_10)
      const dayMonth = `${day}_${month.toString().padStart(2, '0')}`;
      path += `/${monthName}/${dayMonth}`;
    }
  }
  
  return path;
};

// Extrai a estrutura/categoria principal do serviço
// Ex: "SEGURANCA - ALAMBRADO" -> "SEGURANCA"
// Ex: "TERRAPLENAGEM CORTE" -> "TERRAPLENAGEM"
const extractEstrutura = (servico: string): string => {
  if (!servico) return 'GERAL';
  
  // Se tem "-", pega a primeira parte
  if (servico.includes('-')) {
    return servico.split('-')[0].trim().toUpperCase().replace(/\s+/g, '_');
  }
  
  // Senão, pega a primeira palavra significativa
  const palavras = servico.trim().toUpperCase().split(/\s+/);
  return palavras[0] || 'GERAL';
};

// Extrai a atividade desenvolvida (parte específica do serviço)
// Ex: "SEGURANCA - ALAMBRADO E FECHADURA" -> "ALAMBRADO_E_FECHADURA"
// Ex: "TERRAPLENAGEM" -> "TERRAPLENAGEM"
const extractAtividade = (servico: string): string => {
  if (!servico) return 'REGISTRO';
  
  // Se tem "-", pega a parte depois
  if (servico.includes('-')) {
    const partes = servico.split('-');
    if (partes.length > 1 && partes[1].trim()) {
      return partes[1].trim().toUpperCase().replace(/\s+/g, '_');
    }
  }
  
  // Senão, usa o serviço completo formatado
  return servico.trim().toUpperCase().replace(/\s+/g, '_');
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
  async analyzeImage(file: File, defaultPortico?: string, empresa?: string, economicMode?: boolean): Promise<ProcessingResult> {
    const empresaNome = empresa || 'EMPRESA';
    const hash = await hashFile(file);
    
    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageBase64,
          filename: file.name,
          defaultPortico,
          economicMode,
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
        method: data.method || 'ia_forcada',
        ocr_text: data.ocr_text,
        obra_id: data.obra_id || undefined,
        // Novos campos OCR avançado
        rodovia: data.rodovia || undefined,
        km_inicio: data.km_inicio || undefined,
        km_fim: data.km_fim || undefined,
        sentido: data.sentido || undefined,
        tipo_documento: data.tipo_documento || 'FOTO',
        alertas: data.alertas,
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

  // Analyze batch of images with optional pre-processed OCR
  async analyzeBatch(
    files: { file: File; hash: string; base64: string; ocrData?: PreProcessedOCR }[],
    defaultPortico?: string,
    empresa?: string,
    economicMode?: boolean
  ): Promise<{ results: ProcessingResult[]; errors: { hash: string; error: string }[] }> {
    const empresaNome = empresa || 'EMPRESA';

    try {
      const images = files.map(f => ({
        imageBase64: f.base64,
        filename: f.file.name,
        hash: f.hash,
        ocrData: f.ocrData, // Envia dados OCR pré-processados
      }));

      const { data, error } = await supabase.functions.invoke('analyze-batch', {
        body: {
          images,
          defaultPortico,
          economicMode,
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
          method: (r.result.method as ProcessingResult['method']) || 'ia_forcada',
          ocr_text: r.result.ocr_text as string,
          obra_id: r.result.obra_id as string | undefined,
          rodovia: r.result.rodovia as string | undefined,
          km_inicio: r.result.km_inicio as string | undefined,
          km_fim: r.result.km_fim as string | undefined,
          sentido: r.result.sentido as string | undefined,
          alertas: r.result.alertas as ProcessingResult['alertas'],
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

  // Process multiple photos with caching, batching, and optional local OCR
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
      maxFiles?: number;
      stopOnCreditError?: boolean;
    },
    ocrExtractor?: (file: File) => Promise<PreProcessedOCR | null>
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const empresaNome = config.empresa || 'EMPRESA';
    const maxFiles = options?.maxFiles || 50;
    const stopOnCreditError = options?.stopOnCreditError ?? true;
    const useLocalOCR = config.useLocalOCR ?? true; // Default: usar OCR local
    
    // Limit files
    const limitedFiles = files.slice(0, maxFiles);
    if (files.length > maxFiles) {
      console.warn(`Limiting processing to ${maxFiles} files (${files.length} requested)`);
    }
    
    // Step 1: Hash all files and check cache
    const filesToProcess: { file: File; hash: string }[] = [];
    const cachedResults: ProcessingResult[] = [];

    for (let i = 0; i < limitedFiles.length; i++) {
      const file = limitedFiles[i];
      const hash = await hashFile(file);
      
      if (cache) {
        const cached = cache.getCached(hash);
        if (cached) {
          cachedResults.push({ ...cached, filename: file.name });
          onProgress?.(i + 1, limitedFiles.length, `${file.name} (cache)`);
          continue;
        }
      }
      
      filesToProcess.push({ file, hash });
    }

    console.log(`Cache hits: ${cachedResults.length}, to process: ${filesToProcess.length}`);
    results.push(...cachedResults);
    
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

    // Step 3: Convert files to base64 AND run local OCR in parallel
    const filesWithData: { file: File; hash: string; base64: string; ocrData?: PreProcessedOCR }[] = [];
    
    onProgress?.(cachedResults.length, limitedFiles.length, 'Preparando imagens e OCR...');
    
    // Process in small batches to show progress
    const OCR_BATCH = 3;
    for (let i = 0; i < filesToProcess.length; i += OCR_BATCH) {
      const batch = filesToProcess.slice(i, i + OCR_BATCH);
      
      const batchData = await Promise.all(batch.map(async (item) => {
        const base64 = await fileToBase64(item.file);
        
        let ocrData: PreProcessedOCR | undefined;
        if (useLocalOCR && ocrExtractor) {
          try {
            const extracted = await ocrExtractor(item.file);
            if (extracted) {
              ocrData = extracted;
              console.log(`OCR local ${item.file.name}:`, extracted.hasPlaca ? 'placa detectada' : 'sem placa', extracted.rodovia || '');
            }
          } catch (e) {
            console.warn(`OCR falhou para ${item.file.name}:`, e);
          }
        }
        
        return { ...item, base64, ocrData };
      }));
      
      filesWithData.push(...batchData);
      onProgress?.(cachedResults.length + i + batch.length, limitedFiles.length, `OCR ${Math.min(i + OCR_BATCH, filesToProcess.length)}/${filesToProcess.length}...`);
    }

    // Step 4: Process in batches of up to 5
    const BATCH_SIZE = 5;
    let processedCount = cachedResults.length;
    let creditErrorOccurred = false;

    for (let i = 0; i < filesWithData.length; i += BATCH_SIZE) {
      // Stop if credit error occurred
      if (creditErrorOccurred && stopOnCreditError) {
        console.log('Stopping processing due to credit limit error');
        for (let j = i; j < filesWithData.length; j++) {
          const item = filesWithData[j];
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

      const batch = filesWithData.slice(i, i + BATCH_SIZE);
      
      onProgress?.(processedCount + 1, limitedFiles.length, `Lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

      try {
        const { results: batchResults, errors } = await this.analyzeBatch(
          batch,
          config.default_portico,
          empresaNome,
          config.economicMode
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
        
        if (processedBatchResults.length > 0 && onBatchComplete) {
          onBatchComplete(processedBatchResults);
        }

        // Handle errors
        const errorResults: ProcessingResult[] = [];
        for (const err of errors) {
          const originalFile = batch.find(f => f.hash === err.hash);
          
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
        
        if (errorResults.length > 0 && onBatchComplete) {
          onBatchComplete(errorResults);
        }

        processedCount += batch.length;
        onProgress?.(processedCount, limitedFiles.length, batch[batch.length - 1].file.name);

        if (i + BATCH_SIZE < filesWithData.length) {
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
            const result = await this.analyzeImage(item.file, config.default_portico, empresaNome, config.economicMode);
            
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
