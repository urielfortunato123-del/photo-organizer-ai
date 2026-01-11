import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AprendizadoData {
  textoOCR: string;
  identificacaoErrada: string;
  identificacaoCorreta: string;
  obraId?: string;
}

interface EstatisticasAprendizado {
  totalObras: number;
  totalVariacoes: number;
  totalIdentificacoes: number;
  ultimaAtualizacao: string | null;
}

export function useAprendizadoOCR() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasAprendizado>({
    totalObras: 0,
    totalVariacoes: 0,
    totalIdentificacoes: 0,
    ultimaAtualizacao: null
  });

  // Carrega estatísticas do banco de conhecimento
  const carregarEstatisticas = useCallback(async () => {
    try {
      const { data: obras } = await supabase
        .from('obras_conhecimento')
        .select('variacoes, vezes_identificado, updated_at')
        .eq('ativo', true);

      if (obras) {
        const totalVariacoes = obras.reduce((acc, o) => acc + (o.variacoes?.length || 0), 0);
        const totalIdentificacoes = obras.reduce((acc, o) => acc + (o.vezes_identificado || 0), 0);
        const ultimaAtualizacao = obras.length > 0 
          ? obras.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
          : null;

        setEstatisticas({
          totalObras: obras.length,
          totalVariacoes,
          totalIdentificacoes,
          ultimaAtualizacao
        });
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);
  // Salvar correção para aprendizado
  const salvarCorrecao = useCallback(async (data: AprendizadoData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('Usuário não autenticado, correção não salva');
        return false;
      }

      // Verifica se já existe essa correção
      const { data: existente } = await supabase
        .from('obras_aprendizado')
        .select('id')
        .eq('texto_ocr', data.textoOCR)
        .eq('identificacao_correta', data.identificacaoCorreta)
        .maybeSingle();

      if (existente) {
        console.log('Correção já existe no banco');
        return true;
      }

      // Salva nova correção
      const { error } = await supabase
        .from('obras_aprendizado')
        .insert({
          user_id: user.id,
          texto_ocr: data.textoOCR,
          identificacao_errada: data.identificacaoErrada,
          identificacao_correta: data.identificacaoCorreta,
          obra_id: data.obraId || null,
          aplicado: false
        });

      if (error) {
        console.error('Erro ao salvar aprendizado:', error);
        return false;
      }

      console.log('Correção salva para aprendizado:', data.identificacaoCorreta);
      
      toast.success('🧠 Aprendizado salvo!', {
        description: `Correção "${data.identificacaoCorreta}" será usada em futuras identificações.`
      });
      
      // Tenta atualizar/criar entrada no conhecimento
      await atualizarConhecimento(data);
      
      return true;
    } catch (err) {
      console.error('Erro no aprendizado:', err);
      return false;
    }
  }, []);

  // Atualizar banco de conhecimento com a correção
  const atualizarConhecimento = async (data: AprendizadoData) => {
    try {
      // Busca obra existente com código similar
      const { data: obraExistente } = await supabase
        .from('obras_conhecimento')
        .select('*')
        .eq('codigo_normalizado', data.identificacaoCorreta)
        .maybeSingle();

      if (obraExistente) {
        // Adiciona variação se não existir
        const variacoes = obraExistente.variacoes || [];
        const textoNormalizado = data.textoOCR.toLowerCase().trim();
        
        if (!variacoes.some((v: string) => v.toLowerCase() === textoNormalizado)) {
          const novasVariacoes = [...variacoes, textoNormalizado];
          
          await supabase
            .from('obras_conhecimento')
            .update({ 
              variacoes: novasVariacoes,
              vezes_identificado: (obraExistente.vezes_identificado || 0) + 1
            })
            .eq('id', obraExistente.id);
          
          console.log(`Variação adicionada: "${textoNormalizado}" → ${data.identificacaoCorreta}`);
        }
      } else {
        // Cria nova entrada de conhecimento
        const { error } = await supabase
          .from('obras_conhecimento')
          .insert({
            codigo_normalizado: data.identificacaoCorreta,
            nome_exibicao: data.identificacaoCorreta.replace(/_/g, ' '),
            tipo: 'aprendido',
            variacoes: [data.textoOCR.toLowerCase().trim()],
            origem: 'aprendizado',
            confianca: 80,
            vezes_identificado: 1
          });

        if (!error) {
          console.log(`Nova obra criada via aprendizado: ${data.identificacaoCorreta}`);
          toast.success('Sistema aprendeu nova identificação!', {
            description: `"${data.textoOCR}" → ${data.identificacaoCorreta}`
          });
        }
      }

      // Marca aprendizado como aplicado
      await supabase
        .from('obras_aprendizado')
        .update({ aplicado: true })
        .eq('texto_ocr', data.textoOCR)
        .eq('identificacao_correta', data.identificacaoCorreta);

    } catch (err) {
      console.error('Erro ao atualizar conhecimento:', err);
    }
  };

  // Buscar sugestões baseadas em aprendizados anteriores
  const buscarSugestoes = useCallback(async (textoOCR: string): Promise<string[]> => {
    if (!textoOCR || textoOCR.length < 3) return [];

    try {
      const textoLower = textoOCR.toLowerCase();
      
      // Busca nas obras conhecidas
      const { data: obras } = await supabase
        .from('obras_conhecimento')
        .select('codigo_normalizado, variacoes')
        .eq('ativo', true);

      if (!obras) return [];

      const sugestoes: string[] = [];
      
      for (const obra of obras) {
        const variacoes = obra.variacoes || [];
        for (const variacao of variacoes) {
          if (textoLower.includes(variacao.toLowerCase()) || 
              variacao.toLowerCase().includes(textoLower)) {
            if (!sugestoes.includes(obra.codigo_normalizado)) {
              sugestoes.push(obra.codigo_normalizado);
            }
          }
        }
      }

      return sugestoes.slice(0, 5);
    } catch {
      return [];
    }
  }, []);

  return {
    salvarCorrecao,
    buscarSugestoes,
    estatisticas,
    carregarEstatisticas
  };
}
