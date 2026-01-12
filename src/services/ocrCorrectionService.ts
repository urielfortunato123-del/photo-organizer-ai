import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OCRCorrectionResult {
  textoCorrigido: string;
  camposCorrigidos: {
    localizacao?: string;
    endereco?: string;
    frenteServico?: string;
    empresa?: string;
    data?: string;
    hora?: string;
  };
  correcoes: Array<{
    original: string;
    corrigido: string;
    tipo: string;
  }>;
}

export interface OCRCorrectionInput {
  textoOCR: string;
  contratoKey?: string;
  campos?: {
    localizacao?: string;
    endereco?: string;
    frenteServico?: string;
    empresa?: string;
    data?: string;
    hora?: string;
  };
}

/**
 * Corrige texto OCR usando IA
 */
export async function corrigirTextoOCR(input: OCRCorrectionInput): Promise<OCRCorrectionResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ocr-correction', {
      body: input
    });

    if (error) {
      console.error('Erro ao corrigir OCR:', error);
      
      // Verifica erros específicos
      if (error.message?.includes('429')) {
        toast.error('Limite de requisições excedido. Aguarde um momento.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos de IA insuficientes.');
      }
      
      return null;
    }

    if (data?.error) {
      console.error('Erro retornado:', data.error);
      return null;
    }

    return data as OCRCorrectionResult;
  } catch (err) {
    console.error('Erro na correção OCR:', err);
    return null;
  }
}

/**
 * Corrige múltiplos textos OCR em lote
 */
export async function corrigirTextoOCRBatch(
  inputs: OCRCorrectionInput[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, OCRCorrectionResult>> {
  const results = new Map<number, OCRCorrectionResult>();
  
  // Processa em lotes de 3 para evitar rate limiting
  const batchSize = 3;
  const delayBetweenBatches = 1000; // 1 segundo entre lotes
  
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (input, batchIndex) => {
      const index = i + batchIndex;
      const result = await corrigirTextoOCR(input);
      if (result) {
        results.set(index, result);
      }
      onProgress?.(results.size, inputs.length);
      return result;
    });
    
    await Promise.all(batchPromises);
    
    // Delay entre lotes para evitar rate limiting
    if (i + batchSize < inputs.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}

/**
 * Aplica correções da IA ao resultado do processamento
 */
export function aplicarCorrecoes(
  resultado: Record<string, unknown>,
  correcao: OCRCorrectionResult
): Record<string, unknown> {
  const atualizado = { ...resultado };
  
  // Aplica campos corrigidos
  if (correcao.camposCorrigidos) {
    if (correcao.camposCorrigidos.localizacao) {
      atualizado['localizacao'] = correcao.camposCorrigidos.localizacao;
    }
    if (correcao.camposCorrigidos.endereco) {
      atualizado['endereco'] = correcao.camposCorrigidos.endereco;
    }
    if (correcao.camposCorrigidos.frenteServico) {
      atualizado['frenteServico'] = correcao.camposCorrigidos.frenteServico;
    }
    if (correcao.camposCorrigidos.empresa) {
      atualizado['empresa'] = correcao.camposCorrigidos.empresa;
    }
    if (correcao.camposCorrigidos.data) {
      atualizado['data'] = correcao.camposCorrigidos.data;
    }
    if (correcao.camposCorrigidos.hora) {
      atualizado['hora'] = correcao.camposCorrigidos.hora;
    }
  }
  
  // Marca como corrigido pela IA
  atualizado['corrigidoPorIA'] = true;
  atualizado['correcoesAplicadas'] = correcao.correcoes;
  
  return atualizado;
}
