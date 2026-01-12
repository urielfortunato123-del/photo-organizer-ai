import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessingResult } from '@/services/api';
import { toast } from 'sonner';

export interface SmartFixStats {
  total: number;
  corrigidos: number;
  naoCorrigidos: number;
  emProgresso: boolean;
  progresso: number;
}

export interface SmartFixResult {
  index: number;
  correcoes: {
    service?: string;
    dest?: string;
    atividade?: string;
    rodovia?: string;
    data_detectada?: string;
    hora?: string;
  };
  errosCorrigidos: string[];
  naoCorrigido: boolean;
  motivo?: string;
}

export const useAISmartFix = () => {
  const [stats, setStats] = useState<SmartFixStats>({
    total: 0,
    corrigidos: 0,
    naoCorrigidos: 0,
    emProgresso: false,
    progresso: 0,
  });
  
  const [naoCorrigidosIndices, setNaoCorrigidosIndices] = useState<Set<number>>(new Set());

  /**
   * Converte File para base64
   */
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Executa correção inteligente com IA
   * - Corrige ortografia OCR
   * - Extrai datas de imagens quando faltando
   */
  const executarCorrecaoInteligente = useCallback(async (
    results: ProcessingResult[],
    files: File[],
    contratoKey?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ 
    resultadosCorrigidos: ProcessingResult[]; 
    naoCorrigidosIndices: Set<number>;
  }> => {
    if (results.length === 0) {
      return { resultadosCorrigidos: [], naoCorrigidosIndices: new Set() };
    }

    setStats({
      total: results.length,
      corrigidos: 0,
      naoCorrigidos: 0,
      emProgresso: true,
      progresso: 0,
    });

    toast.info(`Iniciando correção inteligente com IA para ${results.length} fotos...`);

    try {
      // Prepara dados para enviar à IA
      // Processa em lotes de 10 para não enviar muitas imagens de uma vez
      const BATCH_SIZE = 10;
      const allFixedResults: SmartFixResult[] = [];
      
      for (let batchStart = 0; batchStart < results.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, results.length);
        const batchResults = results.slice(batchStart, batchEnd);
        
        const requestData = await Promise.all(
          batchResults.map(async (result, batchIndex) => {
            const globalIndex = batchStart + batchIndex;
            const file = files.find(f => f.name === result.filename);
            
            // Só envia imagem se não tem data detectada
            let imageBase64: string | undefined;
            if (!result.data_detectada && !result.exif_date && file) {
              try {
                // Redimensiona imagem para economizar banda (max 800px)
                imageBase64 = await resizeAndConvertToBase64(file, 800);
              } catch (err) {
                console.warn(`Erro ao converter imagem ${result.filename}:`, err);
              }
            }
            
            return {
              index: globalIndex,
              filename: result.filename,
              service: result.service,
              dest: result.dest,
              atividade: result.atividade,
              rodovia: result.rodovia,
              data_detectada: result.data_detectada || result.exif_date,
              hora: result.hora,
              imageBase64,
            };
          })
        );

        console.log(`[AISmartFix] Enviando lote ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(results.length / BATCH_SIZE)}...`);

        const { data, error } = await supabase.functions.invoke('ai-smart-fix', {
          body: { 
            results: requestData,
            contratoKey 
          }
        });

        if (error) {
          console.error('Erro na correção IA:', error);
          
          if (error.message?.includes('429')) {
            toast.error('Limite de requisições excedido. Aguarde um momento.');
          } else if (error.message?.includes('402')) {
            toast.error('Créditos de IA insuficientes.');
          }
          
          continue;
        }

        if (data?.results) {
          allFixedResults.push(...data.results);
        }

        // Atualiza progresso
        const progresso = Math.round((batchEnd / results.length) * 100);
        setStats(prev => ({ ...prev, progresso }));
        onProgress?.(batchEnd, results.length);

        // Delay entre lotes
        if (batchEnd < results.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Aplica correções aos resultados
      const naoCorrigidos = new Set<number>();
      let countCorrigidos = 0;
      let countNaoCorrigidos = 0;

      const resultadosCorrigidos = results.map((result, index) => {
        const fix = allFixedResults.find(f => f.index === index);
        
        if (!fix) return result;
        
        if (fix.naoCorrigido) {
          naoCorrigidos.add(index);
          countNaoCorrigidos++;
          console.log(`[AISmartFix] Não corrigido: ${result.filename} - ${fix.motivo}`);
          return result;
        }
        
        if (fix.errosCorrigidos.length > 0) {
          countCorrigidos++;
          console.log(`[AISmartFix] Corrigido: ${result.filename}`, fix.errosCorrigidos);
          
          return {
            ...result,
            ...fix.correcoes,
            corrigidoPorIA: true,
          };
        }
        
        return result;
      });

      setStats({
        total: results.length,
        corrigidos: countCorrigidos,
        naoCorrigidos: countNaoCorrigidos,
        emProgresso: false,
        progresso: 100,
      });

      setNaoCorrigidosIndices(naoCorrigidos);

      if (countCorrigidos > 0 || countNaoCorrigidos > 0) {
        toast.success(
          `Correção IA concluída: ${countCorrigidos} corrigidos${countNaoCorrigidos > 0 ? `, ${countNaoCorrigidos} precisam de atenção` : ''}`
        );
      } else {
        toast.info('Nenhuma correção necessária - todos os dados estão corretos!');
      }

      return { 
        resultadosCorrigidos, 
        naoCorrigidosIndices: naoCorrigidos 
      };

    } catch (err) {
      console.error('Erro na correção inteligente:', err);
      setStats(prev => ({ ...prev, emProgresso: false }));
      toast.error('Erro ao executar correção inteligente');
      return { resultadosCorrigidos: results, naoCorrigidosIndices: new Set() };
    }
  }, []);

  /**
   * Limpa indicadores de não corrigidos
   */
  const limparNaoCorrigidos = useCallback(() => {
    setNaoCorrigidosIndices(new Set());
  }, []);

  return {
    stats,
    naoCorrigidosIndices,
    executarCorrecaoInteligente,
    limparNaoCorrigidos,
  };
};

/**
 * Redimensiona imagem e converte para base64
 */
async function resizeAndConvertToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      let { width, height } = img;
      
      // Redimensiona mantendo proporção
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
