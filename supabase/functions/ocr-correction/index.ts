import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRCorrectionRequest {
  textoOCR: string;
  contratoKey?: string;
  campos?: {
    localizacao?: string;
    endereco?: string;
    frenteServico?: string;
    empresa?: string;
    data?: string;
    hora?: string;
  };
}

interface OCRCorrectionResponse {
  textoCorrigido: string;
  camposCorrigidos: {
    localizacao?: string;
    endereco?: string;
    frenteServico?: string;
    empresa?: string;
    data?: string;
    hora?: string;
  };
  correcoes: Array<{
    original: string;
    corrigido: string;
    tipo: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textoOCR, contratoKey, campos } = await req.json() as OCRCorrectionRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um especialista em correção de texto OCR para relatórios de obras rodoviárias e engenharia civil.

Sua tarefa é analisar o texto extraído por OCR e corrigir erros comuns de leitura, como:
- Confusão entre letras similares: O/0, I/1/l, S/5, B/8, Z/2, G/6
- Caracteres trocados ou faltando
- Palavras técnicas mal lidas (asfalto, concreto, drenagem, sinalização, etc.)
- Nomes de rodovias (BR-xxx, SP-xxx)
- Quilometragens (km xxx,xxx)
- Datas no formato DD/MM/YYYY
- Códigos de serviço e frentes de trabalho

REGRAS:
1. Mantenha o significado original, apenas corrija erros de leitura
2. Preserve formatação de datas, KMs e códigos
3. Use vocabulário técnico de construção civil/rodoviária
4. Se não tiver certeza, mantenha o original

Responda APENAS com um JSON válido no formato:
{
  "textoCorrigido": "texto completo corrigido",
  "camposCorrigidos": {
    "localizacao": "valor corrigido ou null",
    "endereco": "valor corrigido ou null",
    "frenteServico": "valor corrigido ou null",
    "empresa": "valor corrigido ou null",
    "data": "valor corrigido ou null",
    "hora": "valor corrigido ou null"
  },
  "correcoes": [
    {"original": "texto errado", "corrigido": "texto certo", "tipo": "tipo do erro"}
  ]
}`;

    const userPrompt = `Analise e corrija o seguinte texto OCR${contratoKey ? ` do contrato ${contratoKey}` : ''}:

TEXTO OCR:
${textoOCR}

${campos ? `CAMPOS EXTRAÍDOS:
- Localização: ${campos.localizacao || 'não identificado'}
- Endereço: ${campos.endereco || 'não identificado'}
- Frente de Serviço: ${campos.frenteServico || 'não identificado'}
- Empresa: ${campos.empresa || 'não identificado'}
- Data: ${campos.data || 'não identificado'}
- Hora: ${campos.hora || 'não identificado'}` : ''}

Retorne o JSON com as correções.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Extrai JSON da resposta (pode vir com markdown)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const result: OCRCorrectionResponse = JSON.parse(jsonContent);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na correção OCR:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        textoCorrigido: null,
        camposCorrigidos: {},
        correcoes: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
