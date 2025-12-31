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

    // Prompt otimizado para maior precisão
    const prompt = `Você é um engenheiro civil sênior especialista em obras de infraestrutura rodoviária, pontes, viadutos e construção civil.

## TAREFA PRINCIPAL
Analise esta foto de obra e classifique com precisão máxima.

## PASSO 1: IDENTIFICAÇÃO VISUAL (OBRIGATÓRIO)
Antes de classificar, DESCREVA em detalhes o que você VÊ na imagem:
- Equipamentos presentes (escavadeira, caminhão, guindaste, betoneira, etc.)
- Materiais visíveis (concreto, ferro, madeira, tubos, terra, asfalto, etc.)
- Atividade em execução (escavação, concretagem, montagem, pintura, etc.)
- Estruturas identificáveis (pórtico, cortina, viaduto, bueiro, etc.)
- Elementos de texto/placas legíveis na foto

## PASSO 2: LEITURA DE TEXTO (OCR)
Procure por QUALQUER texto visível na foto:
- Placas de obra, identificação de frente
- Datas em qualquer formato
- Números de estruturas (P-10, P 11, Cortina 01, etc.)
- Legendas ou anotações na foto

## PASSO 3: CLASSIFICAÇÃO

### FRENTE DE SERVIÇO (portico)
Identifique o local/estrutura principal. Exemplos:
- Pórticos Free Flow: P-10, P_11, P 12, PORTICO_13, FREE_FLOW_P14
- Cortinas: CORTINA_01, CORTINA_ATIRANTADA_KM_167
- Praças: PRACA_PEDAGIO_01, PRACA_05
- Estruturas: VIADUTO_KM_200, PASSARELA_02, PONTE_01
- Outros: BSO, GUARITA_01, CANTEIRO_OBRAS
- Use "${defaultPortico || 'NAO_IDENTIFICADO'}" se não conseguir identificar

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
| MANUTENCAO | Limpeza, roçagem, capina, reparos gerais |
| DEMOLICAO | Demolição, remoção de estruturas, corte de concreto |
| OAC/OAE | Obras de arte correntes (bueiros maiores) e especiais (pontes, viadutos) |
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

### DATA
Formato: DD/MM/YYYY
Procure datas em:
- Marcas d'água em fotos
- Placas de identificação
- Legendas escritas
- Metadados visíveis

## REGRAS CRÍTICAS DE CLASSIFICAÇÃO

1. **Equipamentos NÃO definem a disciplina sozinhos:**
   - Escavadeira + TERRA = TERRAPLENAGEM
   - Escavadeira + ROCHA para fundação = FUNDACAO
   - Caminhão betoneira = depende do destino do concreto

2. **Priorize o SERVIÇO sendo executado, não apenas o equipamento:**
   - Trabalhador pintando parede = ACABAMENTO/PINTURA
   - Trabalhador lançando concreto em bloco = FUNDACAO/CONCRETAGEM_BLOCO
   - Trabalhador lançando concreto em pilar = ESTRUTURA/CONCRETAGEM

3. **Se houver pórtico Free Flow visível:**
   - Durante montagem/içamento = PORTICO_FREE_FLOW
   - Trabalhos no entorno (terraplenagem, fundação) = disciplina correspondente

4. **Cortinas e contenções:**
   - Tirantes sendo protendidos = CONTENCAO/PROTENSAO_TIRANTE
   - Escavação para cortina = CONTENCAO ou FUNDACAO dependendo do contexto
   - Injeção de cimento em tirantes = CONTENCAO/INJECAO_CIMENTO

5. **Confiança:**
   - Se baseado em texto/OCR legível: 0.85-0.95
   - Se baseado apenas em análise visual clara: 0.70-0.85
   - Se houver dúvida na classificação: 0.50-0.70

## FORMATO DA RESPOSTA (JSON OBRIGATÓRIO)
\`\`\`json
{
  "portico": "P_11",
  "disciplina": "CONTENCAO",
  "servico": "PROTENSAO_TIRANTE",
  "data": "29/08/2025",
  "analise_tecnica": "Foto mostra equipamento de protensão (macaco hidráulico) posicionado em tirante de cortina atirantada. Manômetro visível indicando pressão de serviço. Trabalhadores utilizando EPIs. Estrutura de contenção com altura aproximada de 6m. Placa indica 'Cortina P-11 Km 167'.",
  "confidence": 0.92,
  "ocr_text": "CORTINA P-11 KM 167 - 29/08/2025"
}
\`\`\`

IMPORTANTE: 
- Responda APENAS com o JSON, sem texto adicional
- Use MAIÚSCULAS para todos os campos exceto analise_tecnica
- Use _ (underscore) no lugar de espaços
- O campo analise_tecnica deve descrever detalhadamente o que você VÊ na foto`;

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
        max_tokens: 1500,
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
      analise_tecnica: result.analise_tecnica || '',
      confidence: normalizeConfidence(result.confidence),
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

// Helper functions
function normalizeField(value: string | undefined | null, defaultValue: string): string {
  if (!value || typeof value !== 'string') return defaultValue;
  return value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function normalizeDate(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null;
  
  // Try to parse different date formats
  // DD/MM/YYYY
  const match1 = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match1) {
    const [, day, month, year] = match1;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  // YYYY-MM-DD
  const match2 = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match2) {
    const [, year, month, day] = match2;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  // DD-MM-YYYY
  const match3 = value.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (match3) {
    const [, day, month, year] = match3;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  return null;
}

function normalizeConfidence(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0.7;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0.7;
  // Ensure it's between 0 and 1
  if (num > 1) return num / 100;
  return Math.min(Math.max(num, 0), 1);
}
