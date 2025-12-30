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

    const prompt = `Você é um engenheiro especialista em obras de infraestrutura rodoviária, predial e industrial.
Analise esta foto de obra e classifique usando EXATAMENTE as categorias listadas abaixo.

## 1. PÓRTICO
Identifique: P-10, P 10, P_10, PORTICO 10, Free Flow P-11, Praça 05, etc.
Padrão: "${defaultPortico || 'NAO_IDENTIFICADO'}"

## 2. DISCIPLINAS E SERVIÇOS PERMITIDOS

### FUNDACAO
ESTACA_RAIZ, ESTACA_HELICE, ESTACA_FRANKI, ESTACA_PRE_MOLDADA, TUBULAO, SAPATA_CORRIDA, SAPATA_ISOLADA, BLOCO_COROAMENTO, BLOCO_FUNDACAO, BALDRAME, VIGA_BALDRAME, ESCAVACAO_FUNDACAO, CONCRETAGEM_BLOCO, CRAVACAO_ESTACA

### ESTRUTURA
PILAR, PILAR_METALICO, PILAR_CONCRETO, VIGA, VIGA_BALDRAME, VIGA_METALICA, LAJE, LAJE_PRE_MOLDADA, LAJE_MACICA, ESTRUTURA_METALICA, PERFIL_METALICO, TRELICA, FORMA, DESFORMA, ARMACAO, FERRAGEM, CONCRETAGEM, CURA_CONCRETO, ESCORAMENTO

### ALVENARIA
ALVENARIA_VEDACAO, ALVENARIA_ESTRUTURAL, BLOCO_CERAMICO, BLOCO_CONCRETO, TIJOLO, PAREDE, MURO, VERGA, CONTRAVERGA, ENCUNHAMENTO, MARCACAO_ALVENARIA

### COBERTURA
TELHADO, TELHA_METALICA, TELHA_CERAMICA, TELHA_FIBROCIMENTO, TELHA_SANDUICHE, CUMEEIRA, RUFO, CALHA, ESTRUTURA_TELHADO, TESOURA, IMPERMEABILIZACAO_COBERTURA, PLATIBANDA, BEIRAL

### REVESTIMENTO
CHAPISCO, EMBOCO, REBOCO, MASSA_CORRIDA, GESSO, GESSO_LISO, CERAMICA, PORCELANATO, PISO, CONTRAPISO, REGULARIZACAO, REVESTIMENTO_FACHADA, PASTILHA, GRANITO, MARMORE

### ACABAMENTO
PINTURA_INTERNA, PINTURA_EXTERNA, PINTURA_FACHADA, PINTURA_EPOXI, PINTURA_TEXTURA, PINTURA_ACRILICA, TEXTURA, GRAFIATO, TEXTURA_PROJETADA, MASSA_ACRILICA, SELADOR, VERNIZ, LACA, ESMALTE, RODAPE, RODATETO, MOLDURA, SOLEIRA, PEITORIL, FORRO, FORRO_GESSO, FORRO_PVC

### ESQUADRIAS
PORTA, PORTA_MADEIRA, PORTA_METALICA, PORTA_VIDRO, PORTA_CORTA_FOGO, JANELA, JANELA_ALUMINIO, JANELA_VIDRO, PORTAO, PORTAO_METALICO, PORTAO_AUTOMATICO, GRADIL, GRADE, GUARDA_CORPO, CORRIMAO, VIDRO, VIDRACARIA, ESPELHO, PERSIANA, CORTINA

### IMPERMEABILIZACAO
MANTA_ASFALTICA, MANTA_ALUMINIZADA, IMPERMEABILIZANTE_LIQUIDO, IMPERMEABILIZACAO_LAJE, IMPERMEABILIZACAO_PISO, IMPERMEABILIZACAO_BANHEIRO, JUNTA_DILATACAO, MASTIQUE

### HIDRAULICA
TUBULACAO_AGUA_FRIA, TUBULACAO_AGUA_QUENTE, TUBULACAO_ESGOTO, CAIXA_DAGUA, RESERVATORIO, BOMBA, CASA_BOMBAS, CAIXA_GORDURA, CAIXA_INSPECAO, FOSSA, SUMIDOURO, VASO_SANITARIO, PIA, LAVATORIO, REGISTRO, VALVULA, AQUECEDOR, BOILER, ESGOTAMENTO, PRESSURIZADOR

### ELETRICA
ELETRODUTO, CABEAMENTO, FIACAO, QUADRO_ELETRICO, QUADRO_DISTRIBUICAO, DISJUNTOR, TOMADA, INTERRUPTOR, LUMINARIA, ILUMINACAO, POSTE_LUZ, ATERRAMENTO, SPDA, PARA_RAIO, SUBESTACAO, TRANSFORMADOR, GERADOR, NOBREAK, PAINEL_ELETRICO, BANCO_DUTOS

### AR_CONDICIONADO
SPLIT, CASSETE, PISO_TETO, CONDENSADORA, EVAPORADORA, DUTO_AR, GRELHA_AR, EXAUSTOR, VENTILACAO, INFRA_AR_CONDICIONADO, DRENO_AR

### DRENAGEM
BUEIRO, BUEIRO_TUBULAR, BUEIRO_CELULAR, BUEIRO_CAIXAO, BOCA_LOBO, CAIXA_RALO, SARJETA, MEIO_FIO, DESCIDA_DAGUA, ESCADA_HIDRAULICA, DISSIPADOR, BACIA_CONTENCAO, CANALETA, VALETA, DRENO, DRENO_PROFUNDO, GABIAO, COLCHAO_RENO

### TERRAPLENAGEM
CORTE, ATERRO, CORTE_ATERRO, COMPACTACAO, TERRACAGEM, ESCAVACAO, BOTA_FORA, REGULARIZACAO_PLATAFORMA, TALUDE, PROTECAO_TALUDE, ENROCAMENTO, GEOTEXTIL

### PAVIMENTACAO
SUB_BASE, BASE, SUB_LEITO, IMPRIMACAO, PINTURA_LIGACAO, CBUQ, CONCRETO_BETUMINOSO, ASFALTO, RECAPEAMENTO, FRESAGEM, REMENDO, PISO_INTERTRAVADO, BLOQUETE, MEIO_FIO_SARJETA, PAVIMENTO_RIGIDO

### OAC
PONTE, VIADUTO, PASSARELA, MURO_ARRIMO, MURO_CONTENCAO, ENCONTRO, PILARETE, ATERRO_ACESSO, CORTINA, OMBREIRA

### OAE
PONTE_ESTAIADA, PONTE_METALICA, VIADUTO_ESPECIAL, TUNEL, APARELHO_APOIO

### SINALIZACAO
PLACA_SINALIZACAO, PLACA_INDICATIVA, PLACA_REGULAMENTACAO, PINTURA_SOLO, FAIXA_PEDESTRE, TACHA, TACHAO, BALIZADOR, DEFENSA, DEFENSA_METALICA, SEMAFORO, SONORIZADOR

### SEGURANCA
ALAMBRADO, CERCA, CERCA_ELETRICA, CERCA_CONCERTINA, CAMERA, CAMERA_SEGURANCA, CFTV, ALARME, SENSOR, FECHADURA, FECHADURA_ELETRONICA, CONTROLE_ACESSO, CANCELA, CATRACA, PORTARIA, GUARITA, CERCA_TELA

### PAISAGISMO
PLANTIO_GRAMA, GRAMA, GRAMADO, JARDIM, JARDINAGEM, ARVORE, HIDROSSEMEADURA, IRRIGACAO, PODA, TRANSPLANTE, PAISAGISMO_ORNAMENTAL, CANTEIRO

### MANUTENCAO
LIMPEZA_TERRENO, LIMPEZA_OBRA, ROCAGEM, CAPINA, DESMATAMENTO, REMOCAO_ENTULHO, REPARO, MANUTENCAO_PREVENTIVA, PINTURA_MANUTENCAO, LIMPEZA_FACHADA

### DEMOLICAO
DEMOLICAO_TOTAL, DEMOLICAO_PARCIAL, REMOCAO, DESMONTE, CORTE_CONCRETO, APICOAMENTO

### CONTENCAO
CORTINA_ESTACA, TIRANTE, SOLO_GRAMPEADO, MURO_GABIAO, GEOGRELHA, ESTABILIZACAO_TALUDE

### INFRAESTRUTURA
REDE_AGUA, REDE_ESGOTO, REDE_ELETRICA, REDE_TELEFONICA, FIBRA_OPTICA, CABEAMENTO_ESTRUTURADO, POCO_VISITA, GALERIA_TECNICA

### EQUIPAMENTOS
PEDAGIO, CABINE_PEDAGIO, BALANCA, PRACA_PEDAGIO, FREE_FLOW, PORTICO_ELETRONICO, CANCELA_AUTOMATICA, SISTEMA_OCR, EQUIPAMENTO_MONITORAMENTO

### MOBILIARIO
BANCADA, ARMARIO, PRATELEIRA, DIVISORIA, FORRO, PISO_ELEVADO

### INCENDIO
HIDRANTE, EXTINTOR, SPRINKLER, CENTRAL_INCENDIO, PORTA_CORTA_FOGO, DETECTOR_FUMACA

### AUTOMACAO
CABEAMENTO_DADOS, CFTV, CONTROLE_ACESSO_ELETRONICO, BMS, AUTOMACAO_PREDIAL

### OUTROS
- SOMENTE se não encaixar em NENHUMA categoria acima

## 3. DATA
Formato: DD/MM/YYYY (extrair da imagem/legenda)

## 4. REGRAS OBRIGATÓRIAS
- Pintura → ACABAMENTO (NUNCA OUTROS)
- Cerca/Alambrado/Câmera → SEGURANCA
- Limpeza/Roçagem → MANUTENCAO
- Grama/Jardim → PAISAGISMO
- Porta/Janela → ESQUADRIAS
- Use MAIÚSCULAS, _ no lugar de espaços
- Sem acentos

Responda em JSON:
{"portico":"P_11","disciplina":"ACABAMENTO","servico":"PINTURA_EXTERNA","data":"29/08/2025","analise_tecnica":"Descrição...","confidence":0.95,"ocr_text":"texto"}`;

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
