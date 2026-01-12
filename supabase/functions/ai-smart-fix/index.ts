import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixRequest {
  results: Array<{
    index: number;
    filename: string;
    service?: string;
    dest?: string;
    atividade?: string;
    rodovia?: string;
    data_detectada?: string;
    hora?: string;
    imageBase64?: string; // Imagem em base64 para extração de data
  }>;
  contratoKey?: string;
}

interface FixedResult {
  index: number;
  correcoes: {
    service?: string;
    dest?: string;
    atividade?: string;
    rodovia?: string;
    data_detectada?: string;
    hora?: string;
  };
  errosCorrigidos: string[];
  naoCorrigido: boolean; // true se a IA não conseguiu corrigir
  motivo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { results, contratoKey } = await req.json() as FixRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log(`[AI-Smart-Fix] Processando ${results.length} resultados...`);

    const fixedResults: FixedResult[] = [];
    
    // Processa em lotes de 5 para não sobrecarregar
    const batchSize = 5;
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (result) => {
        try {
          // Se não tem data e tem imagem, tenta extrair da imagem
          let dataExtraida: string | undefined;
          let horaExtraida: string | undefined;
          
          if (!result.data_detectada && result.imageBase64) {
            console.log(`[AI-Smart-Fix] Extraindo data da imagem: ${result.filename}`);
            const extracted = await extractDateFromImage(result.imageBase64, LOVABLE_API_KEY);
            dataExtraida = extracted.data;
            horaExtraida = extracted.hora;
          }
          
          // Corrige textos OCR
          const correcaoTexto = await correctOCRTexts({
            service: result.service,
            dest: result.dest,
            atividade: result.atividade,
            rodovia: result.rodovia,
          }, contratoKey, LOVABLE_API_KEY);
          
          const errosCorrigidos: string[] = [];
          const correcoes: FixedResult['correcoes'] = {};
          let naoCorrigido = false;
          
          // Aplica correções de texto
          if (correcaoTexto.service && correcaoTexto.service !== result.service) {
            correcoes.service = correcaoTexto.service;
            errosCorrigidos.push(`Serviço: "${result.service}" → "${correcaoTexto.service}"`);
          }
          if (correcaoTexto.dest && correcaoTexto.dest !== result.dest) {
            correcoes.dest = correcaoTexto.dest;
            errosCorrigidos.push(`Estrutura: "${result.dest}" → "${correcaoTexto.dest}"`);
          }
          if (correcaoTexto.atividade && correcaoTexto.atividade !== result.atividade) {
            correcoes.atividade = correcaoTexto.atividade;
            errosCorrigidos.push(`Atividade: "${result.atividade}" → "${correcaoTexto.atividade}"`);
          }
          if (correcaoTexto.rodovia && correcaoTexto.rodovia !== result.rodovia) {
            correcoes.rodovia = correcaoTexto.rodovia;
            errosCorrigidos.push(`Rodovia: "${result.rodovia}" → "${correcaoTexto.rodovia}"`);
          }
          
          // Aplica data extraída da imagem
          if (dataExtraida && !result.data_detectada) {
            correcoes.data_detectada = dataExtraida;
            errosCorrigidos.push(`Data extraída da imagem: ${dataExtraida}`);
          }
          if (horaExtraida && !result.hora) {
            correcoes.hora = horaExtraida;
            errosCorrigidos.push(`Hora extraída da imagem: ${horaExtraida}`);
          }
          
          // Verifica se ainda tem problemas não resolvidos
          const temErroTexto = correcaoTexto.temErrosNaoCorrigidos;
          const temErroData = !result.data_detectada && !dataExtraida;
          
          if (temErroTexto || temErroData) {
            naoCorrigido = true;
          }
          
          return {
            index: result.index,
            correcoes,
            errosCorrigidos,
            naoCorrigido,
            motivo: naoCorrigido ? 
              (temErroData ? "Não foi possível extrair data da imagem" : "Texto com erros não identificados") : 
              undefined,
          };
          
        } catch (err) {
          console.error(`[AI-Smart-Fix] Erro no item ${result.index}:`, err);
          return {
            index: result.index,
            correcoes: {},
            errosCorrigidos: [],
            naoCorrigido: true,
            motivo: err instanceof Error ? err.message : "Erro desconhecido",
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      fixedResults.push(...batchResults);
      
      // Delay entre lotes para evitar rate limit
      if (i + batchSize < results.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const totalCorrigidos = fixedResults.filter(r => r.errosCorrigidos.length > 0).length;
    const totalNaoCorrigidos = fixedResults.filter(r => r.naoCorrigido).length;
    
    console.log(`[AI-Smart-Fix] Concluído: ${totalCorrigidos} corrigidos, ${totalNaoCorrigidos} não corrigidos`);

    return new Response(JSON.stringify({
      results: fixedResults,
      resumo: {
        total: results.length,
        corrigidos: totalCorrigidos,
        naoCorrigidos: totalNaoCorrigidos,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI-Smart-Fix] Erro geral:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        results: [],
        resumo: { total: 0, corrigidos: 0, naoCorrigidos: 0 }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Extrai data e hora de uma imagem usando visão da IA
async function extractDateFromImage(imageBase64: string, apiKey: string): Promise<{ data?: string; hora?: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise esta imagem de obra/construção e extraia APENAS a data e hora visíveis na foto.
                
Procure por:
- Data impressa na imagem (geralmente no canto, formato DD/MM/YYYY ou similar)
- Hora impressa na imagem (formato HH:MM ou HH:MM:SS)
- Marcas d'água com data/hora
- Legendas com data/hora

IMPORTANTE: Retorne APENAS JSON válido, sem explicações:
{
  "data": "DD/MM/YYYY" ou null se não encontrar,
  "hora": "HH:MM" ou null se não encontrar,
  "encontrou": true/false
}

Se não encontrar data/hora visível, retorne null nos campos.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[extractDateFromImage] Erro API: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return {};
    
    // Extrai JSON da resposta
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    const result = JSON.parse(jsonContent);
    
    return {
      data: result.data || undefined,
      hora: result.hora || undefined,
    };
    
  } catch (err) {
    console.error("[extractDateFromImage] Erro:", err);
    return {};
  }
}

// Corrige textos OCR com erros ortográficos
async function correctOCRTexts(
  texts: { service?: string; dest?: string; atividade?: string; rodovia?: string },
  contratoKey: string | undefined,
  apiKey: string
): Promise<{ service?: string; dest?: string; atividade?: string; rodovia?: string; temErrosNaoCorrigidos: boolean }> {
  try {
    const textsToFix = Object.entries(texts)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    
    if (!textsToFix) {
      return { temErrosNaoCorrigidos: false };
    }
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em correção de OCR para obras rodoviárias.

Corrija erros de:
1. CASE MISTO: "FRee_FLOW" → "FREE_FLOW", "teRRaplenagem" → "TERRAPLENAGEM"
2. ACENTUAÇÃO: "manuteno" → "MANUTENÇÃO", "instalao" → "INSTALAÇÃO", "escavao" → "ESCAVAÇÃO"
3. CARACTERES TROCADOS: 0 por O, 1 por I, etc.
4. PALAVRAS TÉCNICAS: pavimentação, terraplenagem, drenagem, sinalização, etc.

REGRAS:
- Converta TUDO para MAIÚSCULAS
- Mantenha underscores (_) como separadores
- Não invente informação, apenas corrija erros de leitura

Responda APENAS com JSON:
{
  "service": "valor corrigido ou null",
  "dest": "valor corrigido ou null", 
  "atividade": "valor corrigido ou null",
  "rodovia": "valor corrigido ou null",
  "temErrosNaoCorrigidos": false
}`
          },
          {
            role: "user",
            content: `Corrija os seguintes textos OCR${contratoKey ? ` (contrato: ${contratoKey})` : ''}:

${textsToFix}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`[correctOCRTexts] Erro API: ${response.status}`);
      return { temErrosNaoCorrigidos: true };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return { temErrosNaoCorrigidos: true };
    
    // Extrai JSON
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    return JSON.parse(jsonContent);
    
  } catch (err) {
    console.error("[correctOCRTexts] Erro:", err);
    return { temErrosNaoCorrigidos: true };
  }
}
