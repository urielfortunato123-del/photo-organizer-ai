import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuantityRequest {
  atividades: Array<{
    id: string;
    texto: string;
    unidadeEsperada?: string;
  }>;
}

interface ExtractedQuantity {
  id: string;
  quantidade?: number;
  unidade?: string;
  fonte: string; // Trecho do texto de onde extraiu
  confianca: number; // 0-1
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { atividades }: QuantityRequest = await req.json();
    
    if (!atividades || atividades.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma atividade fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Monta o prompt para extrair quantidades
    const atividadesTexto = atividades.map((a, i) => 
      `[${i + 1}] ${a.texto}${a.unidadeEsperada ? ` (unidade esperada: ${a.unidadeEsperada})` : ''}`
    ).join('\n');

    const prompt = `Analise os seguintes textos de atividades de obra e extraia as QUANTIDADES NUMÉRICAS mencionadas.

Para cada atividade, identifique:
1. O valor numérico (quantidade)
2. A unidade de medida (m², m³, kg, un, ml, traços, caminhões, etc.)
3. O trecho exato do texto de onde extraiu a informação
4. Nível de confiança (0.0 a 1.0)

ATIVIDADES:
${atividadesTexto}

Responda APENAS com um array JSON no formato:
[
  {
    "index": 1,
    "quantidade": 5,
    "unidade": "m³",
    "fonte": "volume 5m³",
    "confianca": 0.95
  },
  {
    "index": 2,
    "quantidade": null,
    "unidade": null,
    "fonte": null,
    "confianca": 0
  }
]

Se não encontrar quantidade, use null. Retorne um item para cada atividade na mesma ordem.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em extração de dados de relatórios de obras. Extraia quantidades numéricas com precisão." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro na API de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extrai o JSON da resposta
    let extracted: Array<{
      index: number;
      quantidade: number | null;
      unidade: string | null;
      fonte: string | null;
      confianca: number;
    }> = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Erro ao parsear resposta:", parseError, content);
    }

    // Mapeia de volta para os IDs originais
    const results: ExtractedQuantity[] = atividades.map((a, i) => {
      const found = extracted.find(e => e.index === i + 1);
      return {
        id: a.id,
        quantidade: found?.quantidade ?? undefined,
        unidade: found?.unidade ?? undefined,
        fonte: found?.fonte ?? "",
        confianca: found?.confianca ?? 0,
      };
    });

    return new Response(
      JSON.stringify({ 
        results,
        total: results.length,
        comQuantidade: results.filter(r => r.quantidade != null).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
