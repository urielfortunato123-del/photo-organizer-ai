import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ImageRequest {
  imageBase64: string;
  filename: string;
  hash: string;
}

interface BatchRequest {
  images: ImageRequest[];
  defaultPortico?: string;
  economicMode?: boolean; // Use cheaper model (gemini-2.5-flash-lite)
}

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

function getPromptForImage(defaultPortico?: string): string {
  return `Você é um engenheiro civil sênior especialista em obras de infraestrutura rodoviária.

## TAREFA: Analise esta foto e classifique.

## IDENTIFICAÇÃO VISUAL
Descreva o que você VÊ: equipamentos, materiais, atividade, estruturas.

## LEITURA DE TEXTO (OCR)
Procure texto visível: placas, datas, números de estruturas.

## CLASSIFICAÇÃO

### FRENTE DE SERVIÇO (portico)
Exemplos: P-10, CORTINA_01, PRACA_PEDAGIO_01, VIADUTO_KM_200
Use "${defaultPortico || 'NAO_IDENTIFICADO'}" se não identificar.

### DISCIPLINA
FUNDACAO | ESTRUTURA | PORTICO_FREE_FLOW | CONTENCAO | TERRAPLENAGEM | DRENAGEM | PAVIMENTACAO | SINALIZACAO | BARREIRAS | ACABAMENTO | REVESTIMENTO | ALVENARIA | HIDRAULICA | ELETRICA | SEGURANCA | PAISAGISMO | MANUTENCAO | DEMOLICAO | OAC/OAE | ESQUADRIAS | IMPERMEABILIZACAO | MOBILIZACAO | ENSAIOS | LOUCAS_METAIS | OUTROS

### SERVIÇO
Específico da disciplina (ex: ESCAVACAO, ARMACAO, CONCRETAGEM, MONTAGEM_PORTICO)

### DATA
Formato: DD/MM/YYYY

## RESPOSTA JSON
\`\`\`json
{
  "portico": "P_11",
  "disciplina": "CONTENCAO",
  "servico": "PROTENSAO_TIRANTE",
  "data": "29/08/2025",
  "analise_tecnica": "Descrição do que você vê",
  "confidence": 0.85,
  "ocr_text": "Texto encontrado"
}
\`\`\`

Responda APENAS com JSON válido.`;
}

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

async function analyzeImage(
  image: ImageRequest,
  apiKey: string,
  defaultPortico?: string,
  economicMode?: boolean
): Promise<{ hash: string; result: Record<string, unknown> }> {
  const prompt = getPromptForImage(defaultPortico);
  
  // Use cheaper model in economic mode (roughly 2x cheaper)
  const model = economicMode ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash';

  console.log(`Analyzing image: ${image.filename} (model: ${model})`);

  const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
                url: `data:image/jpeg;base64,${image.imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: economicMode ? 500 : 800, // Less tokens in economic mode
    }),
  }, 3, 2000);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate limit' };
    }
    if (response.status === 402) {
      throw { status: 402, message: 'Credit limit' };
    }
    
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    result = {
      portico: defaultPortico || 'NAO_IDENTIFICADO',
      disciplina: 'OUTROS',
      servico: 'NAO_IDENTIFICADO',
      data: null,
      analise_tecnica: content,
      confidence: 0.3,
      ocr_text: ''
    };
  }

  const normalized = {
    portico: normalizeField(result.portico, defaultPortico || 'NAO_IDENTIFICADO'),
    disciplina: normalizeField(result.disciplina, 'OUTROS'),
    servico: normalizeField(result.servico, 'NAO_IDENTIFICADO'),
    data: normalizeDate(result.data),
    analise_tecnica: result.analise_tecnica || '',
    confidence: normalizeConfidence(result.confidence),
    ocr_text: result.ocr_text || '',
    method: 'ia_forcada'
  };

  return { hash: image.hash, result: normalized };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, defaultPortico, economicMode }: BatchRequest = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Images array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size to avoid timeouts
    if (images.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Maximum 10 images per batch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing batch of ${images.length} images (economic: ${economicMode || false})`);

    const results: { hash: string; result: Record<string, unknown> }[] = [];
    const errors: { hash: string; error: string }[] = [];

    // Process sequentially to avoid rate limits
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        const analyzed = await analyzeImage(image, LOVABLE_API_KEY, defaultPortico, economicMode);
        results.push(analyzed);
        
        // Small delay between requests to avoid rate limits
        if (i < images.length - 1) {
          await delay(1000);
        }
      } catch (err: unknown) {
        console.error(`Error processing ${image.filename}:`, err);
        
        const errObj = err as { status?: number; message?: string };
        
        if (errObj.status === 429) {
          // Rate limit hit - return what we have
          return new Response(
            JSON.stringify({
              results,
              errors: [...errors, { hash: image.hash, error: 'Rate limit' }],
              partial: true,
              remaining: images.slice(i).map(img => img.hash)
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (errObj.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Limite de créditos atingido.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        errors.push({ 
          hash: image.hash, 
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log(`Batch complete: ${results.length} success, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ results, errors, partial: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process batch';
    console.error('Error in analyze-batch function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
