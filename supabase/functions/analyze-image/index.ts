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

    const prompt = `Você é um engenheiro especialista em obras rodoviárias, prediais e industriais.
Analise esta foto de obra e classifique usando EXATAMENTE as categorias abaixo.

## IMPORTANTE: ANÁLISE VISUAL PRIORITÁRIA
Se NÃO houver texto/legenda visível na imagem, você DEVE identificar o serviço pela ANÁLISE VISUAL:
- Retroescavadeira/escavadeira + terra = TERRAPLENAGEM / ESCAVACAO
- Caçamba/caminhão basculante = TERRAPLENAGEM / CARGA_TRANSPORTE  
- Formas de madeira + ferragem = ESTRUTURA / FORMA ou ARMACAO
- Concreto fresco = ESTRUTURA / CONCRETAGEM
- Trabalhador com colher de pedreiro = ALVENARIA ou REVESTIMENTO
- Pintura/rolo/tinta = ACABAMENTO / PINTURA_*
- Tubos PEAD/PVC = DRENAGEM ou HIDRAULICA
- Manômetro/macaco = CONTENCAO / PROTENSAO_TIRANTE
- Barreira de concreto = BARREIRAS / BARREIRA_NEW_JERSEY
- Grama/vegetação plantada = PAISAGISMO / PLANTIO_GRAMA
- Cercas/alambrado = SEGURANCA / ALAMBRADO

Mesmo SEM texto na foto, você consegue identificar o serviço pelos elementos visuais!

## 1. FRENTE DE SERVIÇO (campo "portico" no JSON)
Identifique a frente de serviço, local ou estrutura principal:
- Pórticos: P-10, P 10, P_10, PORTICO 10, Free Flow P-11, Praça 05, BSO
- Cortinas: CORTINA_01, CORTINA_ATIRANTADA_KM_167
- Escavações: ESCAVACAO_BLOCO_A1, ESCAVACAO_NORTE
- Outros: PRACA_PEDAGIO_01, VIADUTO_KM_200, PASSARELA_02, GUARITA_01
Padrão se não identificar: "${defaultPortico || 'NAO_IDENTIFICADO'}"

## 2. DISCIPLINAS E SERVIÇOS

### FUNDACAO
ESTACA_RAIZ, ESTACA_HELICE, ESTACA_FRANKI, ESTACA_PRE_MOLDADA, ESTACA_BROCA, TUBULAO, SAPATA_CORRIDA, SAPATA_ISOLADA, BLOCO_COROAMENTO, BLOCO_FUNDACAO, BALDRAME, VIGA_BALDRAME, ESCAVACAO_FUNDACAO, CONCRETAGEM_BLOCO, CRAVACAO_ESTACA, PERFURACAO_SOLO, PERFURACAO_ROCHA, ARRASAMENTO_ESTACA, PLACA_ANCORAGEM

### ESTRUTURA
PILAR, PILAR_METALICO, PILAR_CONCRETO, PILARETE, VIGA, VIGA_BALDRAME, VIGA_METALICA, LAJE, LAJE_PRE_MOLDADA, LAJE_MACICA, ESTRUTURA_METALICA, PERFIL_METALICO, TRELICA, FORMA, DESFORMA, ARMACAO, FERRAGEM, CONCRETAGEM, CURA_CONCRETO, ESCORAMENTO, RADIER, CALCADA, CALÇADA_TECNICA, MONTAGEM_PILARETES, BASE_CHUMBADOR

### PORTICO_FREE_FLOW
ICAMENTO_PORTICO, MONTAGEM_PORTICO, IMPLANTACAO_PORTICO, FORNECIMENTO_PORTICO, SEMI_PORTICO, BRACO_PROJETADO, INSTALACAO_RFID, TRILHO_RFID, LINHA_VIDA, GUARDA_CORPO_PORTICO, SALA_TECNICA, SALA_GERADOR, CHUMBADOR

### ALVENARIA
ALVENARIA_VEDACAO, ALVENARIA_ESTRUTURAL, BLOCO_CERAMICO, BLOCO_CONCRETO, TIJOLO, PAREDE, MURO, VERGA, CONTRAVERGA, ENCUNHAMENTO, MARCACAO_ALVENARIA

### COBERTURA
TELHADO, TELHA_METALICA, TELHA_CERAMICA, TELHA_FIBROCIMENTO, TELHA_SANDUICHE, CUMEEIRA, RUFO, CALHA, ESTRUTURA_TELHADO, TESOURA, IMPERMEABILIZACAO_COBERTURA, PLATIBANDA, BEIRAL, LIMPEZA_CALHA, DESCIDA_AGUA_PLUVIAL

### REVESTIMENTO
CHAPISCO, EMBOCO, REBOCO, MASSA_CORRIDA, GESSO, GESSO_LISO, CERAMICA, PORCELANATO, PISO, CONTRAPISO, REGULARIZACAO, REVESTIMENTO_FACHADA, PASTILHA, GRANITO, MARMORE, EMASSAMENTO

### ACABAMENTO
PINTURA_INTERNA, PINTURA_EXTERNA, PINTURA_FACHADA, PINTURA_EPOXI, PINTURA_TEXTURA, PINTURA_ACRILICA, PINTURA_LATEX, PINTURA_ESMALTE, PINTURA_PISO, TEXTURA, GRAFIATO, TEXTURA_PROJETADA, MASSA_ACRILICA, SELADOR, VERNIZ, LACA, ESMALTE, RODAPE, RODATETO, MOLDURA, SOLEIRA, PEITORIL, FORRO, FORRO_GESSO, FORRO_PVC, FORRO_DRYWALL, REJUNTAMENTO

### ESQUADRIAS
PORTA, PORTA_MADEIRA, PORTA_METALICA, PORTA_VIDRO, PORTA_CORTA_FOGO, PORTA_ALUMINIO, JANELA, JANELA_ALUMINIO, JANELA_VIDRO, PORTAO, PORTAO_METALICO, PORTAO_AUTOMATICO, GRADIL, GRADE, GUARDA_CORPO, CORRIMAO, VIDRO, VIDRACARIA, ESPELHO, PERSIANA, CORTINA

### IMPERMEABILIZACAO
MANTA_ASFALTICA, MANTA_ALUMINIZADA, IMPERMEABILIZANTE_LIQUIDO, IMPERMEABILIZACAO_LAJE, IMPERMEABILIZACAO_PISO, IMPERMEABILIZACAO_BANHEIRO, JUNTA_DILATACAO, MASTIQUE

### HIDRAULICA
TUBULACAO_AGUA_FRIA, TUBULACAO_AGUA_QUENTE, TUBULACAO_ESGOTO, CAIXA_DAGUA, RESERVATORIO, BOMBA, CASA_BOMBAS, CAIXA_GORDURA, CAIXA_INSPECAO, FOSSA, SUMIDOURO, VASO_SANITARIO, PIA, LAVATORIO, REGISTRO, VALVULA, AQUECEDOR, BOILER, ESGOTAMENTO, PRESSURIZADOR, TANQUE_LOUCA, CUBA_EMBUTIR, ENGATE_FLEXIVEL, BANCADA_GRANITO

### ELETRICA
ELETRODUTO, CABEAMENTO, FIACAO, QUADRO_ELETRICO, QUADRO_DISTRIBUICAO, DISJUNTOR, TOMADA, INTERRUPTOR, LUMINARIA, ILUMINACAO, POSTE_LUZ, ATERRAMENTO, SPDA, PARA_RAIO, SUBESTACAO, TRANSFORMADOR, GERADOR, NOBREAK, PAINEL_ELETRICO, BANCO_DUTOS, PONTO_ELETRICO

### AR_CONDICIONADO
SPLIT, CASSETE, PISO_TETO, CONDENSADORA, EVAPORADORA, DUTO_AR, GRELHA_AR, EXAUSTOR, VENTILACAO, INFRA_AR_CONDICIONADO, DRENO_AR, REMOCAO_AR_CONDICIONADO, INSTALACAO_AR_CONDICIONADO

### DRENAGEM
BUEIRO, BUEIRO_TUBULAR, BUEIRO_CELULAR, BUEIRO_CAIXAO, BSTC, BOCA_LOBO, CAIXA_RALO, CAIXA_COLETORA, SARJETA, MEIO_FIO, DESCIDA_DAGUA, ESCADA_HIDRAULICA, DISSIPADOR, DISSIPADOR_ENERGIA, BACIA_CONTENCAO, CANALETA, VALETA, DRENO, DRENO_PROFUNDO, GABIAO, COLCHAO_RENO, GEODRENO, BARBACA, CANAL_TRAPEZOIDAL

### TERRAPLENAGEM
CORTE, ATERRO, CORTE_ATERRO, COMPACTACAO, TERRACAGEM, ESCAVACAO, ESCAVACAO_MECANIZADA, BOTA_FORA, CARGA_TRANSPORTE, REGULARIZACAO_PLATAFORMA, TALUDE, PROTECAO_TALUDE, ENROCAMENTO, GEOTEXTIL, REATERRO, SOLO_CIMENTO, ROYALTIE_BOTA_FORA, ROYALTIE_JAZIDA

### PAVIMENTACAO
SUB_BASE, BASE, SUB_LEITO, IMPRIMACAO, PINTURA_LIGACAO, CBUQ, CONCRETO_BETUMINOSO, ASFALTO, RECAPEAMENTO, FRESAGEM, FRESAGEM_FUNCIONAL, REMENDO, PISO_INTERTRAVADO, BLOQUETE, MEIO_FIO_SARJETA, PAVIMENTO_RIGIDO, CALCADA_CONCRETO, PISO_PODOTAIL

### OAC
PONTE, VIADUTO, PASSARELA, MURO_ARRIMO, MURO_CONTENCAO, ENCONTRO, PILARETE, ATERRO_ACESSO, CORTINA, OMBREIRA

### OAE
PONTE_ESTAIADA, PONTE_METALICA, VIADUTO_ESPECIAL, TUNEL, APARELHO_APOIO

### SINALIZACAO
PLACA_SINALIZACAO, PLACA_INDICATIVA, PLACA_REGULAMENTACAO, PLACA_AEREA, PLACA_SOLO, PINTURA_SOLO, FAIXA_PEDESTRE, TACHA, TACHAO, BALIZADOR, CATADIOPTRICO, DEFENSA, DEFENSA_METALICA, DEFENSA_SIMPLES, SEMAFORO, SONORIZADOR, SUPORTE_PLACA, SUPORTE_METALICO, SUPORTE_POLIMERICO, TERMINAL_ABATIDO, TERMINAL_ABSORVEDOR, TRANSICAO_DEFENSA_BARREIRA, REMANEJAMENTO_PLACA, REMOCAO_PLACA, IMPLANTACAO_PLACA

### BARREIRAS
BARREIRA_RIGIDA, BARREIRA_NEW_JERSEY, BARREIRA_CONCRETO, BARREIRA_SIMPLES_ALTA, EXECUCAO_BARREIRA

### SEGURANCA
ALAMBRADO, CERCA, CERCA_ELETRICA, CERCA_CONCERTINA, CERCA_TELA, CAMERA, CAMERA_SEGURANCA, CFTV, ALARME, SENSOR, FECHADURA, FECHADURA_ELETRONICA, CONTROLE_ACESSO, CANCELA, CATRACA, PORTARIA, GUARITA, BARRA_APOIO

### PAISAGISMO
PLANTIO_GRAMA, GRAMA, GRAMADO, GRAMA_ESMERALDA, JARDIM, JARDINAGEM, ARVORE, HIDROSSEMEADURA, BIOMANTA, IRRIGACAO, PODA, TRANSPLANTE, PAISAGISMO_ORNAMENTAL, CANTEIRO, REVEGETACAO

### MANUTENCAO
LIMPEZA_TERRENO, LIMPEZA_OBRA, LIMPEZA_MECANIZADA, ROCAGEM, CAPINA, DESMATAMENTO, REMOCAO_ENTULHO, REPARO, MANUTENCAO_PREVENTIVA, PINTURA_MANUTENCAO, LIMPEZA_FACHADA, READEQUACAO_CANAL

### DEMOLICAO
DEMOLICAO_TOTAL, DEMOLICAO_PARCIAL, DEMOLICAO_REVESTIMENTO, DEMOLICAO_ALVENARIA, DEMOLICAO_PISO_CONCRETO, REMOCAO, REMOCAO_FORRO, REMOCAO_LOUCA, REMOCAO_TESOURA, REMOCAO_TELHA, REMOCAO_ACESSORIOS, DESMONTE, CORTE_CONCRETO, APICOAMENTO, SUCATEAMENTO_ESTRUTURA, CARGA_TRANSPORTE_ENTULHO, ESPALHAMENTO_MATERIAL_DEMOLIDO

### CONTENCAO
CORTINA_ATIRANTADA, CORTINA_ESTACA, TIRANTE, PROTENSAO_TIRANTE, SOLO_GRAMPEADO, MURO_GABIAO, GEOGRELHA, ESTABILIZACAO_TALUDE, PERFIL_METALICO_CONTENCAO, TELA_ELETROSSOLDADA, PROJECAO_CONCRETO, INJECAO_CIMENTO

### INFRAESTRUTURA
REDE_AGUA, REDE_ESGOTO, REDE_ELETRICA, REDE_TELEFONICA, FIBRA_OPTICA, CABEAMENTO_ESTRUTURADO, POCO_VISITA, GALERIA_TECNICA

### EQUIPAMENTOS
PEDAGIO, CABINE_PEDAGIO, BALANCA, PRACA_PEDAGIO, FREE_FLOW, PORTICO_ELETRONICO, CANCELA_AUTOMATICA, SISTEMA_OCR, EQUIPAMENTO_MONITORAMENTO

### MOBILIZACAO
MOBILIZACAO, DESMOBILIZACAO, CANTEIRO_OBRAS, MONTAGEM_CANTEIRO

### LOUCAS_METAIS
VASO_SANITARIO, CUBA_EMBUTIR, TANQUE_LOUCA, LAVATORIO, BARRA_APOIO, BANCADA_GRANITO, REGISTRO_PRESSAO, ENGATE_FLEXIVEL, TORNEIRA

### INCENDIO
HIDRANTE, EXTINTOR, SPRINKLER, CENTRAL_INCENDIO, PORTA_CORTA_FOGO, DETECTOR_FUMACA

### ENSAIOS
ENSAIO_LP, ENSAIO_FLUENCIA, ENSAIO_QUALIFICACAO

### OUTROS
- SOMENTE se não encaixar em NENHUMA categoria acima

## 3. DATA
Formato: DD/MM/YYYY

## 4. REGRAS
- Pintura → ACABAMENTO
- Cerca/Alambrado/Câmera → SEGURANCA
- Limpeza/Roçagem → MANUTENCAO
- Grama/Jardim → PAISAGISMO
- Porta/Janela → ESQUADRIAS
- Defensa/Barreira → SINALIZACAO ou BARREIRAS
- Pórtico Free Flow → PORTICO_FREE_FLOW
- Demolição → DEMOLICAO
- Louças/Pias/Vasos → LOUCAS_METAIS
- Use MAIÚSCULAS, _ no lugar de espaços

## 5. FOTOS SEM LEGENDA/OCR
Se não conseguir ler texto/OCR na imagem:
- Analise VISUALMENTE os elementos (equipamentos, materiais, atividade)
- Identifique a disciplina e serviço pelo que está sendo executado
- Use confidence menor (0.6-0.8) quando baseado apenas em visual
- Em "ocr_text" coloque "" (vazio)
- Em "analise_tecnica" descreva detalhadamente o que você VÊ na foto
- Se não identificar frente de serviço, use "${defaultPortico || 'NAO_IDENTIFICADO'}"

Responda SEMPRE em JSON válido:
{"portico":"P_11","disciplina":"ACABAMENTO","servico":"PINTURA_EXTERNA","data":"29/08/2025","analise_tecnica":"Descrição detalhada do que está sendo executado...","confidence":0.95,"ocr_text":"texto lido ou vazio"}`;

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
        max_tokens: 1200,
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

    // Normalize the result
    const normalizedResult = {
      portico: (result.portico || 'NAO_IDENTIFICADO').toUpperCase().replace(/\s+/g, '_'),
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
