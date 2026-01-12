import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DictionaryTerm {
  id: string;
  termo_errado: string;
  termo_correto: string;
  contrato_key: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewDictionaryTerm {
  termo_errado: string;
  termo_correto: string;
  contrato_key?: string;
}

export const useOCRDictionary = () => {
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar todos os termos
  const fetchTerms = useCallback(async (contratoKey?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('ocr_dictionary_terms')
        .select('*')
        .order('termo_errado', { ascending: true });
      
      if (contratoKey) {
        query = query.eq('contrato_key', contratoKey);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setTerms(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar termos';
      setError(message);
      console.error('Erro ao buscar termos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Adicionar novo termo
  const addTerm = useCallback(async (term: NewDictionaryTerm): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('ocr_dictionary_terms')
        .insert({
          termo_errado: term.termo_errado.toUpperCase().trim(),
          termo_correto: term.termo_correto.toUpperCase().trim(),
          contrato_key: term.contrato_key || 'GLOBAL',
        });
      
      if (insertError) {
        if (insertError.code === '23505') {
          toast({
            title: "Termo já existe",
            description: `O termo "${term.termo_errado}" já está cadastrado para este contrato.`,
            variant: "destructive",
          });
          return false;
        }
        throw insertError;
      }
      
      toast({
        title: "Termo adicionado",
        description: `"${term.termo_errado}" → "${term.termo_correto}"`,
      });
      
      await fetchTerms();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar termo';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchTerms, toast]);

  // Atualizar termo
  const updateTerm = useCallback(async (id: string, updates: Partial<DictionaryTerm>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('ocr_dictionary_terms')
        .update({
          ...updates,
          termo_errado: updates.termo_errado?.toUpperCase().trim(),
          termo_correto: updates.termo_correto?.toUpperCase().trim(),
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Termo atualizado",
        description: "Correção salva com sucesso.",
      });
      
      await fetchTerms();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar termo';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchTerms, toast]);

  // Deletar termo
  const deleteTerm = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('ocr_dictionary_terms')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "Termo removido",
        description: "Correção removida do dicionário.",
      });
      
      await fetchTerms();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover termo';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchTerms, toast]);

  // Toggle ativo/inativo
  const toggleActive = useCallback(async (id: string, ativo: boolean): Promise<boolean> => {
    return updateTerm(id, { ativo });
  }, [updateTerm]);

  // Buscar termos customizados para uso na normalização
  const getCustomDictionary = useCallback(async (): Promise<Record<string, Record<string, string>>> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ocr_dictionary_terms')
        .select('termo_errado, termo_correto, contrato_key')
        .eq('ativo', true);
      
      if (fetchError) throw fetchError;
      
      const dictionary: Record<string, Record<string, string>> = {};
      
      for (const term of data || []) {
        const key = term.contrato_key || 'GLOBAL';
        if (!dictionary[key]) {
          dictionary[key] = {};
        }
        dictionary[key][term.termo_errado] = term.termo_correto;
      }
      
      return dictionary;
    } catch (err) {
      console.error('Erro ao buscar dicionário customizado:', err);
      return {};
    }
  }, []);

  // Carregar termos ao montar
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  return {
    terms,
    loading,
    error,
    fetchTerms,
    addTerm,
    updateTerm,
    deleteTerm,
    toggleActive,
    getCustomDictionary,
  };
};
