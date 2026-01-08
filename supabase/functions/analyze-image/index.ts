import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429 && attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

interface PreProcessedOCR {
  rawText?: string;
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  data?: string;
  hora?: string;
  contrato?: string;
  hasPlaca?: boolean;
  confidence?: number;
  contratada?: string;
}

interface ObraConhecimento {
  id: string;
  codigo_normalizado: string;
  nome_exibicao: string;
  tipo: string;
  variacoes: string[];
  rodovia?: string;
  km_inicio?: number;
  km_fim?: number;
  contratada?: string;
  vezes_identificado?: number;
}

interface Sinonimo {
  termo_original: string;
  termo_normalizado: string;
}

// Busca aprendizados anteriores para melhorar identificação
async function buscarAprendizado(
  texto: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string | null> {
  if (!texto || texto.length < 3) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const textoLower = texto.toLowerCase();
    
    // Busca correções aplicadas que contenham texto similar
    const { data: aprendizados } = await supabase
      .from('obras_aprendizado')
      .select('identificacao_correta, texto_ocr')
      .eq('aplicado', true);
    
    if (!aprendizados || aprendizados.length === 0) return null;
    
    for (const apr of aprendizados) {
      const textoApr = apr.texto_ocr.toLowerCase();
      // Match exato ou parcial significativo
      if (textoLower.includes(textoApr) || textoApr.includes(textoLower)) {
        console.log(`Aprendizado encontrado: "${apr.texto_ocr}" → ${apr.identificacao_correta}`);
        return apr.identificacao_correta;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Erro ao buscar aprendizado:', err);
    return null;
  }
}

// Busca no banco de conhecimento para identificar a obra
async function buscarObraNoBanco(
  texto: string, 
  supabaseUrl: string, 
  supabaseKey: string
): Promise<ObraConhecimento | null> {
  if (!texto || texto.length < 3) return null;
  
  const textoLower = texto.toLowerCase();
  console.log(`Buscando no banco de conhecimento: "${textoLower.substring(0, 100)}..."`);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Busca todas as obras ativas
    const { data: obras, error } = await supabase
      .from('obras_conhecimento')
      .select('*')
      .eq('ativo', true);
    
    if (error) {
      console.error('Erro ao buscar obras:', error);
      return null;
    }
    
    if (!obras || obras.length === 0) return null;
    
    // Procura match nas variações
    for (const obra of obras as ObraConhecimento[]) {
      const variacoes = obra.variacoes || [];
      for (const variacao of variacoes) {
        if (textoLower.includes(variacao.toLowerCase())) {
          console.log(`Match encontrado: "${variacao}" → ${obra.codigo_normalizado}`);
          
          // Incrementa contador de identificações
          await supabase
            .from('obras_conhecimento')
            .update({ vezes_identificado: (obra.vezes_identificado || 0) + 1 })
            .eq('id', obra.id);
          
          return obra;
        }
      }
    }
    
    // Busca também por sinônimos
    const { data: sinonimos } = await supabase
      .from('obras_sinonimos')
      .select('termo_original, termo_normalizado')
      .eq('categoria', 'tipo_obra');
    
    if (sinonimos) {
      for (const sin of sinonimos as Sinonimo[]) {
        if (textoLower.includes(sin.termo_original.toLowerCase())) {
          // Encontrou sinônimo, busca obra correspondente
          const obraMatch = (obras as ObraConhecimento[]).find((o: ObraConhecimento) => 
            o.codigo_normalizado.startsWith(sin.termo_normalizado)
          );
          if (obraMatch) {
            console.log(`Match via sinônimo: "${sin.termo_original}" → ${obraMatch.codigo_normalizado}`);
            return obraMatch;
          }
        }
      }
    }
    
    return null;
  } catch (err) {
    console.error('Erro na busca de conhecimento:', err);
    return null;
  }
}

// Gera lista de obras conhecidas para o prompt da IA
async function getObrasConhecidasParaPrompt(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: obras } = await supabase
      .from('obras_conhecimento')
      .select('codigo_normalizado, nome_exibicao, tipo')
      .eq('ativo', true)
      .order('vezes_identificado', { ascending: false })
      .limit(30);
    
    if (!obras || obras.length === 0) return '';
    
    const lista = obras.map((o: { codigo_normalizado: string; nome_exibicao: string }) => 
      `${o.nome_exibicao} → ${o.codigo_normalizado}`
    ).join(', ');
    return `\n## OBRAS CONHECIDAS (use esses códigos exatos):\n${lista}`;
  } catch {
    return '';
  }
}

function getPrompt(
  defaultPortico?: string, 
  exifData?: { date?: string; gps?: { lat: number; lon: number } },
  ocrData?: PreProcessedOCR,
  obrasConhecidas?: string
): string {
  if (ocrData && (ocrData.rawText || ocrData.hasPlaca)) {
    const frenteIdentificada = ocrData.contratada || defaultPortico || 'NAO_IDENTIFICADO';
    return `Você é um engenheiro civil. Classifique esta foto de obra com base nos dados já extraídos.

## DADOS JÁ EXTRAÍDOS (OCR + EXIF)
${ocrData.rawText ? `Texto OCR: "${ocrData.rawText}"` : ''}
${ocrData.rodovia ? `Rodovia: ${ocrData.rodovia}` : ''}
${ocrData.km_inicio ? `KM: ${ocrData.km_inicio}${ocrData.km_fim ? ' a ' + ocrData.km_fim : ''}` : ''}
${ocrData.sentido ? `Sentido: ${ocrData.sentido}` : ''}
${ocrData.data ? `Data detectada: ${ocrData.data}` : ''}
${ocrData.contratada ? `Frente de serviço identificada: ${ocrData.contratada}` : ''}
${exifData?.date ? `Data EXIF: ${exifData.date}` : ''}
${exifData?.gps ? `GPS: ${exifData.gps.lat.toFixed(4)}, ${exifData.gps.lon.toFixed(4)}` : ''}
${obrasConhecidas || ''}

## TAREFA (APENAS CLASSIFICAÇÃO VISUAL)
1. **FRENTE (portico)**: Use "${frenteIdentificada}" se já identificado.
2. **DISCIPLINA**: FUNDACAO | ESTRUTURA | PORTICO_FREE_FLOW | CONTENCAO | TERRAPLENAGEM | DRENAGEM | PAVIMENTACAO | SINALIZACAO | BARREIRAS | ACABAMENTO | REVESTIMENTO | ALVENARIA | HIDRAULICA | ELETRICA | SEGURANCA | PAISAGISMO | MANUTENCAO | DEMOLICAO | OAC_OAE | OUTROS
3. **SERVIÇO**: Específico da disciplina
4. **DESCRIÇÃO**: O que você vê (1-2 frases)

## RESPOSTA JSON
\`\`\`json
{"portico":"${frenteIdentificada}","disciplina":"FUNDACAO","servico":"ARMADURA","analise_tecnica":"Descrição curta","confidence":0.85}
\`\`\`

Responda APENAS com JSON.`;
  }

  const exifInfo = exifData ? `
## DADOS EXIF: ${exifData.date ? `Data: ${exifData.date}` : 'Sem data'} | ${exifData.gps ? `GPS: ${exifData.gps.lat.toFixed(4)}, ${exifData.gps.lon.toFixed(4)}` : 'Sem GPS'}
` : '';

  return `Você é um engenheiro civil especialista em obras rodoviárias brasileiras.
${exifInfo}
${obrasConhecidas || ''}

## ⚠️ IMPORTANTE: LEITURA DE TEXTO NA IMAGEM

A maioria das fotos de obra tem uma LEGENDA/MARCA D'ÁGUA com texto BRANCO ou CLARO no canto inferior da imagem.
Este texto frequentemente está em **BAIXO CONTRASTE** (branco sobre fundo claro ou cinza).
Você DEVE fazer esforço extra para ler este texto mesmo que seja difícil de ver!

### PADRÃO TÍPICO DA LEGENDA (geralmente no rodapé da foto):
\`\`\`
27 de ago. de 2025 11:49:21    ← DATA E HORA
Free Flow P-10                  ← FRENTE DE SERVIÇO (IMPORTANTE!)
SP-280 KM 57                    ← RODOVIA E KM
\`\`\`

### DICAS PARA LER TEXTO CLARO/BRANCO:
- Olhe com atenção especial nos cantos da imagem (especialmente inferior)
- O texto pode ter sombra sutil ou estar semi-transparente
- Procure por números (datas, KMs) e nomes (BSO, Pórtico, Free Flow, Cortina, etc.)

## CONCEITOS - NÃO CONFUNDA!

### LOCALIZAÇÃO (onde a foto foi tirada - campos rodovia, km):
- SP-280, BR-116, SP-270 → Indica RODOVIA
- KM 57, KM 150 → Indica QUILOMETRAGEM

### FRENTE DE SERVIÇO (campo portico - NÃO é rodovia nem KM!):
| Texto na Foto | Campo portico |
|---------------|---------------|
| "BSO - 01", "BSO - 04" | BSO_01, BSO_04 |
| "Free Flow P-10", "Free Flow P17" | FREE_FLOW_P10, FREE_FLOW_P17 |
| "Pórtico 03" | PORTICO_03 |
| "Passarela 02" | PASSARELA_02 |
| "Viaduto KM 95" | VIADUTO_KM95 |
| "Cortina Atirantada", "Cortina 01" | CORTINA_ATIRANTADA, CORTINA_01 |
| "OAE 05" | OAE_05 |
| "Praça de Pedágio" | PRACA_PEDAGIO |

⚠️ ERRO COMUM: Não use "SP_280" ou "KM_57" como portico - esses são LOCALIZAÇÃO!

## TAREFA: ANALISE A IMAGEM

1. **PROCURE TEXTO** na imagem, especialmente:
   - Legenda no canto inferior (mesmo que seja texto claro/branco)
   - Placas de identificação
   - Qualquer texto visível

2. **EXTRAIA** do texto encontrado:
   - Frente de serviço (BSO, Free Flow, Pórtico, etc.) → campo \`portico\`
   - Rodovia → campo \`rodovia\`
   - KM → campo \`km_inicio\`
   - Data (formato DD/MM/AAAA) → campo \`data\`

3. **CLASSIFIQUE** visualmente:
   - \`disciplina\`: FUNDACAO|ESTRUTURA|PORTICO_FREE_FLOW|CONTENCAO|TERRAPLENAGEM|DRENAGEM|PAVIMENTACAO|SINALIZACAO|BARREIRAS|ACABAMENTO|REVESTIMENTO|ALVENARIA|HIDRAULICA|ELETRICA|SEGURANCA|PAISAGISMO|MANUTENCAO|DEMOLICAO|OAC_OAE|OUTROS
   - \`servico\`: Específico (CONCRETAGEM, ARMADURA, FORMA, etc.)

## RESPOSTA JSON (APENAS ISSO, NADA MAIS)

\`\`\`json
{
  "portico":"FREE_FLOW_P10",
  "disciplina":"ESTRUTURA",
  "servico":"CONCRETAGEM",
  "data":"27/08/2025",
  "rodovia":"SP_280",
  "km_inicio":"57",
  "sentido":"",
  "analise_tecnica":"Trabalhador dispensando concreto em carrinho de mão",
  "confidence":0.95,
  "ocr_text":"27 de ago. de 2025 11:49:21 Free Flow P-10 SP-280",
  "alertas":{"sem_placa":false,"texto_ilegivel":false}
}
\`\`\`

Se você leu claramente uma frente de serviço como "Free Flow P-10", a confidence deve ser 0.90+.
Se não encontrar frente de serviço, use "${defaultPortico || 'NAO_IDENTIFICADO'}" como portico.

Responda APENAS com JSON válido.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, filename, defaultPortico, economicMode, exifData, ocrData } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image base64 data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Buscar obra no banco de conhecimento usando texto OCR
    const ocrInput = ocrData as PreProcessedOCR | undefined;
    let obraIdentificada: ObraConhecimento | null = null;
    let aprendizado: string | null = null;
    
    if (ocrInput?.rawText) {
      // Primeiro busca em aprendizados (correções do usuário)
      aprendizado = await buscarAprendizado(ocrInput.rawText, supabaseUrl, supabaseKey);
      
      // Depois busca no banco de conhecimento
      if (!aprendizado) {
        obraIdentificada = await buscarObraNoBanco(ocrInput.rawText, supabaseUrl, supabaseKey);
      }
    }

    // Se encontrou aprendizado, usa diretamente
    if (aprendizado) {
      console.log(`Usando aprendizado: ${aprendizado}`);
      if (ocrInput) {
        ocrInput.contratada = aprendizado;
      }
    }
    // Se encontrou no banco, usa o código normalizado
    else if (obraIdentificada) {
      console.log(`Obra identificada no banco: ${obraIdentificada.codigo_normalizado}`);
      if (ocrInput) {
        ocrInput.contratada = obraIdentificada.codigo_normalizado;
      }
    }

    // Buscar lista de obras conhecidas para incluir no prompt
    const obrasConhecidas = await getObrasConhecidasParaPrompt(supabaseUrl, supabaseKey);

    const hasPreOCR = ocrInput && (ocrInput.rawText || ocrInput.hasPlaca);
    const model = hasPreOCR ? 'google/gemini-2.5-flash-lite' : (economicMode ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash');
    const maxTokens = hasPreOCR ? 300 : (economicMode ? 600 : 1200);
    
    console.log(`Analyzing image: ${filename} (model: ${model}, hasPreOCR: ${hasPreOCR}, obraDB: ${obraIdentificada?.codigo_normalizado || 'nenhuma'})`);

    const prompt = getPrompt(defaultPortico, exifData, ocrInput, obrasConhecidas);

    const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: maxTokens,
      }),
    }, 3, 2000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Limite de requisições atingido. Tente novamente em alguns segundos.',
            retryable: true
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Limite de créditos atingido.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI Response:', content);

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        portico: defaultPortico ? defaultPortico.toUpperCase().replace(/\s+/g, '_') : 'NAO_IDENTIFICADO',
        disciplina: 'OUTROS',
        servico: 'NAO_IDENTIFICADO',
        data: null,
        analise_tecnica: content,
        confidence: 0.3,
        ocr_text: ''
      };
    }

    // Prioriza: banco de conhecimento > OCR contratada > IA > default
    const porticoFromDB = obraIdentificada?.codigo_normalizado || '';
    const porticoFromOCR = ocrInput?.contratada ? normalizeField(ocrInput.contratada, '') : '';
    const porticoFinal = porticoFromDB || porticoFromOCR || normalizeField(result.portico, defaultPortico || 'NAO_IDENTIFICADO');
    
    const normalizedResult = {
      portico: porticoFinal,
      disciplina: normalizeField(result.disciplina, 'OUTROS'),
      servico: normalizeField(result.servico, 'NAO_IDENTIFICADO'),
      data: normalizeDate(ocrInput?.data || result.data || exifData?.date),
      rodovia: normalizeField(ocrInput?.rodovia || obraIdentificada?.rodovia || result.rodovia, ''),
      km_inicio: ocrInput?.km_inicio || result.km_inicio || null,
      km_fim: ocrInput?.km_fim || result.km_fim || null,
      sentido: normalizeField(ocrInput?.sentido || result.sentido, ''),
      tipo_documento: result.tipo_documento || 'FOTO',
      analise_tecnica: result.analise_tecnica || '',
      confidence: normalizeConfidence(result.confidence),
      ocr_text: ocrInput?.rawText || result.ocr_text || '',
      method: porticoFromDB ? 'banco_conhecimento' : (hasPreOCR ? 'ocr_ia' : 'ia_forcada'),
      obra_id: obraIdentificada?.id || null,
      alertas: {
        sem_placa: ocrInput?.hasPlaca === false || result.alertas?.sem_placa || false,
        texto_ilegivel: result.alertas?.texto_ilegivel || false,
        evidencia_fraca: result.alertas?.evidencia_fraca || false,
        km_inconsistente: result.alertas?.km_inconsistente || false,
      }
    };

    console.log('Normalized result:', normalizedResult);

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
    console.error('Error in analyze-image function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeField(value: string | undefined | null, defaultValue: string): string {
  if (!value || typeof value !== 'string') return defaultValue;
  return value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function normalizeDate(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const match1 = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match1) {
    const [, day, month, year] = match1;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  const match2 = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match2) {
    const [, year, month, day] = match2;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  return null;
}

function normalizeConfidence(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0.7;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0.7;
  if (num > 1) return num / 100;
  return Math.min(Math.max(num, 0), 1);
}
