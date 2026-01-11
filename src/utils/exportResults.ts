import JSZip from 'jszip';
import { ProcessingResult } from '@/services/api';

interface SavedSession {
  version: string;
  savedAt: string;
  empresa: string;
  results: ProcessingResult[];
}

interface FullBackup {
  version: string;
  savedAt: string;
  empresa: string;
  defaultPortico: string;
  organizeByDate: boolean;
  economicMode: boolean;
  useLocalOCR: boolean;
  results: ProcessingResult[];
  fileCount: number;
}

// Exporta os resultados para um arquivo JSON
export function exportResultsJSON(results: ProcessingResult[], empresa: string): void {
  const session: SavedSession = {
    version: '1.0',
    savedAt: new Date().toISOString(),
    empresa,
    results,
  };

  const content = JSON.stringify(session, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `obraphoto_sessao_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporta backup completo (resultados + config + arquivos) como ZIP
export async function exportFullBackup(
  results: ProcessingResult[],
  files: File[],
  config: {
    empresa: string;
    defaultPortico: string;
    organizeByDate: boolean;
    economicMode: boolean;
    useLocalOCR: boolean;
  },
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];

  // Create backup metadata
  const backup: FullBackup = {
    version: '2.0',
    savedAt: new Date().toISOString(),
    empresa: config.empresa,
    defaultPortico: config.defaultPortico,
    organizeByDate: config.organizeByDate,
    economicMode: config.economicMode,
    useLocalOCR: config.useLocalOCR,
    results,
    fileCount: files.length,
  };

  // Add metadata JSON
  zip.file('backup.json', JSON.stringify(backup, null, 2));

  // Add original files
  const photosFolder = zip.folder('fotos');
  if (photosFolder) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        photosFolder.file(file.name, arrayBuffer);
        onProgress?.(i + 1, files.length);
      } catch (err) {
        console.warn(`Erro ao adicionar ${file.name} ao backup:`, err);
      }
    }
  }

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `obraphoto_backup_completo_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Importa backup completo de um ZIP
export async function importFullBackup(
  file: File,
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<{
  results: ProcessingResult[];
  files: File[];
  config: {
    empresa: string;
    defaultPortico: string;
    organizeByDate: boolean;
    economicMode: boolean;
    useLocalOCR: boolean;
  };
} | null> {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Read backup metadata
    const backupFile = zip.file('backup.json');
    if (!backupFile) {
      throw new Error('Arquivo backup.json não encontrado no ZIP');
    }

    const backupText = await backupFile.async('text');
    const backup: FullBackup = JSON.parse(backupText);

    if (!backup.version || !backup.results) {
      throw new Error('Formato de backup inválido');
    }

    // Extract files
    const extractedFiles: File[] = [];
    const photosFolder = zip.folder('fotos');
    
    if (photosFolder) {
      const fileEntries = Object.entries(photosFolder.files).filter(
        ([path, zipEntry]) => !zipEntry.dir && path.startsWith('fotos/')
      );

      for (let i = 0; i < fileEntries.length; i++) {
        const [path, zipEntry] = fileEntries[i];
        const filename = path.replace('fotos/', '');
        
        try {
          const blob = await zipEntry.async('blob');
          const extractedFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          extractedFiles.push(extractedFile);
          onProgress?.('Extraindo fotos', i + 1, fileEntries.length);
        } catch (err) {
          console.warn(`Erro ao extrair ${filename}:`, err);
        }
      }
    }

    return {
      results: backup.results,
      files: extractedFiles,
      config: {
        empresa: backup.empresa || 'EMPRESA',
        defaultPortico: backup.defaultPortico || '',
        organizeByDate: backup.organizeByDate ?? true,
        economicMode: backup.economicMode ?? false,
        useLocalOCR: backup.useLocalOCR ?? true,
      },
    };
  } catch (error) {
    console.error('Erro ao importar backup:', error);
    return null;
  }
}

// Importa os resultados de um arquivo JSON
export async function importResultsJSON(file: File): Promise<{ results: ProcessingResult[]; empresa: string } | null> {
  try {
    const text = await file.text();
    const session: SavedSession = JSON.parse(text);
    
    if (!session.version || !session.results || !Array.isArray(session.results)) {
      throw new Error('Formato de arquivo inválido');
    }

    return {
      results: session.results,
      empresa: session.empresa || 'EMPRESA',
    };
  } catch (error) {
    console.error('Erro ao importar arquivo:', error);
    return null;
  }
}

// Mescla resultados importados com resultados existentes (por filename)
export function mergeResults(existing: ProcessingResult[], imported: ProcessingResult[]): ProcessingResult[] {
  const merged = [...existing];
  const existingNames = new Set(existing.map(r => r.filename));

  for (const result of imported) {
    if (!existingNames.has(result.filename)) {
      merged.push(result);
    } else {
      // Atualiza o resultado existente com os dados importados
      const index = merged.findIndex(r => r.filename === result.filename);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...result };
      }
    }
  }

  return merged;
}
