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

    const prompt = `Você é um engenheiro rodoviário sênior especialista em obras de infraestrutura. 
Analise esta foto de obra e extraia as seguintes informações:

1. PÓRTICO: Identifique o número do pórtico se visível (ex: P-10, P 10, PORTICO 10). Se não encontrar, use "${defaultPortico || 'NAO_IDENTIFICADO'}".
2. DISCIPLINA: Classifique em uma das categorias: FUNDACAO, DRENAGEM, TERRAPLENAGEM, PAVIMENTACAO, OAC (Obras de Arte Correntes), SINALIZACAO, OUTROS.
3. SERVIÇO: Identifique o serviço específico (ex: CONCRETAGEM_BLOCO, BUEIRO_TUBULAR, ESCADA_HIDRAULICA, CORTE_ATERRO, etc).
4. DATA: Se houver data visível na imagem ou placa, extraia no formato DD/MM/YYYY.
5. ANÁLISE TÉCNICA: Breve descrição técnica do que está sendo executado.

IMPORTANTE:
- Use MAIÚSCULAS para PORTICO, DISCIPLINA e SERVICO
- Substitua espaços por underscore (_) nos nomes
- Remova acentos
- Se não conseguir identificar algo, use "NAO_IDENTIFICADO"

Responda APENAS em JSON válido no formato:
{
  "portico": "PORTICO_P_10",
  "disciplina": "FUNDACAO",
  "servico": "CONCRETAGEM_BLOCO_B1",
  "data": "12/10/2024",
  "analise_tecnica": "Concretagem de bloco de fundação com...",
  "confidence": 0.85,
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
