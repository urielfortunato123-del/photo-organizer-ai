// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const api = {
  // Process photos
  async processPhotos(files: File[], config: ProcessingConfig): Promise<ProcessingResult[]> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (config.default_portico) {
      formData.append('default_portico', config.default_portico);
    }
    formData.append('organize_by_date', String(config.organize_by_date));
    formData.append('ia_priority', String(config.ia_priority));

    const response = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get folder tree
  async getTree(): Promise<TreeNode[]> {
    const response = await fetch(`${API_BASE_URL}/tree`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Download organized photos as ZIP
  async downloadZip(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/download`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  },
};

// Mock data for development/demo
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
          {
            name: 'FORMA_BLOCO_B2',
            type: 'folder',
            children: [
              {
                name: '10_OUTUBRO',
                type: 'folder',
                children: [
                  { name: '14_10', type: 'folder', children: [] },
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
                  { name: '29_09', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'PORTICO_P_15',
    type: 'folder',
    children: [
      {
        name: 'TERRAPLENAGEM',
        type: 'folder',
        children: [
          {
            name: 'CORTE_ATERRO',
            type: 'folder',
            children: [
              {
                name: '11_NOVEMBRO',
                type: 'folder',
                children: [
                  { name: '05_11', type: 'folder', children: [] },
                  { name: '06_11', type: 'folder', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const generateMockResults = (files: File[], config: ProcessingConfig): ProcessingResult[] => {
  const services = [
    { disciplina: 'FUNDACAO', servico: 'CONCRETAGEM_BLOCO_B1' },
    { disciplina: 'FUNDACAO', servico: 'FORMA_BLOCO_B2' },
    { disciplina: 'DRENAGEM', servico: 'BUEIRO_TUBULAR' },
    { disciplina: 'DRENAGEM', servico: 'ESCADA_HIDRAULICA' },
    { disciplina: 'TERRAPLENAGEM', servico: 'CORTE_ATERRO' },
    { disciplina: 'PAVIMENTACAO', servico: 'BASE_SOLO_CIMENTO' },
  ];
  
  const porticos = ['P_10', 'P_15', 'P_20', 'P_25'];
  const methods: ('heuristica' | 'ia_fallback' | 'ia_forcada')[] = ['heuristica', 'ia_fallback', 'ia_forcada'];

  return files.map((file) => {
    const isSuccess = Math.random() > 0.05;
    const randomService = services[Math.floor(Math.random() * services.length)];
    const randomPortico = config.default_portico 
      ? config.default_portico.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : `P_${porticos[Math.floor(Math.random() * porticos.length)].split('_')[1]}`;
    
    const method = config.ia_priority 
      ? 'ia_forcada' 
      : (Math.random() > 0.7 ? 'ia_fallback' : 'heuristica');
    
    const confidence = method === 'heuristica' ? 0.85 + Math.random() * 0.15 
      : method === 'ia_forcada' ? 0.7 + Math.random() * 0.2 
      : 0.5 + Math.random() * 0.3;

    const month = Math.floor(Math.random() * 3) + 9; // Sep-Nov
    const day = Math.floor(Math.random() * 28) + 1;
    const monthName = MONTH_NAMES[month];
    const dayStr = `${day.toString().padStart(2, '0')}_${month.toString().padStart(2, '0')}`;

    if (!isSuccess) {
      return {
        filename: file.name,
        status: 'Erro: Falha ao processar imagem',
        method: 'heuristica',
        confidence: 0,
      };
    }

    const destPath = config.organize_by_date
      ? `organized_photos/PORTICO_${randomPortico}/${randomService.disciplina}/${randomService.servico}/${monthName}/${dayStr}`
      : `organized_photos/PORTICO_${randomPortico}/${randomService.disciplina}/${randomService.servico}`;

    return {
      filename: file.name,
      status: 'Sucesso',
      portico: `PORTICO_${randomPortico}`,
      disciplina: randomService.disciplina,
      service: randomService.servico,
      dest: destPath,
      method,
      confidence,
      data_detectada: config.organize_by_date ? `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/2024` : undefined,
      tecnico: method !== 'heuristica' 
        ? `Estrutura de ${randomService.servico.toLowerCase().replace(/_/g, ' ')} identificada. Dimensões compatíveis com projeto.`
        : undefined,
    };
  });
};
