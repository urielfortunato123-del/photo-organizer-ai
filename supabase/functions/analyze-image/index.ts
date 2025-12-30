import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      
      // If rate limited, wait and retry
      if (response.status === 429 && attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, filename, defaultPortico } = await req.json();
    
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

    console.log(`Analyzing image: ${filename}`);

    const prompt = `Você é um engenheiro rodoviário sênior especialista em obras de infraestrutura rodoviária e predial. 
Analise esta foto de obra e extraia as seguintes informações:

1. PÓRTICO: Identifique o número do pórtico se visível (ex: P-10, P 10, PORTICO 10, Free Flow P-11). Se não encontrar, use "${defaultPortico || 'NAO_IDENTIFICADO'}".

2. DISCIPLINA: Classifique conforme as regras abaixo:
   - FUNDACAO: Blocos de fundação, estacas, sapatas, tubulões
   - DRENAGEM: Bueiros, caixas de drenagem, sarjetas, descidas d'água
   - TERRAPLENAGEM: Corte, aterro, compactação de solo
   - PAVIMENTACAO: Asfalto, base, sub-base, imprimação, CBUQ
   - OAC: Obras de arte correntes - pontes, viadutos, passarelas
   - SINALIZACAO: Placas, pinturas de solo, tachas, balizadores
   - ACABAMENTO: Pintura de qualquer tipo, reboco, textura, revestimentos
   - SEGURANCA: Fechaduras, alambrados, cercas, câmeras de segurança, alarmes, portões
   - MANUTENCAO: Limpeza de terreno, roçagem, capina, remoção de entulho
   - PAISAGISMO: Plantio de grama, jardinagem, árvores, vegetação
   - ELETRICA: Instalações elétricas, iluminação, quadros de energia, cabeamento
   - HIDRAULICA: Tubulações de água, esgoto, caixas d'água, bombas
   - ESTRUTURA: Pilares, vigas, lajes, estruturas metálicas
   - OUTROS: Apenas se não se encaixar em nenhuma categoria acima

3. SERVIÇO: Identifique o serviço específico (ex: PINTURA_EXTERNA, INSTALACAO_ALAMBRADO, PLANTIO_GRAMA, LIMPEZA_TERRENO).

4. DATA: Se houver data visível na imagem ou placa, extraia no formato DD/MM/YYYY.

5. ANÁLISE TÉCNICA: Breve descrição técnica do que está sendo executado.

REGRAS IMPORTANTES:
- Pintura de paredes, muros, fachadas → DISCIPLINA = ACABAMENTO
- Instalação de cercas, alambrados, câmeras, fechaduras → DISCIPLINA = SEGURANCA
- Limpeza, roçagem, capina de vegetação → DISCIPLINA = MANUTENCAO
- Plantio de grama, jardim → DISCIPLINA = PAISAGISMO
- Use MAIÚSCULAS para PORTICO, DISCIPLINA e SERVICO
- Substitua espaços por underscore (_) nos nomes
- Remova acentos
- NUNCA classifique como OUTROS se uma das categorias específicas se aplicar

Responda APENAS em JSON válido no formato:
{
  "portico": "P_11",
  "disciplina": "ACABAMENTO",
  "servico": "PINTURA_EXTERNA_SALA_TECNICA",
  "data": "29/08/2025",
  "analise_tecnica": "Pintura de acabamento na face externa da sala técnica...",
  "confidence": 0.95,
  "ocr_text": "texto extraído da imagem se houver"
}`;

    const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
        max_tokens: 1000,
      }),
    }, 3, 2000); // 3 retries, starting with 2s delay

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
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
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        portico: defaultPortico ? `PORTICO_${defaultPortico.toUpperCase()}` : 'PORTICO_NAO_IDENTIFICADO',
        disciplina: 'OUTROS',
        servico: 'NAO_IDENTIFICADO',
        data: null,
        analise_tecnica: content,
        confidence: 0.3,
        ocr_text: ''
      };
    }

    // Normalize the result
    const normalizedResult = {
      portico: (result.portico || 'PORTICO_NAO_IDENTIFICADO').toUpperCase().replace(/\s+/g, '_'),
      disciplina: (result.disciplina || 'OUTROS').toUpperCase().replace(/\s+/g, '_'),
      servico: (result.servico || 'NAO_IDENTIFICADO').toUpperCase().replace(/\s+/g, '_'),
      data: result.data || null,
      analise_tecnica: result.analise_tecnica || '',
      confidence: result.confidence || 0.7,
      ocr_text: result.ocr_text || '',
      method: 'ia_forcada'
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
