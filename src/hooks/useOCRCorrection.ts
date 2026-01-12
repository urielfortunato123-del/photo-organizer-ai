import { useState, useCallback } from 'react';
import { 
  corrigirTextoOCR, 
  corrigirTextoOCRBatch, 
  aplicarCorrecoes,
  OCRCorrectionResult,
  OCRCorrectionInput 
} from '@/services/ocrCorrectionService';
import { ProcessingResult } from '@/services/api';
import { toast } from 'sonner';

export interface OCRCorrectionStats {
  total: number;
  corrigidos: number;
  emProgresso: boolean;
  progresso: number;
  correcoesFeitas: number;
}

export const useOCRCorrection = () => {
  const [stats, setStats] = useState<OCRCorrectionStats>({
    total: 0,
    corrigidos: 0,
    emProgresso: false,
    progresso: 0,
    correcoesFeitas: 0,
  });

  /**
   * Corrige um único resultado de processamento
   */
  const corrigirResultado = useCallback(async (
    result: ProcessingResult,
    contratoKey?: string
  ): Promise<ProcessingResult> => {
    // Monta o input para correção usando campos do ProcessingResult
    const input: OCRCorrectionInput = {
      textoOCR: result.ocr_text || result.status || '',
      contratoKey,
      campos: {
        localizacao: result.rodovia ? `${result.rodovia} ${result.km_inicio || ''}` : undefined,
        endereco: result.sentido,
        frenteServico: result.service,
        empresa: result.empresa,
        data: result.data_detectada,
        hora: result.hora,
      }
    };

    const correcao = await corrigirTextoOCR(input);
    if (!correcao) {
      return result;
    }

    // Aplica as correções ao resultado
    const corrigido = aplicarCorrecoes(
      result as unknown as Record<string, unknown>,
      correcao
    ) as unknown as ProcessingResult;

    return corrigido;
  }, []);

  /**
   * Corrige múltiplos resultados em lote
   */
  const corrigirResultadosBatch = useCallback(async (
    results: ProcessingResult[],
    contratoKey?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<ProcessingResult[]> => {
    if (results.length === 0) return [];

    setStats({
      total: results.length,
      corrigidos: 0,
      emProgresso: true,
      progresso: 0,
      correcoesFeitas: 0,
    });

    toast.info(`Iniciando correção IA de ${results.length} resultados...`);

    const inputs: OCRCorrectionInput[] = results.map(result => ({
      textoOCR: result.ocr_text || result.status || '',
      contratoKey,
      campos: {
        localizacao: result.rodovia ? `${result.rodovia} ${result.km_inicio || ''}` : undefined,
        endereco: result.sentido,
        frenteServico: result.service,
        empresa: result.empresa,
        data: result.data_detectada,
        hora: result.hora,
      }
    }));

    const correcoes = await corrigirTextoOCRBatch(inputs, (current, total) => {
      const progresso = Math.round((current / total) * 100);
      setStats(prev => ({
        ...prev,
        corrigidos: current,
        progresso,
      }));
      onProgress?.(current, total);
    });

    // Aplica correções aos resultados
    const resultadosCorrigidos = results.map((result, index) => {
      const correcao = correcoes.get(index);
      if (correcao) {
        return aplicarCorrecoes(
          result as unknown as Record<string, unknown>,
          correcao
        ) as unknown as ProcessingResult;
      }
      return result;
    });

    // Conta total de correções feitas
    let totalCorrecoes = 0;
    correcoes.forEach(c => {
      totalCorrecoes += c.correcoes.length;
    });

    setStats({
      total: results.length,
      corrigidos: correcoes.size,
      emProgresso: false,
      progresso: 100,
      correcoesFeitas: totalCorrecoes,
    });

    toast.success(`Correção concluída: ${correcoes.size} resultados analisados, ${totalCorrecoes} correções aplicadas`);

    return resultadosCorrigidos;
  }, []);

  /**
   * Analisa resultados e retorna sugestões de correção (sem aplicar)
   */
  /**
   * Analisa resultados e retorna sugestões de correção (sem aplicar)
   */
  const analisarErros = useCallback(async (
    results: ProcessingResult[],
    contratoKey?: string
  ): Promise<Map<number, OCRCorrectionResult>> => {
    const inputs: OCRCorrectionInput[] = results.map(result => ({
      textoOCR: result.ocr_text || result.status || '',
      contratoKey,
      campos: {
        localizacao: result.rodovia ? `${result.rodovia} ${result.km_inicio || ''}` : undefined,
        endereco: result.sentido,
        frenteServico: result.service,
        empresa: result.empresa,
        data: result.data_detectada,
        hora: result.hora,
      }
    }));

    return await corrigirTextoOCRBatch(inputs);
  }, []);

  return {
    stats,
    corrigirResultado,
    corrigirResultadosBatch,
    analisarErros,
  };
};
