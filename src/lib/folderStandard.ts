/* src/lib/folderStandard.ts
   Padronizador de estrutura de pastas (sem duplicação)
*/

export type FolderNode = {
  id: string;
  label: string; // label "bonita" para UI (ex: "PÓRTICO_09")
  key: string;   // key normalizada (ex: "portico_09")
  path: string;  // path absoluto a partir do root (ex: "BC-2/PÓRTICO_09/...")
  children: FolderNode[];
  files?: Array<{
    id: string;
    name: string;
    srcId?: string;      // id original da foto
    targetPath: string;  // caminho final dentro do ZIP
  }>;
};

export type PhotoClassified = {
  id: string;             // id único
  fileName: string;       // "WhatsApp Image 2025-09-09 at 15.43..."
  front?: string;         // "PÓRTICO_09" (serviço/frente)
  disciplina?: string;    // "MANUTENÇÃO"
  atividade?: string;     // "PINTURA_EXTERNA"
  tipo?: string;          // opcional (se você usa)
  date?: string | Date;   // "2025-08-08" ou Date
};

export type BuildOptions = {
  rootFolderName: string;     // "BC-2"
  photosBaseFolder?: string;  // "FOTOS" (opcional)
  includeTipoLevel?: boolean; // se quiser: .../ATIVIDADE/TIPO/...
  forceMonthLevel?: boolean;  // se quiser: .../MES_ANO/DIA_MES (não recomendo se você quer só 08_AGOSTO_2025)
  maxDepthSafety?: number;    // trava anti-loop
};

const uid = (() => {
  let i = 0;
  return () => `${Date.now().toString(36)}_${(i++).toString(36)}`;
})();

export function normalizeKey(input: string) {
  const s = (input ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return s;
}

export function prettyLabel(input: string) {
  const s = (input ?? "").trim();
  if (!s) return "";
  // mantém underscore e caixa alta (padrão seu)
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function safeLabel(label: string, fallback: string) {
  const p = prettyLabel(label);
  return p || fallback;
}

function safeKey(label: string, fallback: string) {
  const k = normalizeKey(label);
  return k || normalizeKey(fallback);
}

function isSelfOrParentCollision(parent: FolderNode, childKey: string) {
  // evita: PASTA -> PASTA
  return parent.key === childKey;
}

function getOrCreateChild(parent: FolderNode, label: string, guard: { depth: number; max: number }) {
  guard.depth++;
  if (guard.depth > guard.max) {
    // trava anti-loop (nunca mais explode árvore)
    return parent;
  }

  const lab = label?.trim();
  if (!lab) return parent;

  const childLabel = prettyLabel(lab);
  const childKey = normalizeKey(lab);

  if (!childLabel || !childKey) return parent;

  // ❌ não cria filho igual ao pai
  if (isSelfOrParentCollision(parent, childKey)) return parent;

  // ✅ já existe? retorna
  const existing = parent.children.find((c) => c.key === childKey);
  if (existing) return existing;

  // ✅ cria novo
  const node: FolderNode = {
    id: uid(),
    label: childLabel,
    key: childKey,
    path: parent.path ? `${parent.path}/${childLabel}` : childLabel,
    children: [],
    files: [],
  };
  parent.children.push(node);
  return node;
}

/* Datas */

const MONTHS_PT = [
  "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

function parseDateAny(d?: string | Date): Date | null {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d.getTime())) return d;

  const s = String(d).trim();
  if (!s) return null;

  // tenta YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    const dt = new Date(y, m, day);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // tenta DD/MM/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const day = Number(br[1]);
    const m = Number(br[2]) - 1;
    const y = Number(br[3]);
    const dt = new Date(y, m, day);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // fallback Date()
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatDateFolder(d?: string | Date) {
  const dt = parseDateAny(d);
  if (!dt) return ""; // se não tiver data, não cria nível de data
  const day = String(dt.getDate()).padStart(2, "0");
  const month = MONTHS_PT[dt.getMonth()] ?? "MES";
  const year = dt.getFullYear();
  return `${day}_${month}_${year}`;
}

function sanitizeFileName(name: string) {
  const base = (name ?? "arquivo").trim();
  // mantém extensão, remove chars ruins
  const cleaned = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "arquivo";
}

/* ✅ BUILD PADRÃO */

export type BuildResult = {
  tree: FolderNode;
  filesIndex: Array<{
    photoId: string;
    originalName: string;
    targetPath: string; // caminho final no ZIP
  }>;
};

export function buildStandardFolders(photos: PhotoClassified[], opts: BuildOptions): BuildResult {
  const {
    rootFolderName,
    photosBaseFolder,
    includeTipoLevel = false,
    forceMonthLevel = false,
    maxDepthSafety = 80,
  } = opts;

  const rootLabel = safeLabel(rootFolderName, "ROOT");
  const rootKey = safeKey(rootFolderName, "ROOT");

  const root: FolderNode = {
    id: uid(),
    label: rootLabel,
    key: rootKey,
    path: rootLabel,
    children: [],
    files: [],
  };

  // opcional: colocar tudo dentro de "FOTOS"
  let base = root;
  if (photosBaseFolder) {
    base = getOrCreateChild(root, photosBaseFolder, { depth: 0, max: maxDepthSafety });
  }

  const filesIndex: BuildResult["filesIndex"] = [];

  for (const p of photos) {
    const guard = { depth: 0, max: maxDepthSafety };

    // níveis fixos do seu padrão
    const front = safeLabel(p.front || "", "SEM_SERVICO");
    const disciplina = safeLabel(p.disciplina || "", "OUTROS");
    const atividade = safeLabel(p.atividade || "", "NAO_IDENTIFICADO");
    const tipo = safeLabel(p.tipo || "", "");

    // ✅ monta árvore (sem duplicar)
    let node = base;
    node = getOrCreateChild(node, front, guard);
    node = getOrCreateChild(node, disciplina, guard);
    node = getOrCreateChild(node, atividade, guard);

    if (includeTipoLevel && tipo) {
      node = getOrCreateChild(node, tipo, guard);
    }

    const dateFolder = formatDateFolder(p.date);
    if (forceMonthLevel && dateFolder) {
      // opcional: MES_ANO / DIA_MES
      const dt = parseDateAny(p.date)!;
      const mesAno = `${MONTHS_PT[dt.getMonth()]}_${dt.getFullYear()}`; // "AGOSTO_2025"
      const diaMes = `${String(dt.getDate()).padStart(2, "0")}_${MONTHS_PT[dt.getMonth()]}`; // "08_AGOSTO"
      node = getOrCreateChild(node, mesAno, guard);
      node = getOrCreateChild(node, diaMes, guard);
    } else if (dateFolder) {
      // ✅ seu padrão: "08_AGOSTO_2025"
      node = getOrCreateChild(node, dateFolder, guard);
    }

    // ✅ arquivo entra aqui (não cria subpasta)
    const finalName = sanitizeFileName(p.fileName);
    const targetPath = `${node.path}/${finalName}`;

    if (!node.files) node.files = [];
    node.files.push({
      id: uid(),
      name: finalName,
      srcId: p.id,
      targetPath,
    });

    filesIndex.push({
      photoId: p.id,
      originalName: p.fileName,
      targetPath,
    });
  }

  // ordena árvore bonitinha (UI)
  sortTree(root);

  return { tree: root, filesIndex };
}

function sortTree(node: FolderNode) {
  node.children.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  if (node.files) node.files.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  node.children.forEach(sortTree);
}

/* ✅ Util: transformar tree em lista (pra render) */

export type FlatTreeItem = {
  id: string;
  label: string;
  path: string;
  depth: number;
  type: "folder" | "file";
};

export function flattenTree(tree: FolderNode): FlatTreeItem[] {
  const out: FlatTreeItem[] = [];
  function walk(n: FolderNode, depth: number) {
    out.push({ id: n.id, label: n.label, path: n.path, depth, type: "folder" });
    for (const f of n.files ?? []) {
      out.push({ id: f.id, label: f.name, path: f.targetPath, depth: depth + 1, type: "file" });
    }
    for (const c of n.children) walk(c, depth + 1);
  }
  walk(tree, 0);
  return out;
}

/* ✅ Adapter: converte ProcessingResult[] para PhotoClassified[] */
export function adaptResultsToPhotos(results: Array<{
  filename: string;
  portico?: string;
  disciplina?: string;
  service?: string;
  atividade?: string;
  data_detectada?: string;
  exif_date?: string;
}>): PhotoClassified[] {
  return results.map((r, idx) => ({
    id: r.filename || `photo_${idx}`,
    fileName: r.filename || `photo_${idx}.jpg`,
    front: r.portico,
    disciplina: r.disciplina,
    atividade: r.atividade || r.service,
    date: r.exif_date || r.data_detectada,
  }));
}

/* ✅ Converte FolderNode para o formato DisplayTreeNode usado pelo EnhancedTreeView */
export interface DisplayTreeNode {
  name: string;
  type: 'folder' | 'photo';
  count: number;
  confidence?: number;
  children?: DisplayTreeNode[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photoData?: any; // Flexível para aceitar ProcessingResult
  path?: string;
  level: number;
}

export function folderNodeToDisplayTree(
  node: FolderNode, 
  resultsMap: Map<string, { confidence?: number; [key: string]: unknown }>,
  level: number = 0
): DisplayTreeNode {
  // Conta total de fotos neste nó e filhos
  const countPhotos = (n: FolderNode): number => {
    let count = n.files?.length || 0;
    for (const child of n.children) {
      count += countPhotos(child);
    }
    return count;
  };

  // Calcula confiança média
  const collectConfidences = (n: FolderNode): number[] => {
    const confs: number[] = [];
    for (const f of n.files || []) {
      const result = resultsMap.get(f.name);
      if (result?.confidence) confs.push(result.confidence as number);
    }
    for (const child of n.children) {
      confs.push(...collectConfidences(child));
    }
    return confs;
  };

  const confidences = collectConfidences(node);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : undefined;

  const children: DisplayTreeNode[] = [];

  // Adiciona subpastas
  for (const child of node.children) {
    children.push(folderNodeToDisplayTree(child, resultsMap, level + 1));
  }

  // Adiciona arquivos
  for (const file of node.files || []) {
    const result = resultsMap.get(file.name);
    children.push({
      name: file.name,
      type: 'photo',
      count: 1,
      confidence: result?.confidence as number | undefined,
      photoData: result ? { ...result, filename: file.name } : { filename: file.name },
      path: file.targetPath,
      level: level + 1,
    });
  }

  return {
    name: node.label,
    type: 'folder',
    count: countPhotos(node),
    confidence: avgConfidence,
    children: children.length > 0 ? children : undefined,
    path: node.path,
    level,
  };
}
