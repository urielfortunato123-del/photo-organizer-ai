/**
 * Utilitário de Normalização e Validação de Dados OCR
 * 
 * ✔️ Corrige erros comuns de OCR
 * ✔️ Padroniza termos técnicos
 * ✔️ Remove lixo tipo "-"
 * ✔️ Valida datas (bloqueia inválidas)
 * ✔️ Garante campos mínimos preenchidos
 */

// Mapeamento de correções OCR comuns
const OCR_CORRECTIONS: Record<string, string> = {
  "EXECUO": "EXECUÇÃO",
  "EXECUÇAO": "EXECUÇÃO",
  "EXECUCAO": "EXECUÇÃO",
  "CONSTRUO": "CONSTRUÇÃO",
  "CONSTRUÇAO": "CONSTRUÇÃO",
  "CONSTRUCAO": "CONSTRUÇÃO",
  "INSTALAO": "INSTALAÇÃO",
  "INSTALACAO": "INSTALAÇÃO",
  "INSTALAÇAO": "INSTALAÇÃO",
  "MOVIMENTAO": "MOVIMENTAÇÃO",
  "MOVIMENTACAO": "MOVIMENTAÇÃO",
  "MOVIMENTAÇAO": "MOVIMENTAÇÃO",
  "REGULARIZACAO": "REGULARIZAÇÃO",
  "REGULARIZAÇAO": "REGULARIZAÇÃO",
  "ESCAVACAO": "ESCAVAÇÃO",
  "ESCAVAÇAO": "ESCAVAÇÃO",
  "LANAMENTO": "LANÇAMENTO",
  "LANCAMENTO": "LANÇAMENTO",
  "LANÇAMENT0": "LANÇAMENTO",
  "FUNDAO": "FUNDAÇÃO",
  "FUNDACAO": "FUNDAÇÃO",
  "FUNDAÇAO": "FUNDAÇÃO",
  "PRTICO": "PÓRTICO",
  "PORTICO": "PÓRTICO",
  "P0RTICO": "PÓRTICO",
  "PEDGIO": "PEDÁGIO",
  "PEDAGIO": "PEDÁGIO",
  "CONTENO": "CONTENÇÃO",
  "CONTENCAO": "CONTENÇÃO",
  "CONTENÇAO": "CONTENÇÃO",
  "ELTRICA": "ELÉTRICA",
  "ELETRICA": "ELÉTRICA",
  "ELETR1CA": "ELÉTRICA",
  "USURIO": "USUÁRIO",
  "USUARIO": "USUÁRIO",
  "VEICULOS": "VEÍCULOS",
  "VEICUL0S": "VEÍCULOS",
  "REBOCO": "REBOCO",
  "REB0CO": "REBOCO",
  "DRENAGM": "DRENAGEM",
  "DRENAGEN": "DRENAGEM",
  "SINALIZACAO": "SINALIZAÇÃO",
  "SINALIZAÇAO": "SINALIZAÇÃO",
  "PAVIMENTACAO": "PAVIMENTAÇÃO",
  "PAVIMENTAÇAO": "PAVIMENTAÇÃO",
  "TERRAPLENAGM": "TERRAPLENAGEM",
  "TERRAPLENAGEN": "TERRAPLENAGEM",
  "CONCRETAGEN": "CONCRETAGEM",
  "CONCRETAGM": "CONCRETAGEM",
  "ARMACAO": "ARMAÇÃO",
  "ARMAÇAO": "ARMAÇÃO",
  "IMPERMEABILIZACAO": "IMPERMEABILIZAÇÃO",
  "IMPERMEABILIZAÇAO": "IMPERMEABILIZAÇÃO",
  "DEMOLICAO": "DEMOLIÇÃO",
  "DEMOLIÇAO": "DEMOLIÇÃO",
  "MANUTENCAO": "MANUTENÇÃO",
  "MANUTENÇAO": "MANUTENÇÃO",
  "RECUPERACAO": "RECUPERAÇÃO",
  "RECUPERAÇAO": "RECUPERAÇÃO",
  "FISCALIZACAO": "FISCALIZAÇÃO",
  "FISCALIZAÇAO": "FISCALIZAÇÃO",
  "LOCACAO": "LOCAÇÃO",
  "LOCAÇAO": "LOCAÇÃO",
  "MEDICAO": "MEDIÇÃO",
  "MEDIÇAO": "MEDIÇÃO",
};

/**
 * Normaliza texto técnico corrigindo erros comuns de OCR
 */
export function normalizeTechnicalText(text: string | null | undefined): string {
  if (!text) return "";

  let normalized = text.toUpperCase().trim();

  // Aplica correções de OCR
  Object.entries(OCR_CORRECTIONS).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    normalized = normalized.replace(regex, correct);
  });

  // Remove caracteres de lixo isolados
  normalized = normalized.replace(/^\s*-\s*$/g, "");
  normalized = normalized.replace(/\s{2,}/g, " ");

  return normalized.trim();
}

/**
 * Valida se uma data está no formato DD/MM/YYYY e é válida
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  // formato esperado: DD/MM/YYYY
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validações básicas
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;

  // Validação de dias por mês
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Ano bissexto
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    daysInMonth[1] = 29;
  }

  if (day > daysInMonth[month - 1]) return false;

  // Verifica se não é uma data futura absurda
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const maxFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (date > maxFuture) return false;

  return true;
}

/**
 * Tenta normalizar uma data para o formato DD/MM/YYYY
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Já está no formato correto?
  if (isValidDate(cleaned)) {
    return cleaned;
  }

  // Tenta converter de YYYY-MM-DD para DD/MM/YYYY
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const normalized = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    if (isValidDate(normalized)) return normalized;
  }

  // Tenta converter de DD-MM-YYYY para DD/MM/YYYY
  const dashMatch = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dashMatch) {
    const normalized = `${dashMatch[1]}/${dashMatch[2]}/${dashMatch[3]}`;
    if (isValidDate(normalized)) return normalized;
  }

  // Tenta converter de D/M/YYYY para DD/MM/YYYY
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (shortMatch) {
    const day = shortMatch[1].padStart(2, '0');
    const month = shortMatch[2].padStart(2, '0');
    const normalized = `${day}/${month}/${shortMatch[3]}`;
    if (isValidDate(normalized)) return normalized;
  }

  return null;
}

/**
 * Valida array de datas, retorna as inválidas
 */
export function validateDates(dates: (string | null | undefined)[]): { valid: boolean; invalid: string[] } {
  const invalid: string[] = [];

  for (const d of dates) {
    if (d && !isValidDate(d) && !normalizeDate(d)) {
      invalid.push(d);
    }
  }

  return {
    valid: invalid.length === 0,
    invalid
  };
}

/**
 * Limpa valor de campo removendo lixo comum
 */
export function cleanFieldValue(value: string | null | undefined): string {
  if (!value) return "";
  
  const cleaned = value.trim();
  
  // Valores considerados vazios/lixo
  const emptyValues = ["-", "--", "---", "N/A", "NA", "NULL", "UNDEFINED", ".", ".."];
  
  if (emptyValues.includes(cleaned.toUpperCase())) {
    return "";
  }

  return cleaned;
}

/**
 * Interface para resultado de análise normalizado
 */
export interface NormalizedResult {
  filename: string;
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  service?: string;
  disciplina?: string;
  portico?: string;
  data_detectada?: string;
  ocr_text?: string;
  [key: string]: unknown;
}

/**
 * Normaliza um resultado de análise completo
 */
export function normalizeAnalysisResult<T extends Record<string, unknown>>(result: T): T {
  const normalized = { ...result };

  // Campos de texto técnico para normalizar
  const textFields = ['service', 'disciplina', 'portico', 'ocr_text', 'observacoes'];
  
  textFields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      (normalized as Record<string, unknown>)[field] = normalizeTechnicalText(normalized[field] as string);
    }
  });

  // Campos para limpar
  const cleanFields = ['rodovia', 'km_inicio', 'km_fim', 'sentido', 'contratada', 'contrato'];
  
  cleanFields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      (normalized as Record<string, unknown>)[field] = cleanFieldValue(normalized[field] as string);
    }
  });

  // Normaliza data
  if (typeof normalized.data_detectada === 'string') {
    const normalizedDate = normalizeDate(normalized.data_detectada as string);
    if (normalizedDate) {
      (normalized as Record<string, unknown>).data_detectada = normalizedDate;
    }
  }

  return normalized;
}

/**
 * Valida campos obrigatórios para exportação
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateForExport(results: NormalizedResult[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (results.length === 0) {
    errors.push("Nenhum resultado para exportar");
    return { valid: false, errors, warnings };
  }

  // Verifica datas
  const dates = results
    .map(r => r.data_detectada)
    .filter(Boolean);
  
  const dateValidation = validateDates(dates);
  if (!dateValidation.valid) {
    errors.push(`Datas inválidas detectadas: ${dateValidation.invalid.join(', ')}`);
  }

  // Conta campos vazios importantes
  let missingRodovia = 0;
  let missingService = 0;
  let missingDate = 0;

  results.forEach(result => {
    if (!cleanFieldValue(result.rodovia)) missingRodovia++;
    if (!cleanFieldValue(result.service)) missingService++;
    if (!result.data_detectada) missingDate++;
  });

  // Avisos para campos com alta taxa de ausência
  const threshold = 0.5; // 50%
  
  if (missingRodovia / results.length > threshold) {
    warnings.push(`${missingRodovia} de ${results.length} fotos sem rodovia identificada`);
  }
  
  if (missingService / results.length > threshold) {
    warnings.push(`${missingService} de ${results.length} fotos sem serviço identificado`);
  }
  
  if (missingDate / results.length > threshold) {
    warnings.push(`${missingDate} de ${results.length} fotos sem data detectada`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Prepara resultados para exportação aplicando todas as normalizações
 */
export function prepareResultsForExport<T extends Record<string, unknown>>(results: T[]): {
  normalized: T[];
  validation: ValidationResult;
} {
  // Normaliza todos os resultados
  const normalized = results.map(r => normalizeAnalysisResult(r));

  // Valida
  const validation = validateForExport(normalized as unknown as NormalizedResult[]);

  return { normalized, validation };
}
