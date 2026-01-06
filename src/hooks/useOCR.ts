import { createWorker, Worker } from 'tesseract.js';
import { useState, useRef, useCallback } from 'react';

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

// Regex patterns para extrair informações de obras rodoviárias
const PATTERNS = {
  // === LOCALIZAÇÃO ===
  // Rodovias: SP-270, BR-116, SP 264, SP264, SP- 280
  rodovia: /\b(SP|BR|MT|PR|MG|RJ|BA|GO|RS|SC|PE|CE|PA|MA|PI|RN|PB|SE|AL|ES|DF|TO|RO|AC|AM|RR|AP)[\s\-_]*(\d{2,3})\b/gi,
  // KM: km 94+050, KM 101, km79+000, km131+100, KM 57
  km: /\bkm[\s_]*(\d{1,4})[\s]*[\+\._]?[\s]*(\d{0,3})\b/gi,
  // Sentido: Leste, Oeste, Norte, Sul
  sentido: /\b(leste|oeste|norte|sul|capital|interior|crescente|decrescente|l[\s\/]?o|n[\s\/]?s|sentido[\s:]*\w+)\b/gi,
  
  // === FRENTES DE SERVIÇO/OBRA ===
  bso: /\bBSO[\s\-_]*(\d{1,2})\b/gi,
  portico: /\bP[OÓ]RTICO[\s\-_]*(\d{1,2})?\b/gi,
  passarela: /\bPASSARELA[\s\-_]*(\d{1,2})?\b/gi,
  viaduto: /\bVIADUTO[\s\-_]*([A-Z0-9\-]+)?\b/gi,
  ponte: /\bPONTE[\s\-_]*([A-Z0-9\-]+)?\b/gi,
  oae: /\bOAE[\s\-_]*(\d{1,2})?\b/gi,
  pracaPedagio: /\bPRA[CÇ]A[\s\-_]*(DE[\s\-_]*)?(PED[AÁ]GIO)?[\s\-_]*(\d{1,2})?\b/gi,
  freeFlow: /\bFREE[\s\-_]?FLOW[\s\-_]*([A-Z]?\d*)?\b/gi,
  cortina: /\bCORTINA[\s\-_]*(\d{1,2})?\b/gi,
  
  // === METADADOS ===
  data: /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})\b/g,
  dataExtenso: /\b(\d{1,2})[\s]+(?:de\s+)?(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\.?[\s]+(?:de\s+)?(\d{4})\b/gi,
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

// Extrai dados estruturados do texto OCR
export function extractStructuredData(text: string): Omit<OCRResult, 'rawText' | 'confidence'> {
  const result: Omit<OCRResult, 'rawText' | 'confidence'> = {
    hasPlaca: false,
  };

  // Normaliza texto
  const normalizedText = text.toUpperCase();
  const lowerText = text.toLowerCase();

  // === FRENTE DE SERVIÇO (identificação do trabalho) ===
  // Busca em ordem de prioridade
  
  // BSO: "BSO - 01", "BSO - 04", "BSO-01", "BSO 01"
  const bsoMatch = PATTERNS.bso.exec(normalizedText);
  PATTERNS.bso.lastIndex = 0;
  if (bsoMatch) {
    const num = bsoMatch[1].padStart(2, '0');
    result.frenteServico = `BSO_${num}`;
    result.hasPlaca = true;
  }
  
  // PÓRTICO: "PÓRTICO 03", "PORTICO-1"
  if (!result.frenteServico) {
    const porticoMatch = PATTERNS.portico.exec(normalizedText);
    PATTERNS.portico.lastIndex = 0;
    if (porticoMatch) {
      const num = porticoMatch[1] ? porticoMatch[1].padStart(2, '0') : '';
      result.frenteServico = num ? `PORTICO_${num}` : 'PORTICO';
      result.hasPlaca = true;
    }
  }
  
  // PASSARELA: "PASSARELA 02"
  if (!result.frenteServico) {
    const passarelaMatch = PATTERNS.passarela.exec(normalizedText);
    PATTERNS.passarela.lastIndex = 0;
    if (passarelaMatch) {
      const num = passarelaMatch[1] ? passarelaMatch[1].padStart(2, '0') : '';
      result.frenteServico = num ? `PASSARELA_${num}` : 'PASSARELA';
      result.hasPlaca = true;
    }
  }
  
  // VIADUTO
  if (!result.frenteServico) {
    const viadutoMatch = PATTERNS.viaduto.exec(normalizedText);
    PATTERNS.viaduto.lastIndex = 0;
    if (viadutoMatch) {
      const id = viadutoMatch[1] || '';
      result.frenteServico = id ? `VIADUTO_${id}` : 'VIADUTO';
      result.hasPlaca = true;
    }
  }
  
  // PONTE
  if (!result.frenteServico) {
    const ponteMatch = PATTERNS.ponte.exec(normalizedText);
    PATTERNS.ponte.lastIndex = 0;
    if (ponteMatch) {
      const id = ponteMatch[1] || '';
      result.frenteServico = id ? `PONTE_${id}` : 'PONTE';
      result.hasPlaca = true;
    }
  }
  
  // OAE
  if (!result.frenteServico) {
    const oaeMatch = PATTERNS.oae.exec(normalizedText);
    PATTERNS.oae.lastIndex = 0;
    if (oaeMatch) {
      const num = oaeMatch[1] ? oaeMatch[1].padStart(2, '0') : '';
      result.frenteServico = num ? `OAE_${num}` : 'OAE';
      result.hasPlaca = true;
    }
  }
  
  // PRAÇA DE PEDÁGIO
  if (!result.frenteServico) {
    const pracaMatch = PATTERNS.pracaPedagio.exec(normalizedText);
    PATTERNS.pracaPedagio.lastIndex = 0;
    if (pracaMatch) {
      const num = pracaMatch[3] ? pracaMatch[3].padStart(2, '0') : '';
      result.frenteServico = num ? `PRACA_PEDAGIO_${num}` : 'PRACA_PEDAGIO';
      result.hasPlaca = true;
    }
  }
  
  // FREE FLOW
  if (!result.frenteServico) {
    const freeFlowMatch = PATTERNS.freeFlow.exec(normalizedText);
    PATTERNS.freeFlow.lastIndex = 0;
    if (freeFlowMatch) {
      const id = freeFlowMatch[1] || '';
      result.frenteServico = id ? `FREE_FLOW_${id}` : 'FREE_FLOW';
      result.hasPlaca = true;
    }
  }
  
  // CORTINA
  if (!result.frenteServico) {
    const cortinaMatch = PATTERNS.cortina.exec(normalizedText);
    PATTERNS.cortina.lastIndex = 0;
    if (cortinaMatch) {
      const num = cortinaMatch[1] ? cortinaMatch[1].padStart(2, '0') : '';
      result.frenteServico = num ? `CORTINA_${num}` : 'CORTINA';
      result.hasPlaca = true;
    }
  }
  
  // Compatibilidade: copia para contratada (deprecated)
  if (result.frenteServico) {
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

  // Extração de frente de serviço de texto livre (fallback)
  // Exemplo: "obra free flow p17", "Reforma da BSO 1 SP 280"
  if (!result.frenteServico) {
    // Tenta extrair "Reforma da BSO 1" ou "BSO 1", "BSO 01"
    const bsoTextMatch = lowerText.match(/(?:reforma[\s\-_]*(?:da[\s\-_]*)?)?bso[\s\-_]*(\d+)/i);
    if (bsoTextMatch) {
      const num = bsoTextMatch[1].padStart(2, '0');
      result.frenteServico = `BSO_${num}`;
      result.contratada = result.frenteServico;
      result.hasPlaca = true;
    }
    
    // Tenta extrair "free flow p17" ou similar
    if (!result.frenteServico) {
      const freeFlowTextMatch = lowerText.match(/free[\s\-_]?flow[\s\-_]?(p?\d+)?/i);
      if (freeFlowTextMatch) {
        const id = freeFlowTextMatch[1] ? freeFlowTextMatch[1].toUpperCase() : '';
        result.frenteServico = id ? `FREE_FLOW_${id}` : 'FREE_FLOW';
        result.contratada = result.frenteServico;
        result.hasPlaca = true;
      }
    }
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
