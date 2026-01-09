import { ProcessingResult } from '@/services/api';

interface SavedSession {
  version: string;
  savedAt: string;
  empresa: string;
  results: ProcessingResult[];
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
