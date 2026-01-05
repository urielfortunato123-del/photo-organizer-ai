import { createWorker, Worker } from 'tesseract.js';
import { useState, useRef, useCallback } from 'react';

export interface OCRResult {
  // Texto bruto extraído
  rawText: string;
  // Campos estruturados extraídos por regex
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  data?: string;
  hora?: string;
  contrato?: string;
  fiscal?: string;
  contratada?: string;
  // Confiança do OCR (0-1)
  confidence: number;
  // Se detectou placa de obra
  hasPlaca: boolean;
}

// Regex patterns para extrair informações de obras rodoviárias
const PATTERNS = {
  // Rodovias: SP-270, BR-116, etc.
  rodovia: /\b(SP|BR|MT|PR|MG|RJ|BA|GO|RS|SC|PE|CE|PA|MA|PI|RN|PB|SE|AL|ES|DF|TO|RO|AC|AM|RR|AP)[\s\-]*(\d{2,3})\b/gi,
  // KM: km 94+050, KM 101, km79+000
  km: /\bkm[\s]*(\d{1,4})[\s]*[\+\.]?[\s]*(\d{0,3})\b/gi,
  // Sentido: Leste, Oeste, Norte, Sul, L/O, N/S, Capital, Interior
  sentido: /\b(leste|oeste|norte|sul|capital|interior|crescente|decrescente|l[\s\/]?o|n[\s\/]?s|sentido[\s:]*\w+)\b/gi,
  // Data: 10/09/2025, 10-09-2025, 10.09.2025
  data: /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g,
  // Hora: 15:40, 15h40, 15:40:00
  hora: /\b(\d{1,2})[:\s]?h?[:\s]?(\d{2})(?:[:\s](\d{2}))?\b/g,
  // Contrato: Contrato nº 123, CT-123
  contrato: /\b(?:contrato|ct|contr?)[\s\.\-:]*(?:n[°º]?[\s]*)?(\d+[\-\/]?\d*)\b/gi,
  // Free Flow, BSO, Base, Praça
  estrutura: /\b(free[\s\-]?flow|bso|base|praça|praca|pedágio|pedagio|pórtico|portico)\s*[\-:]?\s*(\w+)?\b/gi,
};

// Extrai dados estruturados do texto OCR
export function extractStructuredData(text: string): Omit<OCRResult, 'rawText' | 'confidence'> {
  const result: Omit<OCRResult, 'rawText' | 'confidence'> = {
    hasPlaca: false,
  };

  // Normaliza texto
  const normalizedText = text.toUpperCase();

  // Rodovia
  const rodoviaMatch = PATTERNS.rodovia.exec(normalizedText);
  PATTERNS.rodovia.lastIndex = 0;
  if (rodoviaMatch) {
    result.rodovia = `${rodoviaMatch[1]}-${rodoviaMatch[2]}`;
    result.hasPlaca = true;
  }

  // KM
  const kmMatches: string[] = [];
  let kmMatch;
  while ((kmMatch = PATTERNS.km.exec(normalizedText)) !== null) {
    const km = kmMatch[2] ? `${kmMatch[1]}+${kmMatch[2].padStart(3, '0')}` : kmMatch[1];
    kmMatches.push(km);
  }
  PATTERNS.km.lastIndex = 0;
  if (kmMatches.length > 0) {
    result.km_inicio = kmMatches[0];
    if (kmMatches.length > 1) {
      result.km_fim = kmMatches[kmMatches.length - 1];
    }
    result.hasPlaca = true;
  }

  // Sentido
  const sentidoMatch = PATTERNS.sentido.exec(normalizedText);
  PATTERNS.sentido.lastIndex = 0;
  if (sentidoMatch) {
    let sentido = sentidoMatch[1].toUpperCase();
    // Normaliza abreviações
    if (sentido.includes('L') && sentido.includes('O')) sentido = 'LESTE/OESTE';
    if (sentido.includes('N') && sentido.includes('S')) sentido = 'NORTE/SUL';
    result.sentido = sentido;
  }

  // Data
  const dataMatch = PATTERNS.data.exec(text);
  PATTERNS.data.lastIndex = 0;
  if (dataMatch) {
    const day = dataMatch[1].padStart(2, '0');
    const month = dataMatch[2].padStart(2, '0');
    let year = dataMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    result.data = `${day}/${month}/${year}`;
  }

  // Hora
  const horaMatch = PATTERNS.hora.exec(text);
  PATTERNS.hora.lastIndex = 0;
  if (horaMatch) {
    result.hora = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`;
  }

  // Contrato
  const contratoMatch = PATTERNS.contrato.exec(normalizedText);
  PATTERNS.contrato.lastIndex = 0;
  if (contratoMatch) {
    result.contrato = contratoMatch[1];
  }

  // Estrutura (Free Flow, BSO, etc.)
  const estruturaMatch = PATTERNS.estrutura.exec(normalizedText);
  PATTERNS.estrutura.lastIndex = 0;
  if (estruturaMatch) {
    const tipo = estruturaMatch[1].toUpperCase().replace(/[\s\-]/g, ' ');
    const id = estruturaMatch[2] || '';
    if (!result.rodovia) {
      result.rodovia = `${tipo} ${id}`.trim();
    }
    result.hasPlaca = true;
  }

  return result;
}

export function useOCR() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  // Inicializa worker sob demanda
  const getWorker = useCallback(async () => {
    if (!workerRef.current) {
      const worker = await createWorker('por', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  // OCR de uma única imagem
  const extractText = useCallback(async (imageSource: File | string): Promise<OCRResult> => {
    setIsLoading(true);
    setProgress(0);

    try {
      const worker = await getWorker();
      
      // Converte File para URL se necessário
      let source: string;
      if (imageSource instanceof File) {
        source = URL.createObjectURL(imageSource);
      } else {
        source = imageSource;
      }

      const { data } = await worker.recognize(source);
      
      // Limpa URL se criada
      if (imageSource instanceof File) {
        URL.revokeObjectURL(source);
      }

      const structured = extractStructuredData(data.text);

      return {
        rawText: data.text,
        confidence: data.confidence / 100,
        ...structured,
      };
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }, [getWorker]);

  // OCR em lote com controle de concorrência
  const extractTextBatch = useCallback(async (
    files: File[],
    onProgress?: (current: number, total: number) => void,
    concurrency = 2
  ): Promise<Map<string, OCRResult>> => {
    const results = new Map<string, OCRResult>();
    
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const result = await extractText(file);
          return { filename: file.name, result };
        })
      );
      
      batchResults.forEach(({ filename, result }) => {
        results.set(filename, result);
      });
      
      onProgress?.(Math.min(i + concurrency, files.length), files.length);
    }
    
    return results;
  }, [extractText]);

  // Limpa worker
  const terminate = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    extractText,
    extractTextBatch,
    terminate,
    isLoading,
    progress,
  };
}
