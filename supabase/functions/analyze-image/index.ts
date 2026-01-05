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

// Interface para dados OCR pré-processados pelo cliente
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
}

function getPrompt(
  defaultPortico?: string, 
  exifData?: { date?: string; gps?: { lat: number; lon: number } },
  ocrData?: PreProcessedOCR
): string {
  // Se temos dados OCR do cliente, usamos prompt MUITO mais simples
  if (ocrData && (ocrData.rawText || ocrData.hasPlaca)) {
    return `Você é um engenheiro civil. Classifique esta foto de obra com base nos dados já extraídos.

## DADOS JÁ EXTRAÍDOS (OCR + EXIF)
${ocrData.rawText ? `Texto OCR: "${ocrData.rawText}"` : ''}
${ocrData.rodovia ? `Rodovia: ${ocrData.rodovia}` : ''}
${ocrData.km_inicio ? `KM: ${ocrData.km_inicio}${ocrData.km_fim ? ' a ' + ocrData.km_fim : ''}` : ''}
${ocrData.sentido ? `Sentido: ${ocrData.sentido}` : ''}
${ocrData.data ? `Data detectada: ${ocrData.data}` : ''}
${exifData?.date ? `Data EXIF: ${exifData.date}` : ''}
${exifData?.gps ? `GPS: ${exifData.gps.lat.toFixed(4)}, ${exifData.gps.lon.toFixed(4)}` : ''}

## TAREFA (APENAS CLASSIFICAÇÃO VISUAL)
Olhe a imagem e classifique:

1. **FRENTE (portico)**: P-10, CORTINA_01, BSO_04, FREE_FLOW_P11
   Use "${defaultPortico || 'NAO_IDENTIFICADO'}" se não identificar.

2. **DISCIPLINA**: FUNDACAO | ESTRUTURA | PORTICO_FREE_FLOW | CONTENCAO | TERRAPLENAGEM | DRENAGEM | PAVIMENTACAO | SINALIZACAO | BARREIRAS | ACABAMENTO | REVESTIMENTO | ALVENARIA | HIDRAULICA | ELETRICA | SEGURANCA | PAISAGISMO | MANUTENCAO | DEMOLICAO | OAC_OAE | OUTROS

3. **SERVIÇO**: Específico da disciplina

4. **DESCRIÇÃO**: O que você vê (1-2 frases)

## RESPOSTA JSON
\`\`\`json
{
  "portico": "P_11",
  "disciplina": "CONTENCAO",
  "servico": "PROTENSAO_TIRANTE",
  "analise_tecnica": "Descrição curta",
  "confidence": 0.85
}
\`\`\`

Responda APENAS com JSON.`;
  }

  // Prompt completo quando não há OCR do cliente (fallback)
  const exifInfo = exifData ? `
## DADOS EXIF: ${exifData.date ? `Data: ${exifData.date}` : 'Sem data'} | ${exifData.gps ? `GPS: ${exifData.gps.lat.toFixed(4)}, ${exifData.gps.lon.toFixed(4)}` : 'Sem GPS'}
` : '';

  return `Você é um engenheiro civil especialista em obras rodoviárias.
${exifInfo}
## TAREFA: Analise esta foto com foco em OCR e classificação.

## 1. LEITURA DE TEXTO (OCR)
Transcreva TODO texto visível:
- Placas: rodovia, KM, sentido, empresa
- Datas e horários
- Identificadores: P-10, Cortina 01, BSO 04

## 2. CLASSIFICAÇÃO
- FRENTE (portico): P-10, CORTINA_01, BSO_04. Use "${defaultPortico || 'NAO_IDENTIFICADO'}" se não identificar.
- RODOVIA: SP_270, BR_116
- KM: 94+050
- DISCIPLINA: FUNDACAO | ESTRUTURA | PORTICO_FREE_FLOW | CONTENCAO | TERRAPLENAGEM | DRENAGEM | PAVIMENTACAO | SINALIZACAO | BARREIRAS | ACABAMENTO | REVESTIMENTO | ALVENARIA | HIDRAULICA | ELETRICA | SEGURANCA | PAISAGISMO | MANUTENCAO | DEMOLICAO | OAC_OAE | OUTROS
- SERVIÇO: Específico

## ALERTAS
- sem_placa: true/false
- texto_ilegivel: true/false
- evidencia_fraca: true/false

## RESPOSTA JSON
\`\`\`json
{
  "portico": "P_11",
  "disciplina": "CONTENCAO",
  "servico": "PROTENSAO_TIRANTE",
  "data": "29/08/2025",
  "rodovia": "SP_270",
  "km_inicio": "94+050",
  "sentido": "LESTE",
  "analise_tecnica": "Descrição",
  "confidence": 0.85,
  "ocr_text": "Texto encontrado",
  "alertas": {
    "sem_placa": false,
    "texto_ilegivel": false,
    "evidencia_fraca": false
  }
}
\`\`\`

Responda APENAS com JSON válido.`;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Se temos OCR pré-processado, usamos modelo mais barato ainda
    const hasPreOCR = ocrData && (ocrData.rawText || ocrData.hasPlaca);
    const model = hasPreOCR ? 'google/gemini-2.5-flash-lite' : (economicMode ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash');
    const maxTokens = hasPreOCR ? 300 : (economicMode ? 600 : 1200);
    
    console.log(`Analyzing image: ${filename} (model: ${model}, hasPreOCR: ${hasPreOCR})`);

    const prompt = getPrompt(defaultPortico, exifData, ocrData as PreProcessedOCR);

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

    // Parse the JSON response
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

    // Merge OCR data from client with AI result
    const ocrInput = ocrData as PreProcessedOCR | undefined;
    const normalizedResult = {
      portico: normalizeField(result.portico, defaultPortico || 'NAO_IDENTIFICADO'),
      disciplina: normalizeField(result.disciplina, 'OUTROS'),
      servico: normalizeField(result.servico, 'NAO_IDENTIFICADO'),
      // Prioriza dados do OCR cliente, depois IA, depois EXIF
      data: normalizeDate(ocrInput?.data || result.data || exifData?.date),
      rodovia: normalizeField(ocrInput?.rodovia || result.rodovia, ''),
      km_inicio: ocrInput?.km_inicio || result.km_inicio || null,
      km_fim: ocrInput?.km_fim || result.km_fim || null,
      sentido: normalizeField(ocrInput?.sentido || result.sentido, ''),
      tipo_documento: result.tipo_documento || 'FOTO',
      analise_tecnica: result.analise_tecnica || '',
      confidence: normalizeConfidence(result.confidence),
      // OCR text: prioriza cliente
      ocr_text: ocrInput?.rawText || result.ocr_text || '',
      method: hasPreOCR ? 'ocr_ia' : 'ia_forcada',
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

// Helper functions
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
