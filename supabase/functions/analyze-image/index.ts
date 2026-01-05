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

function getPrompt(defaultPortico?: string, exifData?: { date?: string; gps?: { lat: number; lon: number } }): string {
  const exifInfo = exifData ? `
## DADOS EXIF EXTRAÍDOS (usar como referência)
${exifData.date ? `- Data/Hora do dispositivo: ${exifData.date}` : '- Data EXIF: não disponível'}
${exifData.gps ? `- GPS: ${exifData.gps.lat.toFixed(6)}, ${exifData.gps.lon.toFixed(6)}` : '- GPS: não disponível'}
` : '';

  return `Você é um engenheiro civil sênior especialista em obras de infraestrutura rodoviária, pontes, viadutos e construção civil.

${exifInfo}

## TAREFA PRINCIPAL
Analise esta foto de obra com foco em:
1. **LEITURA DE TEXTO (OCR)** - Prioridade máxima
2. **CLASSIFICAÇÃO TÉCNICA**
3. **ALERTAS DE QUALIDADE**

## PASSO 1: LEITURA DE TEXTO (OCR) - CRÍTICO
Procure e transcreva TODO texto visível na foto:

### PLACAS DE OBRA (procure ativamente)
- Nome da obra / contratante
- Rodovia (ex: SP-270, BR-116, Raposo Tavares)
- KM inicial e final (ex: km 94+050, km 101+410)
- Sentido (Leste/Oeste, Norte/Sul, Capital/Interior)
- Nome da contratada / empreiteira
- Número do contrato
- Fiscal / responsável

### DATAS E HORÁRIOS
- Datas impressas na foto (qualquer formato)
- Horários visíveis
- Marcas d'água de data

### IDENTIFICADORES
- Número de estruturas (P-10, P 11, Cortina 01, BSO 04)
- Códigos de atividade
- Numeração de equipamentos

### DOCUMENTOS FOTOGRAFADOS
Se a foto mostra um documento, identifique:
- Tipo: RDA, BM, FLS, Nota Fiscal, Ordem de Serviço
- Números, datas e valores visíveis
- Assinaturas (presença visual)

## PASSO 2: IDENTIFICAÇÃO VISUAL
Descreva o que você VÊ na imagem:
- Equipamentos (escavadeira, caminhão, guindaste, betoneira, etc.)
- Materiais (concreto, ferro, madeira, tubos, terra, asfalto, etc.)
- Atividade em execução
- Estruturas identificáveis
- Condições de trabalho (EPI, equipe, clima)

## PASSO 3: CLASSIFICAÇÃO

### FRENTE DE SERVIÇO (portico)
Identifique o local/estrutura principal. Exemplos:
- Pórticos Free Flow: P-10, P_11, P 12, PORTICO_13, FREE_FLOW_P14
- Cortinas: CORTINA_01, CORTINA_ATIRANTADA_KM_167
- Praças: PRACA_PEDAGIO_01, PRACA_05
- BSO: BSO_04, BASE_OPERACIONAL_KM79
- Estruturas: VIADUTO_KM_200, PASSARELA_02, PONTE_01
- Outros: GUARITA_01, CANTEIRO_OBRAS
- Use "${defaultPortico || 'NAO_IDENTIFICADO'}" se não conseguir identificar

### RODOVIA E KM
Extraia da placa ou contexto:
- rodovia: "SP-270" ou "RAPOSO_TAVARES"
- km_inicio: "94+050"
- km_fim: "101+410" (se houver)
- sentido: "LESTE" ou "OESTE" ou "CAPITAL" ou "INTERIOR"

### DISCIPLINA (escolha UMA das opções abaixo)
| Disciplina | Quando usar |
|------------|-------------|
| FUNDACAO | Estacas, blocos, sapatas, tubulões, perfuração de solo |
| ESTRUTURA | Pilares, vigas, lajes, formas, armação, concretagem estrutural |
| PORTICO_FREE_FLOW | Montagem/içamento de pórticos, instalação RFID, estrutura de Free Flow |
| CONTENCAO | Cortinas atirantadas, tirantes, protensão, solo grampeado, muros |
| TERRAPLENAGEM | Escavação, aterro, corte, compactação, carga/transporte de terra |
| DRENAGEM | Bueiros, bocas de lobo, sarjetas, canaletas, descidas d'água |
| PAVIMENTACAO | Asfalto, CBUQ, base, sub-base, fresagem, imprimação, pavimento |
| SINALIZACAO | Placas, pintura de solo, defensas, tachas, balizadores |
| BARREIRAS | Barreiras New Jersey, barreiras de concreto |
| ACABAMENTO | Pintura (interna/externa), texturas, verniz, selador, forro |
| REVESTIMENTO | Reboco, chapisco, cerâmica, piso, contrapiso |
| ALVENARIA | Paredes de bloco/tijolo, muros, vergas |
| HIDRAULICA | Tubulações de água/esgoto, caixas d'água, bombas, instalações |
| ELETRICA | Eletrodutos, cabeamento, quadros, iluminação, postes |
| SEGURANCA | Cercas, alambrados, câmeras CFTV, guaritas, controle acesso |
| PAISAGISMO | Grama, plantio, jardim, hidrossemeadura, biomanta |
| MANUTENCAO | Limpeza, roçagem, capina, reparos gerais, manutenção BSO |
| DEMOLICAO | Demolição, remoção de estruturas, corte de concreto |
| OAC_OAE | Obras de arte correntes (bueiros maiores) e especiais (pontes, viadutos) |
| ESQUADRIAS | Portas, janelas, portões, grades, guarda-corpos |
| IMPERMEABILIZACAO | Mantas, impermeabilizantes, juntas |
| MOBILIZACAO | Canteiro de obras, instalações provisórias |
| ENSAIOS | Testes, ensaios de campo, prova de carga |
| LOUCAS_METAIS | Vasos sanitários, pias, cubas, metais sanitários |
| OUTROS | APENAS se não se encaixar em nenhuma outra categoria |

### SERVIÇO (específico dentro da disciplina)
Exemplos por disciplina:
- FUNDACAO: ESTACA_RAIZ, BLOCO_COROAMENTO, CONCRETAGEM_BLOCO
- ESTRUTURA: ARMACAO, CONCRETAGEM, FORMA, DESFORMA, PILAR
- PORTICO_FREE_FLOW: MONTAGEM_PORTICO, ICAMENTO_PORTICO, INSTALACAO_RFID
- CONTENCAO: PROTENSAO_TIRANTE, CORTINA_ATIRANTADA, INJECAO_CIMENTO
- TERRAPLENAGEM: ESCAVACAO, ATERRO, COMPACTACAO, CARGA_TRANSPORTE
- DRENAGEM: BUEIRO, BOCA_LOBO, DESCIDA_DAGUA, GABIAO
- PAVIMENTACAO: CBUQ, IMPRIMACAO, BASE, FRESAGEM
- ACABAMENTO: PINTURA_EXTERNA, PINTURA_INTERNA, TEXTURA
- SEGURANCA: ALAMBRADO, CERCA, CAMERA, CFTV
- PAISAGISMO: PLANTIO_GRAMA, HIDROSSEMEADURA
- MANUTENCAO: REFORMA_BSO, LIMPEZA, ROCAGEM

### DATA
Formato: DD/MM/YYYY
Prioridade: 1) Data na foto, 2) Data EXIF, 3) null

### TIPO DE DOCUMENTO (se aplicável)
Se a foto mostra um documento, classifique:
- tipo_documento: "RDA" | "BM" | "FLS" | "NOTA_FISCAL" | "ORDEM_SERVICO" | "FOTO"

## REGRAS CRÍTICAS

1. **OCR é prioridade**: Extraia TODO texto visível, mesmo parcial
2. **Rodovia e KM**: Críticos para organização - procure ativamente
3. **Equipamentos NÃO definem disciplina sozinhos**
4. **Confiança baseada em evidências**:
   - OCR claro com placa legível: 0.90-0.98
   - OCR parcial + contexto visual: 0.75-0.90
   - Apenas análise visual clara: 0.60-0.75
   - Incerteza ou foto ruim: 0.40-0.60

## ALERTAS (identificar problemas)
Marque se detectar:
- "sem_placa": true se não há placa de identificação
- "texto_ilegivel": true se texto está borrado/escuro
- "evidencia_fraca": true se foto tem pouca informação
- "km_inconsistente": true se KM parece incorreto

## FORMATO DA RESPOSTA (JSON OBRIGATÓRIO)
\`\`\`json
{
  "portico": "P_11",
  "disciplina": "CONTENCAO",
  "servico": "PROTENSAO_TIRANTE",
  "data": "29/08/2025",
  "rodovia": "SP_270",
  "km_inicio": "94+050",
  "km_fim": null,
  "sentido": "LESTE",
  "tipo_documento": "FOTO",
  "analise_tecnica": "Descrição detalhada do que você vê",
  "confidence": 0.92,
  "ocr_text": "Todo texto encontrado na imagem transcrito aqui",
  "alertas": {
    "sem_placa": false,
    "texto_ilegivel": false,
    "evidencia_fraca": false,
    "km_inconsistente": false
  }
}
\`\`\`

Responda APENAS com o JSON, sem texto adicional.`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, filename, defaultPortico, economicMode, exifData } = await req.json();
    
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

    // Use cheaper model in economic mode (roughly 2x cheaper)
    const model = economicMode ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash';
    console.log(`Analyzing image: ${filename} (model: ${model}, economic: ${economicMode || false})`);

    const prompt = getPrompt(defaultPortico, exifData);

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
        max_tokens: economicMode ? 600 : 1200,
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

    // Normalize and validate the result
    const normalizedResult = {
      portico: normalizeField(result.portico, defaultPortico || 'NAO_IDENTIFICADO'),
      disciplina: normalizeField(result.disciplina, 'OUTROS'),
      servico: normalizeField(result.servico, 'NAO_IDENTIFICADO'),
      data: normalizeDate(result.data),
      rodovia: normalizeField(result.rodovia, ''),
      km_inicio: result.km_inicio || null,
      km_fim: result.km_fim || null,
      sentido: normalizeField(result.sentido, ''),
      tipo_documento: result.tipo_documento || 'FOTO',
      analise_tecnica: result.analise_tecnica || '',
      confidence: normalizeConfidence(result.confidence),
      ocr_text: result.ocr_text || '',
      method: 'ia_forcada',
      alertas: {
        sem_placa: result.alertas?.sem_placa || false,
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
