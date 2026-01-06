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
  // Rodovias: SP-270, BR-116, SP 264, SP264, SP- 280, etc.
  rodovia: /\b(SP|BR|MT|PR|MG|RJ|BA|GO|RS|SC|PE|CE|PA|MA|PI|RN|PB|SE|AL|ES|DF|TO|RO|AC|AM|RR|AP)[\s\-_]*(\d{2,3})\b/gi,
  // KM: km 94+050, KM 101, km79+000, km131+100, KM 57, KM 79
  km: /\bkm[\s_]*(\d{1,4})[\s]*[\+\._]?[\s]*(\d{0,3})\b/gi,
  // Sentido: Leste, Oeste, Norte, Sul, L/O, N/S, Capital, Interior
  sentido: /\b(leste|oeste|norte|sul|capital|interior|crescente|decrescente|l[\s\/]?o|n[\s\/]?s|sentido[\s:]*\w+)\b/gi,
  // Data numérica: 10/09/2025, 10-09-2025, 10.09.2025
  data: /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g,
  // Data por extenso em português: 24 de nov. de 2025, 24 Nov 2025, 10 de janeiro de 2024, "15 de out. de 2025"
  dataExtenso: /\b(\d{1,2})[\s]+(?:de\s+)?(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\.?[\s]+(?:de\s+)?(\d{4})\b/gi,
  // Hora: 15:40, 15h40, 15:40:00, 13:52:52
  hora: /\b(\d{1,2})[:\s]?h?[:\s]?(\d{2})(?:[:\s](\d{2}))?\b/g,
  // Contrato: Contrato nº 123, CT-123
  contrato: /\b(?:contrato|ct|contr?)[\s\.\-:]*(?:n[°º]?[\s]*)?(\d+[\-\/]?\d*)\b/gi,
  // BSO pattern específico: "BSO - 01", "BSO - 04", "BSO-01", "BSO 01"
  bso: /\bBSO[\s\-_]*(\d{1,2})\b/gi,
  // Free Flow, Cortina, Habitechne, etc.
  estrutura: /\b(reforma[\s\-_]?(?:da[\s\-_]?)?bso|free[\s\-_]?flow|base|praça|praca|pedágio|pedagio|pórtico|portico|cortina|habitechne|sau|p)[\s\-_:]?\s*(p?\d+[\w]*|\d+[\w]*|\w+)?\b/gi,
  // Obras: "obra free flow p17", "Reforma da BSO 1 SP 280"
  obra: /\b(?:obra|reforma)[\s\-_:]*(?:da[\s\-_]*)?(bso[\s\-_]*\d+[^\n,]*|[^\n,]+)/gi,
  // Rodovia por extenso: "Rod. Raposo Tavares", "Rodovia Presidente Castello Branco"
  rodoviaNome: /\b(?:rod\.?|rodovia)[\s]+([^\d\n,]+?)(?:,|[\s]+s\/n|[\s]+km|\d|$)/gi,
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

// Extrai dados estruturados do texto OCR
export function extractStructuredData(text: string): Omit<OCRResult, 'rawText' | 'confidence'> {
  const result: Omit<OCRResult, 'rawText' | 'confidence'> = {
    hasPlaca: false,
  };

  // Normaliza texto
  const normalizedText = text.toUpperCase();
  const lowerText = text.toLowerCase();

  // BSO - PRIORIDADE MÁXIMA para frente de serviço
  // Padrão: "BSO - 01", "BSO - 04", "BSO-01", "BSO 01"
  const bsoMatch = PATTERNS.bso.exec(normalizedText);
  PATTERNS.bso.lastIndex = 0;
  if (bsoMatch) {
    const num = bsoMatch[1].padStart(2, '0');
    result.contratada = `BSO_${num}`;
    result.hasPlaca = true;
  }

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

  // Obra (prioridade alta para identificar frente de serviço)
  // Exemplo: "obra free flow p17 SP264_km131+100", "Reforma da BSO 1 SP 280"
  const obraMatch = PATTERNS.obra.exec(lowerText);
  PATTERNS.obra.lastIndex = 0;
  if (obraMatch) {
    const obraText = obraMatch[1].trim();
    
    // Tenta extrair "Reforma da BSO 1" ou "BSO 1", "BSO 01"
    const bsoMatch = obraText.match(/(?:reforma[\s\-_]*(?:da[\s\-_]*)?)?bso[\s\-_]*(\d+)/i);
    if (bsoMatch) {
      const num = bsoMatch[1].padStart(2, '0');
      result.contratada = `REFORMA_BSO_${num}`;
      result.hasPlaca = true;
    }
    
    // Tenta extrair "free flow p17" ou similar
    const freeFlowMatch = obraText.match(/free[\s\-_]?flow[\s\-_]?(p?\d+)/i);
    if (freeFlowMatch && !result.contratada) {
      result.contratada = `FREE_FLOW_${freeFlowMatch[1].toUpperCase()}`;
      result.hasPlaca = true;
    }
  }

  // Estrutura (Free Flow, BSO, etc.)
  const estruturaMatch = PATTERNS.estrutura.exec(normalizedText);
  PATTERNS.estrutura.lastIndex = 0;
  if (estruturaMatch) {
    const tipo = estruturaMatch[1].toUpperCase().replace(/[\s\-_]/g, '_');
    const id = (estruturaMatch[2] || '').toUpperCase().replace(/[\s\-]/g, '');
    
    // Monta identificador da frente de serviço
    let frente = '';
    if (tipo === 'FREE' || tipo === 'FREE_FLOW') {
      frente = id ? `FREE_FLOW_${id}` : 'FREE_FLOW';
    } else if (tipo.includes('REFORMA') && tipo.includes('BSO')) {
      // Reforma da BSO
      const num = id ? id.replace(/\D/g, '').padStart(2, '0') : '01';
      frente = `REFORMA_BSO_${num}`;
    } else if (tipo === 'BSO') {
      const num = id ? id.replace(/\D/g, '').padStart(2, '0') : '01';
      frente = `BSO_${num}`;
    } else if (tipo === 'P' && id) {
      // P17, P-10, etc
      frente = `P_${id.replace(/^P/i, '')}`;
    } else if (tipo === 'HABITECHNE') {
      frente = 'HABITECHNE';
      result.contratada = 'HABITECHNE';
    } else if (tipo === 'CORTINA') {
      frente = id ? `CORTINA_${id}` : 'CORTINA';
    } else {
      frente = id ? `${tipo}_${id}` : tipo;
    }
    
    // Usa contratada para guardar a frente/pórtico identificado
    if (frente && !result.contratada) {
      result.contratada = frente;
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
