import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PreProcessedOCR {
  rawText?: string;
  rodovia?: string;
  km_inicio?: string;
  km_fim?: string;
  sentido?: string;
  data?: string;
  hora?: string;
  hasPlaca?: boolean;
  contratada?: string; // Usado para armazenar a frente/pórtico identificado pelo OCR
}

interface ImageRequest {
  imageBase64: string;
  filename: string;
  hash: string;
  exifData?: {
    date?: string;
    gps?: { lat: number; lon: number };
  };
  ocrData?: PreProcessedOCR;
}

interface BatchRequest {
  images: ImageRequest[];
  defaultPortico?: string;
  economicMode?: boolean;
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

function getPromptForImage(
  defaultPortico?: string, 
  exifData?: { date?: string; gps?: { lat: number; lon: number } },
  ocrData?: PreProcessedOCR
): string {
  // Se temos dados OCR do cliente, usamos prompt mais simples
  if (ocrData && (ocrData.rawText || ocrData.hasPlaca)) {
    const frenteIdentificada = ocrData.contratada || defaultPortico || 'NAO_IDENTIFICADO';
    return `Engenheiro civil: classifique esta foto de obra.

## DADOS EXTRAÍDOS
${ocrData.rawText ? `Texto: "${ocrData.rawText.substring(0, 200)}"` : ''}
${ocrData.rodovia ? `Rodovia: ${ocrData.rodovia}` : ''}
${ocrData.km_inicio ? `KM: ${ocrData.km_inicio}` : ''}
${ocrData.data ? `Data: ${ocrData.data}` : ''}
${ocrData.contratada ? `Frente identificada: ${ocrData.contratada}` : ''}
${exifData?.date ? `EXIF: ${exifData.date}` : ''}

## CLASSIFIQUE
- portico: Use "${frenteIdentificada}" se já identificado, ou extraia da legenda (ex: "obra free flow p17" → FREE_FLOW_P17)
- disciplina: FUNDACAO|ESTRUTURA|PORTICO_FREE_FLOW|CONTENCAO|TERRAPLENAGEM|DRENAGEM|PAVIMENTACAO|SINALIZACAO|BARREIRAS|ACABAMENTO|REVESTIMENTO|ALVENARIA|HIDRAULICA|ELETRICA|SEGURANCA|PAISAGISMO|MANUTENCAO|DEMOLICAO|OAC_OAE|OUTROS
- servico: específico
- analise_tecnica: 1 frase
- confidence: 0-1

JSON apenas:
\`\`\`json
{"portico":"${frenteIdentificada}","disciplina":"","servico":"","analise_tecnica":"","confidence":0.8}
\`\`\``;
  }

  // Prompt completo quando não há OCR - IA faz OCR visual
  const exifInfo = exifData ? `EXIF: ${exifData.date || 'sem data'} | ${exifData.gps ? `GPS: ${exifData.gps.lat.toFixed(4)}, ${exifData.gps.lon.toFixed(4)}` : 'sem GPS'}` : '';

  return `Engenheiro civil: analise foto de obra com FOCO NA LEGENDA.
${exifInfo}

## LEIA A LEGENDA DA FOTO (MUITO IMPORTANTE!)
Procure texto sobreposto na imagem, especialmente na parte inferior:
- Nome da obra: "obra free flow p17" → portico: FREE_FLOW_P17
- "habitechne" → portico: HABITECHNE
- "cortina 01" → portico: CORTINA_01
- Rodovia: "SP 264 KM 131", "SP264_km131+100"
- Data: "24 de nov. de 2025 11:13:03"

## CLASSIFIQUE:
- portico: USE O NOME DA OBRA da legenda! (ou "${defaultPortico || 'NAO_IDENTIFICADO'}" se não encontrar)
- rodovia/km_inicio/sentido
- disciplina: FUNDACAO|ESTRUTURA|PORTICO_FREE_FLOW|CONTENCAO|TERRAPLENAGEM|DRENAGEM|PAVIMENTACAO|SINALIZACAO|BARREIRAS|ACABAMENTO|REVESTIMENTO|ALVENARIA|HIDRAULICA|ELETRICA|SEGURANCA|PAISAGISMO|MANUTENCAO|DEMOLICAO|OAC_OAE|OUTROS
- servico: específico
- data: DD/MM/YYYY
- alertas: sem_placa, texto_ilegivel, evidencia_fraca

JSON:
\`\`\`json
{"portico":"FREE_FLOW_P17","disciplina":"FUNDACAO","servico":"ARMADURA","data":"24/11/2025","rodovia":"SP_264","km_inicio":"131+100","sentido":"","analise_tecnica":"","confidence":0.9,"ocr_text":"obra free flow p17 SP264","alertas":{"sem_placa":false,"texto_ilegivel":false,"evidencia_fraca":false}}
\`\`\``;
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
  const hasPreOCR = image.ocrData && (image.ocrData.rawText || image.ocrData.hasPlaca);
  const prompt = getPromptForImage(defaultPortico, image.exifData, image.ocrData);
  
  // Modelo mais barato se temos OCR pré-processado
  const model = hasPreOCR ? 'google/gemini-2.5-flash-lite' : (economicMode ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash');
  const maxTokens = hasPreOCR ? 200 : (economicMode ? 400 : 600);

  console.log(`Analyzing: ${image.filename} (model: ${model}, hasPreOCR: ${hasPreOCR})`);

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
      max_tokens: maxTokens,
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

  // Merge OCR data from client with AI result
  const ocrInput = image.ocrData;
  
  // Prioriza pórtico do OCR (contratada) > IA > default
  const porticoFromOCR = ocrInput?.contratada ? normalizeField(ocrInput.contratada, '') : '';
  const porticoFinal = porticoFromOCR || normalizeField(result.portico, defaultPortico || 'NAO_IDENTIFICADO');
  
  const normalized = {
    portico: porticoFinal,
    disciplina: normalizeField(result.disciplina, 'OUTROS'),
    servico: normalizeField(result.servico, 'NAO_IDENTIFICADO'),
    // Prioriza OCR cliente > IA > EXIF
    data: normalizeDate(ocrInput?.data || result.data || image.exifData?.date),
    rodovia: normalizeField(ocrInput?.rodovia || result.rodovia, ''),
    km_inicio: ocrInput?.km_inicio || result.km_inicio || null,
    km_fim: ocrInput?.km_fim || result.km_fim || null,
    sentido: normalizeField(ocrInput?.sentido || result.sentido, ''),
    analise_tecnica: result.analise_tecnica || '',
    confidence: normalizeConfidence(result.confidence),
    ocr_text: ocrInput?.rawText || result.ocr_text || '',
    method: hasPreOCR ? 'ocr_ia' : 'ia_forcada',
    alertas: {
      sem_placa: ocrInput?.hasPlaca === false || result.alertas?.sem_placa || false,
      texto_ilegivel: result.alertas?.texto_ilegivel || false,
      evidencia_fraca: result.alertas?.evidencia_fraca || false,
    }
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
