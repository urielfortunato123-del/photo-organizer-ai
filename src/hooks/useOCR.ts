import { createWorker, Worker } from 'tesseract.js';
import { useState, useRef, useCallback } from 'react';
import { TODAS_FRENTES, FrenteServico } from '@/config/frentesServico';

export interface OCRResult {
  // Texto bruto extraído
  rawText: string;
  
  // === LOCALIZAÇÃO (onde a foto foi tirada) ===
  rodovia?: string;      // SP-280, SP-270 (LOCAL)
  km_inicio?: string;    // KM 150 (LOCAL)
  km_fim?: string;
  sentido?: string;
  
  // === FRENTE DE SERVIÇO/OBRA (identificação do trabalho) ===
  frenteServico?: string;  // BSO_01, PORTICO_03, PASSARELA_02, etc.
  frenteServicoInfo?: FrenteServico; // Informações detalhadas da frente
  
  // === METADADOS ===
  data?: string;
  hora?: string;
  contrato?: string;
  fiscal?: string;
  contratada?: string;     // Deprecated - usar frenteServico
  
  // Confiança do OCR (0-1)
  confidence: number;
  // Se detectou placa de obra
  hasPlaca: boolean;
}

// Regex patterns para extrair informações básicas
const PATTERNS = {
  // === LOCALIZAÇÃO ===
  // Rodovias: SP-270, BR-116, SP 264, SP264, SP- 280
  rodovia: /\b(SP|BR|MT|PR|MG|RJ|BA|GO|RS|SC|PE|CE|PA|MA|PI|RN|PB|SE|AL|ES|DF|TO|RO|AC|AM|RR|AP)[\s\-_]*(\d{2,3})\b/gi,
  // KM: km 94+050, KM 101, km79+000, km131+100, KM 57
  km: /\bkm[\s_]*(\d{1,4})[\s]*[\+\._]?[\s]*(\d{0,3})\b/gi,
  // Sentido: Leste, Oeste, Norte, Sul
  sentido: /\b(leste|oeste|norte|sul|capital|interior|crescente|decrescente|l[\s\/]?o|n[\s\/]?s|sentido[\s:]*\w+)\b/gi,
  
  // === METADADOS ===
  data: /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g,
  dataExtenso: /\b(\d{1,2})[\s]+(?:de[\s]+)?(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\.?[\s]+(?:de[\s]+)?(\d{4})\b/gi,
  hora: /\b(\d{1,2})[:\s]?h?[:\s]?(\d{2})(?:[:\s](\d{2}))?\b/g,
  contrato: /\b(?:contrato|ct|contr?)[\s\.\-:]*(?:n[°º]?[\s]*)?(\d+[\-\/]?\d*)\b/gi,
};

// Mapa de meses em português para números
const MESES_PT: Record<string, string> = {
  'jan': '01', 'janeiro': '01',
  'fev': '02', 'fevereiro': '02',
  'mar': '03', 'março': '03', 'marco': '03',
  'abr': '04', 'abril': '04',
  'mai': '05', 'maio': '05',
  'jun': '06', 'junho': '06',
  'jul': '07', 'julho': '07',
  'ago': '08', 'agosto': '08',
  'set': '09', 'setembro': '09',
  'out': '10', 'outubro': '10',
  'nov': '11', 'novembro': '11',
  'dez': '12', 'dezembro': '12',
};

/**
 * Tenta identificar frente de serviço usando o catálogo completo
 */
function identificarFrenteServico(texto: string): { id: string; numero?: string; frente: FrenteServico } | null {
  const normalizado = texto.toUpperCase();
  
  // Ordena por especificidade (frentes com subcategoria primeiro, depois por tamanho do nome)
  const frentesOrdenadas = [...TODAS_FRENTES].sort((a, b) => {
    // Cortina atirantada antes de cortina simples
    if (a.id === 'CORTINA_ATIRANTADA' && b.id === 'CORTINA') return -1;
    if (a.id === 'CORTINA' && b.id === 'CORTINA_ATIRANTADA') return 1;
    
    // Frentes com subcategoria são mais específicas
    const aSpec = a.subcategoria ? 1 : 0;
    const bSpec = b.subcategoria ? 1 : 0;
    if (aSpec !== bSpec) return bSpec - aSpec;
    
    // Nomes mais longos são mais específicos
    return b.nome.length - a.nome.length;
  });
  
  for (const frente of frentesOrdenadas) {
    // Reset regex
    frente.regex.lastIndex = 0;
    const match = frente.regex.exec(normalizado);
    
    if (match) {
      frente.regex.lastIndex = 0;
      
      // Tenta extrair número do grupo de captura
      let numero: string | undefined;
      for (let i = 1; i < match.length; i++) {
        const grupo = match[i];
        if (grupo && /^\d+$/.test(grupo.trim())) {
          numero = grupo.trim().padStart(2, '0');
          break;
        }
        // Para casos como "P-10", "P10"
        if (grupo && /^[A-Z]?[\-\s]*\d+$/i.test(grupo.trim())) {
          numero = grupo.replace(/[\s\-_]+/g, '').toUpperCase();
          break;
        }
      }
      
      return { id: frente.id, numero, frente };
    }
  }
  
  return null;
}

// Extrai dados estruturados do texto OCR
export function extractStructuredData(text: string): Omit<OCRResult, 'rawText' | 'confidence'> {
  const result: Omit<OCRResult, 'rawText' | 'confidence'> = {
    hasPlaca: false,
  };

  // Normaliza texto
  const normalizedText = text.toUpperCase();
  const lowerText = text.toLowerCase();

  // === FRENTE DE SERVIÇO (usando catálogo completo) ===
  const frenteEncontrada = identificarFrenteServico(text);
  
  if (frenteEncontrada) {
    const { id, numero, frente } = frenteEncontrada;
    result.frenteServico = numero ? `${id}_${numero}` : id;
    result.frenteServicoInfo = frente;
    result.hasPlaca = true;
    
    // Compatibilidade: copia para contratada (deprecated)
    result.contratada = result.frenteServico;
  }

  // === LOCALIZAÇÃO ===
  
  // Rodovia (LOCAL, não frente de serviço)
  const rodoviaMatch = PATTERNS.rodovia.exec(normalizedText);
  PATTERNS.rodovia.lastIndex = 0;
  if (rodoviaMatch) {
    result.rodovia = `${rodoviaMatch[1]}-${rodoviaMatch[2]}`;
  }

  // KM (LOCAL, não frente de serviço)
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

  // Data numérica
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

  // Data por extenso em português (se não encontrou data numérica)
  if (!result.data) {
    const dataExtensoMatch = PATTERNS.dataExtenso.exec(lowerText);
    PATTERNS.dataExtenso.lastIndex = 0;
    if (dataExtensoMatch) {
      const day = dataExtensoMatch[1].padStart(2, '0');
      const mesNome = dataExtensoMatch[2].toLowerCase().replace('.', '');
      const mesNum = MESES_PT[mesNome] || MESES_PT[mesNome.substring(0, 3)] || '01';
      const year = dataExtensoMatch[3];
      result.data = `${day}/${mesNum}/${year}`;
      result.hasPlaca = true;
    }
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
