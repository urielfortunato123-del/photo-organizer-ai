import { supabase } from '@/integrations/supabase/client';

export interface ProcessingConfig {
  default_portico?: string;
  organize_by_date: boolean;
  ia_priority: boolean;
}

export interface ProcessingResult {
  filename: string;
  service?: string;
  portico?: string;
  disciplina?: string;
  dest?: string;
  status: string;
  tecnico?: string;
  method?: 'heuristica' | 'ia_fallback' | 'ia_forcada';
  confidence?: number;
  data_detectada?: string;
  ocr_text?: string;
}

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  path?: string;
}

// Month names in PT-BR
export const MONTH_NAMES: Record<number, string> = {
  1: '01_JANEIRO',
  2: '02_FEVEREIRO',
  3: '03_MARCO',
  4: '04_ABRIL',
  5: '05_MAIO',
  6: '06_JUNHO',
  7: '07_JULHO',
  8: '08_AGOSTO',
  9: '09_SETEMBRO',
  10: '10_OUTUBRO',
  11: '11_NOVEMBRO',
  12: '12_DEZEMBRO',
};

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Build destination path based on classification
const buildDestPath = (
  portico: string,
  disciplina: string,
  servico: string,
  dataStr: string | null,
  organizeByDate: boolean
): string => {
  let path = `organized_photos/${portico}/${disciplina}/${servico}`;
  
  if (organizeByDate && dataStr) {
    // Parse date DD/MM/YYYY
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const day = match[1];
      const month = parseInt(match[2], 10);
      const monthName = MONTH_NAMES[month] || `${month.toString().padStart(2, '0')}_MES`;
      const dayMonth = `${day}_${month.toString().padStart(2, '0')}`;
      path += `/${monthName}/${dayMonth}`;
    }
  }
  
  return path;
};

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Analyze image with AI (with retry logic)
  async analyzeImage(file: File, defaultPortico?: string, maxRetries: number = 3): Promise<ProcessingResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const imageBase64 = await fileToBase64(file);
        
        const { data, error } = await supabase.functions.invoke('analyze-image', {
          body: {
            imageBase64,
            filename: file.name,
            defaultPortico,
          },
        });

        if (error) {
          console.error('Edge function error:', error);
          
          // Check if rate limited and retry
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            if (attempt < maxRetries - 1) {
              const waitTime = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s
              console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
              await delay(waitTime);
              continue;
            }
          }
          
          throw new Error(error.message || 'Failed to analyze image');
        }

        return {
          filename: file.name,
          status: 'Sucesso',
          portico: data.portico,
          disciplina: data.disciplina,
          service: data.servico,
          data_detectada: data.data,
          tecnico: data.analise_tecnica,
          confidence: data.confidence,
          method: 'ia_forcada',
          ocr_text: data.ocr_text,
          dest: buildDestPath(
            data.portico,
            data.disciplina,
            data.servico,
            data.data,
            true
          ),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        // If rate limit error and more retries available, wait and retry
        if (lastError.message?.includes('429') || lastError.message?.includes('rate limit')) {
          if (attempt < maxRetries - 1) {
            const waitTime = 3000 * Math.pow(2, attempt);
            await delay(waitTime);
            continue;
          }
        }
      }
    }
    
    return {
      filename: file.name,
      status: `Erro: ${lastError?.message || 'Falha na análise'}`,
      method: 'ia_forcada',
      confidence: 0,
    };
  },

  // Process multiple photos
  async processPhotos(
    files: File[], 
    config: ProcessingConfig,
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length, file.name);
      
      try {
        const result = await this.analyzeImage(file, config.default_portico);
        
        // Update dest based on organize_by_date setting
        if (result.status === 'Sucesso' && result.portico && result.disciplina && result.service) {
          result.dest = buildDestPath(
            result.portico,
            result.disciplina,
            result.service,
            result.data_detectada || null,
            config.organize_by_date
          );
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          filename: file.name,
          status: `Erro: ${error instanceof Error ? error.message : 'Unknown error'}`,
          method: 'ia_forcada',
          confidence: 0,
        });
      }
    }
    
    return results;
  },

  // Health check - always returns true now that we have Cloud
  async healthCheck(): Promise<boolean> {
    return true;
  },
};

// Mock tree data for visualization (since we don't have actual file storage)
export const mockTreeData: TreeNode[] = [
  {
    name: 'PORTICO_P_10',
    type: 'folder',
    children: [
      {
        name: 'FUNDACAO',
        type: 'folder',
        children: [
          {
            name: 'CONCRETAGEM_BLOCO_B1',
            type: 'folder',
            children: [
              {
                name: '10_OUTUBRO',
                type: 'folder',
                children: [
                  { name: '12_10', type: 'folder', children: [] },
                  { name: '13_10', type: 'folder', children: [] },
                  { name: '15_10', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'DRENAGEM',
        type: 'folder',
        children: [
          {
            name: 'BUEIRO_TUBULAR',
            type: 'folder',
            children: [
              {
                name: '09_SETEMBRO',
                type: 'folder',
                children: [
                  { name: '28_09', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// Build tree from results
export const buildTreeFromResults = (results: ProcessingResult[]): TreeNode[] => {
  const tree: TreeNode[] = [];
  const successResults = results.filter(r => r.status === 'Sucesso' && r.dest);
  
  for (const result of successResults) {
    if (!result.dest) continue;
    
    const parts = result.dest.split('/').filter(p => p && p !== 'organized_photos');
    let currentLevel = tree;
    
    for (const part of parts) {
      let existing = currentLevel.find(n => n.name === part);
      if (!existing) {
        existing = { name: part, type: 'folder', children: [] };
        currentLevel.push(existing);
      }
      currentLevel = existing.children || [];
    }
  }
  
  return tree;
};
