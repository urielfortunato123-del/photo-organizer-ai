/**
 * Utilitário de Normalização e Validação de Dados OCR
 * 
 * ✔️ Corrige erros comuns de OCR com dicionário expansível por contrato
 * ✔️ Padroniza termos técnicos
 * ✔️ Remove lixo tipo "-"
 * ✔️ Valida datas (bloqueia inválidas)
 * ✔️ Garante campos mínimos preenchidos
 * ✔️ Aplica defaults automáticos
 * ✔️ Suporte a IA para sugestão de legendas
 */

// ============================================================================
// 1) DICIONÁRIO TÉCNICO EXPANSÍVEL POR CONTRATO
// ============================================================================

export const TECH_DICTIONARIES: Record<string, Record<string, string>> = {
  GLOBAL: {
    // Correções de acentuação OCR
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
    "PAVIMENTAO": "PAVIMENTAÇÃO",
    "TERRAPLENAGM": "TERRAPLENAGEM",
    "TERRAPLENAGEN": "TERRAPLENAGEM",
    "CONCRETAGEN": "CONCRETAGEM",
    "CONCRETAGM": "CONCRETAGEM",
    "CONCRETAES": "CONCRETAGEM",
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
    "PROTEO": "PROTEÇÃO",
    "PROTECAO": "PROTEÇÃO",
    "PROTEÇAO": "PROTEÇÃO",
    "MDULOS": "MÓDULOS",
    "MODULOS": "MÓDULOS",
    "PRFABRICADOS": "PRÉ-FABRICADOS",
    "PREFABRICADOS": "PRÉ-FABRICADOS",
    // Correções de AMPLIAO (faltando Ç)
    "AMPLIAO": "AMPLIAÇÃO",
    "AMPLIAÇAO": "AMPLIAÇÃO",
    "AMPLIACAO": "AMPLIAÇÃO",
    // Correções adicionais comuns
    "EXTENSAO": "EXTENSÃO",
    "EXTENSAÇAO": "EXTENSÃO",
    "ILUMINACAO": "ILUMINAÇÃO",
    "ILUMINAÇAO": "ILUMINAÇÃO",
    "LIMPZA": "LIMPEZA",
    "LIMPEZ": "LIMPEZA",
    "REVSAO": "REVISÃO",
    "REVISAO": "REVISÃO",
    "REVISAÇAO": "REVISÃO",
    "INSPECAO": "INSPEÇÃO",
    "INSPECAÇAO": "INSPEÇÃO",
    "SUBSTITUICAO": "SUBSTITUIÇÃO",
    "SUBSTITUIÇAO": "SUBSTITUIÇÃO",
  },

  // Contratos específicos - expandir conforme necessidade
  FREEFLOW_SP270: {
    "PORTICO_FREE_FLOW": "PÓRTICO FREE FLOW",
    "PRTICO_DE_PEDGIO": "PÓRTICO DE PEDÁGIO",
    "CANALETA_DO_ALAMBRADO": "CANALETA DO ALAMBRADO",
    "FREE_FLOW": "FREE FLOW",
  },

  CCR_VIAOESTE: {
    "PRACA_PEDAGIO": "PRAÇA DE PEDÁGIO",
    "BSO": "BSO",
  },

  ARTERIS: {
    "VIADUTO_ARTERIS": "VIADUTO ARTERIS",
  },
};

/**
 * Escapa caracteres especiais para uso em regex
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normaliza texto técnico corrigindo erros comuns de OCR
 * Usa dicionário GLOBAL + dicionário específico do contrato
 */
export function normalizeTechnicalText(
  text: string | null | undefined,
  contratoKey: string = "GLOBAL"
): string {
  if (!text) return "";

  let normalized = String(text).toUpperCase().trim();

  // Remove placeholders ruins
  if (normalized === "-" || normalized === "—" || normalized === "--") return "";

  // Mescla dicionário global com específico do contrato
  const dict = {
    ...(TECH_DICTIONARIES.GLOBAL || {}),
    ...(TECH_DICTIONARIES[contratoKey] || {}),
  };

  // Aplica correções
  for (const wrong of Object.keys(dict)) {
    const regex = new RegExp(`\\b${escapeRegExp(wrong)}\\b`, "gi");
    normalized = normalized.replace(regex, dict[wrong]);
  }

  // Limpeza extra
  normalized = normalized
    .replace(/\s+/g, " ")           // múltiplos espaços → um
    .replace(/_+/g, "_")            // múltiplos underscores → um
    .replace(/\s*-\s*/g, " - ")     // padroniza traços
    .trim();

  return normalized;
}

// ============================================================================
// 2) VALIDAÇÃO FORTE DE DATAS
// ============================================================================

/**
 * Valida se uma data está no formato DD/MM/YYYY e é válida
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = String(dateStr).trim().match(regex);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validações de range
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  // Dias no mês (considera ano bissexto)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

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

  const cleaned = String(dateStr).trim();

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
 * Valida array de datas e lança erro se encontrar inválidas
 */
export function validateDatesOrFail(
  items: Array<{ id?: string | number; data?: string; filename?: string }>
): void {
  for (const item of items) {
    const dateStr = item.data;
    if (dateStr && !isValidDate(dateStr) && !normalizeDate(dateStr)) {
      const identifier = item.filename || item.id || "desconhecida";
      throw new Error(`Data inválida na foto ${identifier}: "${dateStr}"`);
    }
  }
}

/**
 * Valida array de datas, retorna as inválidas (não lança erro)
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

// ============================================================================
// 3) LIMPEZA DE CAMPOS
// ============================================================================

/**
 * Limpa valor de campo removendo lixo comum
 */
export function cleanFieldValue(value: string | null | undefined): string {
  if (!value) return "";
  
  const cleaned = String(value).trim();
  
  // Valores considerados vazios/lixo
  const emptyValues = ["-", "--", "---", "—", "N/A", "NA", "NULL", "UNDEFINED", ".", ".."];
  
  if (emptyValues.includes(cleaned.toUpperCase())) {
    return "";
  }

  return cleaned;
}

// ============================================================================
// 4) DEFAULTS AUTOMÁTICOS (textos padrão)
// ============================================================================

export interface ReportDefaults {
  objetivo?: string;
  servicoRealizado?: string;
  observacoes?: string;
  razaoSocial?: string;
  responsavel?: string;
}

const DEFAULT_TEXTS: ReportDefaults = {
  objetivo: "Registro fotográfico das atividades executadas em campo",
  servicoRealizado: "Registro fotográfico para comprovação e acompanhamento técnico das atividades executadas no período.",
  observacoes: "Registro gerado automaticamente. Em caso de divergência, considerar as marcações de data/hora nas imagens e a frente identificada.",
};

/**
 * Aplica textos padrão para campos vazios
 */
export function applyDefaults<T extends Record<string, unknown>>(
  report: T,
  customDefaults?: Partial<ReportDefaults>
): T {
  const defaults = { ...DEFAULT_TEXTS, ...customDefaults };
  const result = { ...report };

  if (!cleanFieldValue(result.objetivo as string)) {
    (result as Record<string, unknown>).objetivo = defaults.objetivo;
  }

  if (!cleanFieldValue(result.servicoRealizado as string)) {
    (result as Record<string, unknown>).servicoRealizado = defaults.servicoRealizado;
  }

  if (!cleanFieldValue(result.observacoes as string)) {
    (result as Record<string, unknown>).observacoes = defaults.observacoes;
  }

  // Fallbacks de identidade
  if (!cleanFieldValue(result.razaoSocial as string)) {
    (result as Record<string, unknown>).razaoSocial = defaults.razaoSocial || "—";
  }

  if (!cleanFieldValue(result.responsavel as string)) {
    (result as Record<string, unknown>).responsavel = defaults.responsavel || "—";
  }

  return result;
}

// ============================================================================
// 5) VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
// ============================================================================

export interface RequiredFieldConfig {
  key: string;
  label: string;
}

const DEFAULT_REQUIRED_FIELDS: RequiredFieldConfig[] = [
  { key: "cliente", label: "Cliente" },
  { key: "objetivo", label: "Objetivo" },
  { key: "servicoRealizado", label: "Serviço realizado" },
  { key: "localizacao", label: "Localização (GPS ou Rodovia/KM)" },
];

/**
 * Valida campos obrigatórios e lança erro se faltarem
 */
export function validateRequiredFields(
  report: Record<string, unknown>,
  requiredFields: RequiredFieldConfig[] = DEFAULT_REQUIRED_FIELDS
): void {
  for (const { key, label } of requiredFields) {
    const val = report[key];
    if (!val || !cleanFieldValue(String(val))) {
      throw new Error(`Campo obrigatório não preenchido: ${label}`);
    }
  }

  // Valida se há fotos
  const fotos = report.fotos as unknown[];
  if (!fotos || !Array.isArray(fotos) || fotos.length === 0) {
    throw new Error("Não há fotos no relatório.");
  }
}

// ============================================================================
// 6) INTERFACES E TIPOS
// ============================================================================

export interface FotoReport {
  id?: string | number;
  filename?: string;
  descricao?: string;
  data?: string;
  [key: string]: unknown;
}

export interface Report {
  cliente?: string;
  razaoSocial?: string;
  responsavel?: string;
  objetivo?: string;
  servicoRealizado?: string;
  localizacao?: string;
  observacoes?: string;
  contratoKey?: string;
  fotos?: FotoReport[];
  stampText?: string;
  [key: string]: unknown;
}

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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// 7) NORMALIZAÇÃO DE RESULTADOS DE ANÁLISE
// ============================================================================

/**
 * Normaliza um resultado de análise completo
 */
export function normalizeAnalysisResult<T extends Record<string, unknown>>(
  result: T,
  contratoKey: string = "GLOBAL"
): T {
  const normalized = { ...result };

  // Campos de texto técnico para normalizar
  const textFields = ['service', 'disciplina', 'portico', 'ocr_text', 'observacoes', 'descricao'];
  
  textFields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      (normalized as Record<string, unknown>)[field] = normalizeTechnicalText(
        normalized[field] as string,
        contratoKey
      );
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

  if (typeof normalized.data === 'string') {
    const normalizedDate = normalizeDate(normalized.data as string);
    if (normalizedDate) {
      (normalized as Record<string, unknown>).data = normalizedDate;
    }
  }

  return normalized;
}

/**
 * Valida campos obrigatórios para exportação (não lança erro)
 */
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
export function prepareResultsForExport<T extends Record<string, unknown>>(
  results: T[],
  contratoKey: string = "GLOBAL"
): {
  normalized: T[];
  validation: ValidationResult;
} {
  // Normaliza todos os resultados
  const normalized = results.map(r => normalizeAnalysisResult(r, contratoKey));

  // Valida
  const validation = validateForExport(normalized as unknown as NormalizedResult[]);

  return { normalized, validation };
}

// ============================================================================
// 8) CARIMBO PARA PDF
// ============================================================================

/**
 * Gera texto de carimbo para PDF
 */
export function generateStampText(version: string = "1.0"): string {
  return `Documento gerado automaticamente • Versão ${version} • Emissão: ${new Date().toLocaleString("pt-BR")}`;
}

// ============================================================================
// 9) PREPARAÇÃO COMPLETA DE RELATÓRIO PARA EXPORTAÇÃO
// ============================================================================

export interface PrepareReportOptions {
  useAI?: boolean;
  aiLimit?: number;
  aiFn?: (params: { contratoKey: string; foto: FotoReport }) => Promise<string>;
  customDefaults?: Partial<ReportDefaults>;
  requiredFields?: RequiredFieldConfig[];
  skipValidation?: boolean;
}

/**
 * Função principal: prepara relatório completo para exportação
 * Aplica defaults, normaliza, valida e opcionalmente enriquece com IA
 */
export async function prepareReportForExport(
  report: Report,
  options: PrepareReportOptions = {}
): Promise<Report> {
  let r = { ...report };

  // 1) Aplica defaults
  r = applyDefaults(r, options.customDefaults);

  // 2) Normaliza campos principais
  const contratoKey = r.contratoKey || "GLOBAL";
  r.objetivo = normalizeTechnicalText(r.objetivo, contratoKey);
  r.servicoRealizado = normalizeTechnicalText(r.servicoRealizado, contratoKey);
  r.observacoes = cleanFieldValue(r.observacoes);

  // 3) Normaliza fotos
  r.fotos = (r.fotos || []).map((f) => ({
    ...f,
    descricao: normalizeTechnicalText(f.descricao, contratoKey),
    data: cleanFieldValue(f.data),
  }));

  // 4) Valida datas (lança erro se inválidas)
  if (!options.skipValidation) {
    validateDatesOrFail(r.fotos || []);
  }

  // 5) Valida campos obrigatórios
  if (!options.skipValidation) {
    validateRequiredFields(r as Record<string, unknown>, options.requiredFields);
  }

  // 6) (Opcional) IA para melhorar legendas
  if (options.useAI && typeof options.aiFn === "function") {
    r = await enrichCaptionsWithAI(r, {
      limit: options.aiLimit ?? 25,
      aiFn: options.aiFn,
    });
  }

  // 7) Gera carimbo
  r.stampText = generateStampText();

  return r;
}

/**
 * Enriquece legendas das fotos usando IA
 */
async function enrichCaptionsWithAI(
  report: Report,
  opts: {
    limit: number;
    aiFn: (params: { contratoKey: string; foto: FotoReport }) => Promise<string>;
  }
): Promise<Report> {
  const r = { ...report };
  let count = 0;

  const enrichedFotos = await Promise.all(
    (r.fotos || []).map(async (foto) => {
      if (count >= opts.limit) return foto;

      // Só sugere se a descrição estiver fraca
      const raw = cleanFieldValue(foto.descricao);
      if (!raw || raw.length < 6) return foto;

      count++;

      try {
        const suggested = await opts.aiFn({
          contratoKey: r.contratoKey || "GLOBAL",
          foto,
        });

        if (!suggested) return foto;

        return { ...foto, descricao: suggested };
      } catch (err) {
        console.warn("Erro ao sugerir legenda com IA:", err);
        return foto;
      }
    })
  );

  r.fotos = enrichedFotos;
  return r;
}

// ============================================================================
// 10) PROMPT PARA IA DE LEGENDAS
// ============================================================================

/**
 * Gera prompt para IA sugerir legenda de foto
 */
export function buildAICaptionPrompt(contratoKey: string, foto: FotoReport): string {
  return `
Você é um assistente técnico de obras rodoviárias.
Sua tarefa: gerar UMA descrição curta e objetiva para legenda de foto de relatório fotográfico.

Regras:
- Escreva em PT-BR.
- Use termos técnicos de obra.
- Sem floreio, sem opinião.
- Máximo 12 palavras.
- Se tiver um código (ex: FREE_FLOW_P10 / BSO_04), mantenha no final.

Contexto do contrato: ${contratoKey}
Texto bruto (OCR/nome de arquivo): ${foto.descricao || foto.filename || ""}

Retorne apenas a legenda final (uma linha).
`.trim();
}
