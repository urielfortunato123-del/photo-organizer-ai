import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export interface BMItem {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  valorUnitario: number;
  keywords: string[]; // Palavras-chave para matching com atividades
}

export interface BMData {
  items: BMItem[];
  nome: string;
  dataImportacao: Date;
}

// Palavras-chave para matching automático
const extractKeywords = (descricao: string): string[] => {
  const text = descricao.toUpperCase();
  const words = text.split(/[\s,;./\-()]+/).filter(w => w.length > 3);
  return [...new Set(words)];
};

// Parseia arquivo CSV para extrair dados BM
const parseCSV = (content: string): BMItem[] => {
  const lines = content.split('\n').filter(line => line.trim());
  const items: BMItem[] = [];
  
  // Pula header
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[;,\t]/);
    if (cells.length >= 4) {
      const codigo = cells[0]?.trim() || '';
      const descricao = cells[1]?.trim() || '';
      const unidade = cells[2]?.trim() || '';
      const valorStr = cells[3]?.trim().replace(',', '.').replace(/[^\d.-]/g, '') || '0';
      const valorUnitario = parseFloat(valorStr) || 0;
      
      if (codigo && descricao && valorUnitario > 0) {
        items.push({
          id: `bm_${i}`,
          codigo,
          descricao,
          unidade,
          valorUnitario,
          keywords: extractKeywords(descricao),
        });
      }
    }
  }
  
  return items;
};

// Parseia arquivo Excel para extrair dados BM
export const parseExcel = async (file: File): Promise<BMItem[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  
  const items: BMItem[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const keys = Object.keys(row);
    
    // Tenta encontrar as colunas por nome ou posição
    let codigo = '';
    let descricao = '';
    let unidade = '';
    let valorUnitario = 0;
    
    for (const key of keys) {
      const keyLower = key.toLowerCase();
      const value = String(row[key] ?? '').trim();
      
      if (keyLower.includes('codigo') || keyLower.includes('código') || keyLower === 'cod') {
        codigo = value;
      } else if (keyLower.includes('descri') || keyLower.includes('item') || keyLower.includes('serviço')) {
        descricao = value;
      } else if (keyLower.includes('unid') || keyLower === 'un' || keyLower === 'und') {
        unidade = value;
      } else if (keyLower.includes('valor') || keyLower.includes('preco') || keyLower.includes('preço') || keyLower.includes('unit')) {
        const valorStr = value.replace(',', '.').replace(/[^\d.-]/g, '');
        valorUnitario = parseFloat(valorStr) || 0;
      }
    }
    
    // Fallback: usa posição se não encontrou por nome
    if (!codigo && keys.length >= 1) codigo = String(row[keys[0]] ?? '').trim();
    if (!descricao && keys.length >= 2) descricao = String(row[keys[1]] ?? '').trim();
    if (!unidade && keys.length >= 3) unidade = String(row[keys[2]] ?? '').trim();
    if (!valorUnitario && keys.length >= 4) {
      const valorStr = String(row[keys[3]] ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
      valorUnitario = parseFloat(valorStr) || 0;
    }
    
    if (codigo && descricao) {
      items.push({
        id: `bm_${i}`,
        codigo,
        descricao,
        unidade,
        valorUnitario,
        keywords: extractKeywords(descricao),
      });
    }
  }
  
  return items;
};
// Tenta encontrar o melhor match para uma atividade
export const findBestMatch = (atividade: string, items: BMItem[]): BMItem | null => {
  if (!atividade || !items.length) return null;
  
  const atividadeUpper = atividade.toUpperCase();
  let bestMatch: BMItem | null = null;
  let bestScore = 0;
  
  for (const item of items) {
    let score = 0;
    
    // Match exato do código
    if (atividadeUpper.includes(item.codigo.toUpperCase())) {
      score += 10;
    }
    
    // Match de palavras-chave
    for (const keyword of item.keywords) {
      if (atividadeUpper.includes(keyword)) {
        score += 2;
      }
    }
    
    // Match parcial da descrição
    const descWords = item.descricao.toUpperCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && atividadeUpper.includes(word)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  
  // Só retorna se tiver um score mínimo
  return bestScore >= 3 ? bestMatch : null;
};

export function useBMImport() {
  const { toast } = useToast();
  const [bmData, setBMData] = useState<BMData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const importBM = useCallback(async (file: File) => {
    setIsLoading(true);
    
    try {
      let items: BMItem[];
      
      // Usa xlsx para arquivos Excel
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        items = await parseExcel(file);
      } else {
        const content = await file.text();
        items = parseCSV(content);
      }
      
      if (items.length === 0) {
        toast({
          title: "Erro ao importar",
          description: "Nenhum item válido encontrado. Verifique o formato: Código;Descrição;Unidade;Valor",
          variant: "destructive",
        });
        return null;
      }
      
      const data: BMData = {
        items,
        nome: file.name,
        dataImportacao: new Date(),
      };
      
      setBMData(data);
      
      // Salva no localStorage para persistência
      localStorage.setItem('obraphoto_bm_data', JSON.stringify({
        ...data,
        dataImportacao: data.dataImportacao.toISOString(),
      }));
      
      toast({
        title: "BM importado com sucesso",
        description: `${items.length} itens carregados de ${file.name}`,
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao importar BM:', error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível ler o arquivo. Verifique o formato.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadSavedBM = useCallback(() => {
    try {
      const saved = localStorage.getItem('obraphoto_bm_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.dataImportacao = new Date(parsed.dataImportacao);
        setBMData(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Erro ao carregar BM salvo:', error);
    }
    return null;
  }, []);

  const clearBM = useCallback(() => {
    setBMData(null);
    localStorage.removeItem('obraphoto_bm_data');
    toast({
      title: "BM removido",
      description: "Tabela de preços foi limpa",
    });
  }, [toast]);

  return {
    bmData,
    isLoading,
    importBM,
    loadSavedBM,
    clearBM,
    findBestMatch: (atividade: string) => findBestMatch(atividade, bmData?.items || []),
  };
}
