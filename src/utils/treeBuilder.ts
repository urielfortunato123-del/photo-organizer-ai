/**
 * Tree Builder Centralizado
 * 
 * Responsável por criar estrutura de pastas de forma consistente,
 * evitando duplicações e garantindo normalização.
 */

import { ProcessingResult, MONTH_NAMES } from '@/services/api';

// ============================================================
// NORMALIZAÇÃO
// ============================================================

/**
 * Normaliza string para comparação e uso como chave de pasta
 * "Execução de Limpeza" → "EXECUCAO_DE_LIMPEZA"
 */
export const normalize = (str: string | undefined | null): string => {
  if (!str) return '';
  
  return str
    .normalize('NFD')                          // Decompõe acentos (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '')          // Remove diacríticos
    .toUpperCase()                             // Maiúsculas
    .trim()
    .replace(/[^A-Z0-9\s]/g, '')              // Remove caracteres especiais
    .replace(/\s+/g, '_')                      // Espaços → underscore
    .replace(/_+/g, '_')                       // Colapsa múltiplos underscores
    .replace(/^_|_$/g, '');                    // Remove underscores nas pontas
};

/**
 * Normaliza para comparação (lowercase, sem underscores)
 */
export const normalizeForComparison = (str: string | undefined | null): string => {
  return normalize(str).toLowerCase().replace(/_/g, '');
};

// ============================================================
// TREE NODE
// ============================================================

export interface TreeNode {
  key: string;       // Chave normalizada para lookup
  label: string;     // Label de exibição original
  children: Map<string, TreeNode>;
  photos: ProcessingResult[];
  level: number;
}

/**
 * Cria ou retorna nó existente no pai
 * Evita duplicação por usar chave normalizada
 */
export const getOrCreateNode = (
  parent: Map<string, TreeNode>,
  key: string,
  label: string,
  level: number
): TreeNode => {
  const normalizedKey = normalize(key);
  
  if (parent.has(normalizedKey)) {
    return parent.get(normalizedKey)!;
  }
  
  const node: TreeNode = {
    key: normalizedKey,
    label: label || normalizedKey,
    children: new Map(),
    photos: [],
    level,
  };
  
  parent.set(normalizedKey, node);
  return node;
};

// ============================================================
// DATE PARSING
// ============================================================

interface ParsedDate {
  year: string;
  month: number;
  day: string;
  valid: boolean;
}

/**
 * Parseia data de diferentes formatos
 * Retorna valid=false se a data for inválida
 */
export const parseDate = (dataStr: string | null | undefined): ParsedDate => {
  const invalid: ParsedDate = { year: '', month: 0, day: '', valid: false };
  
  if (!dataStr) return invalid;
  
  const raw = String(dataStr).trim();
  if (!raw) return invalid;
  
  let year = '';
  let month = 0;
  let day = '';
  
  // DD/MM/YYYY ou D/M/YYYY
  let m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    day = String(parseInt(m[1], 10)).padStart(2, '0');
    month = parseInt(m[2], 10);
    year = m[3];
  } else {
    // YYYY-MM-DD ou YYYY/MM/DD
    m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      year = m[1];
      month = parseInt(m[2], 10);
      day = String(parseInt(m[3], 10)).padStart(2, '0');
    } else {
      // Fallback: tentar parse de Date
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        year = String(d.getFullYear());
        month = d.getMonth() + 1;
        day = String(d.getDate()).padStart(2, '0');
      }
    }
  }
  
  // Validação: mês entre 1-12, ano razoável
  const yearNum = parseInt(year, 10);
  if (month < 1 || month > 12 || yearNum < 2000 || yearNum > 2100) {
    return invalid;
  }
  
  return { year, month, day, valid: true };
};

/**
 * Formata data para nome de pasta
 */
export const formatDateFolder = (parsed: ParsedDate): { monthFolder: string; dayFolder: string } | null => {
  if (!parsed.valid) return null;
  
  const monthName = MONTH_NAMES[parsed.month] || `${String(parsed.month).padStart(2, '0')}_MES`;
  return {
    monthFolder: `${monthName}_${parsed.year}`,
    dayFolder: `${parsed.day}_${String(parsed.month).padStart(2, '0')}`,
  };
};

// ============================================================
// EXTRAÇÃO DE CATEGORIA E ATIVIDADE
// ============================================================

/**
 * Extrai categoria do serviço
 * "SEGURANCA - ALAMBRADO" → "SEGURANCA"
 * "TERRAPLENAGEM CORTE" → "TERRAPLENAGEM"
 */
export const extractCategoria = (servico: string | undefined | null): string => {
  if (!servico) return 'GERAL';
  
  const normalized = normalize(servico);
  
  // Se tem separador, pega a primeira parte
  const separators = [' - ', '_-_', ' – '];
  for (const sep of separators) {
    const idx = normalized.indexOf(sep.replace(/ /g, '_'));
    if (idx > 0) {
      const part = normalized.substring(0, idx).trim();
      if (part.length >= 3) return part;
    }
  }
  
  // Pega primeira palavra se tiver mais de uma
  const parts = normalized.split('_').filter(Boolean);
  if (parts.length > 1 && parts[0].length >= 3) {
    return parts[0];
  }
  
  return normalized || 'GERAL';
};

/**
 * Extrai atividade do serviço (parte depois do separador)
 * "SEGURANCA - ALAMBRADO E FECHADURA" → "ALAMBRADO_E_FECHADURA"
 */
export const extractAtividade = (servico: string | undefined | null): string => {
  if (!servico) return 'REGISTRO';
  
  const normalized = normalize(servico);
  
  // Se tem separador, pega a segunda parte
  const separators = [' - ', '_-_', ' – ', '-'];
  for (const sep of separators) {
    const sepNorm = sep.replace(/ /g, '_');
    const idx = normalized.indexOf(sepNorm);
    if (idx > 0) {
      const part = normalized.substring(idx + sepNorm.length).trim().replace(/^_+|_+$/g, '');
      if (part.length >= 3) return part;
    }
  }
  
  // Se não tem separador, usa o serviço todo (mas limita tamanho)
  if (normalized.length > 30) {
    return normalized.substring(0, 30);
  }
  
  return normalized || 'REGISTRO';
};

// ============================================================
// TREE BUILDER PRINCIPAL
// ============================================================

export interface TreeBuildOptions {
  organizeByDate: boolean;
}

/**
 * Constrói árvore de pastas a partir dos resultados
 * 
 * Estrutura:
 *   PORTICO/
 *     CATEGORIA/
 *       ATIVIDADE/
 *         [MM_MES_ANO/]    ← só se data válida
 *           [DD_MM/]       ← só se data válida
 *             foto.jpg
 */
export const buildTree = (
  results: ProcessingResult[],
  options: TreeBuildOptions = { organizeByDate: true }
): Map<string, TreeNode> => {
  const root = new Map<string, TreeNode>();
  
  for (const result of results) {
    // 1. PÓRTICO (nível 0)
    const porticoLabel = result.portico?.trim() || 'NAO_IDENTIFICADO';
    const porticoNode = getOrCreateNode(root, porticoLabel, porticoLabel, 0);
    
    // 2. CATEGORIA (nível 1)
    // Prioriza disciplina se válida, senão extrai do serviço
    let categoriaLabel = 'GERAL';
    if (result.disciplina && normalize(result.disciplina) !== 'OUTROS' && result.disciplina.trim()) {
      categoriaLabel = result.disciplina.trim();
    } else {
      categoriaLabel = extractCategoria(result.service);
    }
    const categoriaNode = getOrCreateNode(porticoNode.children, categoriaLabel, categoriaLabel, 1);
    
    // 3. ATIVIDADE (nível 2)
    let atividadeLabel = extractAtividade(result.service);
    
    // Evita duplicação: se atividade == categoria, usa fallback
    if (normalizeForComparison(atividadeLabel) === normalizeForComparison(categoriaLabel)) {
      atividadeLabel = result.atividade?.trim() || 'REGISTRO';
    }
    const atividadeNode = getOrCreateNode(categoriaNode.children, atividadeLabel, atividadeLabel, 2);
    
    // 4. DATA (níveis 3 e 4) - SÓ SE VÁLIDA
    let leafNode: TreeNode = atividadeNode;
    
    if (options.organizeByDate) {
      const dateStr = result.exif_date || result.data_detectada;
      const parsed = parseDate(dateStr);
      const dateFolder = formatDateFolder(parsed);
      
      if (dateFolder) {
        // Mês (nível 3)
        const monthNode = getOrCreateNode(atividadeNode.children, dateFolder.monthFolder, dateFolder.monthFolder, 3);
        // Dia (nível 4)
        const dayNode = getOrCreateNode(monthNode.children, dateFolder.dayFolder, dateFolder.dayFolder, 4);
        leafNode = dayNode;
      }
    }
    
    // 5. Adiciona foto no nó folha
    leafNode.photos.push(result);
  }
  
  return root;
};

/**
 * Constrói path de destino para um único resultado
 * Usa a mesma lógica do buildTree, mas retorna string
 */
export const buildDestPath = (
  result: ProcessingResult,
  organizeByDate: boolean = true
): string => {
  const parts: string[] = [];
  
  // 1. PÓRTICO
  parts.push(normalize(result.portico) || 'NAO_IDENTIFICADO');
  
  // 2. CATEGORIA
  let categoria = 'GERAL';
  if (result.disciplina && normalize(result.disciplina) !== 'OUTROS' && result.disciplina.trim()) {
    categoria = normalize(result.disciplina);
  } else {
    categoria = extractCategoria(result.service);
  }
  parts.push(categoria);
  
  // 3. ATIVIDADE
  let atividade = extractAtividade(result.service);
  if (normalizeForComparison(atividade) === normalizeForComparison(categoria)) {
    atividade = normalize(result.atividade) || 'REGISTRO';
  }
  parts.push(atividade);
  
  // 4. DATA (só se válida)
  if (organizeByDate) {
    const dateStr = result.exif_date || result.data_detectada;
    const parsed = parseDate(dateStr);
    const dateFolder = formatDateFolder(parsed);
    
    if (dateFolder) {
      parts.push(dateFolder.monthFolder);
      parts.push(dateFolder.dayFolder);
    }
  }
  
  return parts.join('/');
};

// ============================================================
// CONVERSÃO PARA FORMATO DO COMPONENTE
// ============================================================

export interface DisplayTreeNode {
  name: string;
  type: 'folder' | 'photo';
  count: number;
  confidence?: number;
  children?: DisplayTreeNode[];
  photoData?: ProcessingResult;
  path?: string;
  level: number;
}

/**
 * Converte TreeNode para DisplayTreeNode (usado pelo EnhancedTreeView)
 */
export const treeToDisplayNodes = (
  tree: Map<string, TreeNode>,
  basePath: string = ''
): DisplayTreeNode[] => {
  const nodes: DisplayTreeNode[] = [];
  
  for (const [, node] of tree) {
    const path = basePath ? `${basePath}/${node.label}` : node.label;
    
    // Calcula contagem total (fotos diretas + filhos)
    let totalPhotos = node.photos.length;
    const countChildren = (n: TreeNode): number => {
      let count = n.photos.length;
      for (const [, child] of n.children) {
        count += countChildren(child);
      }
      return count;
    };
    totalPhotos = countChildren(node);
    
    // Calcula confiança média
    const allPhotos: ProcessingResult[] = [];
    const collectPhotos = (n: TreeNode) => {
      allPhotos.push(...n.photos);
      for (const [, child] of n.children) {
        collectPhotos(child);
      }
    };
    collectPhotos(node);
    
    const avgConfidence = allPhotos.length > 0
      ? allPhotos.reduce((sum, p) => sum + (p.confidence || 0), 0) / allPhotos.length
      : undefined;
    
    // Converte filhos recursivamente
    const childNodes: DisplayTreeNode[] = [];
    
    // Primeiro adiciona subpastas
    if (node.children.size > 0) {
      childNodes.push(...treeToDisplayNodes(node.children, path));
    }
    
    // Depois adiciona fotos diretas
    for (const photo of node.photos) {
      childNodes.push({
        name: photo.filename,
        type: 'photo',
        count: 1,
        confidence: photo.confidence,
        photoData: photo,
        path: `${path}/${photo.filename}`,
        level: node.level + 1,
      });
    }
    
    nodes.push({
      name: node.label,
      type: 'folder',
      count: totalPhotos,
      confidence: avgConfidence,
      children: childNodes.length > 0 ? childNodes : undefined,
      path,
      level: node.level,
    });
  }
  
  // Ordena por nome
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  
  return nodes;
};
