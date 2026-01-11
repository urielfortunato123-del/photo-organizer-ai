import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptionRequest {
  contratoKey: string;
  foto: {
    id?: string | number;
    filename?: string;
    descricao?: string;
    data?: string;
  };
}

interface BatchCaptionRequest {
  contratoKey: string;
  fotos: Array<{
    id?: string | number;
    filename?: string;
    descricao?: string;
    data?: string;
  }>;
  limit?: number;
}

function buildPrompt(contratoKey: string, foto: CaptionRequest["foto"]): string {
  return `
Você é um assistente técnico de obras rodoviárias.
Sua tarefa: gerar UMA descrição curta e objetiva para legenda de foto de relatório fotográfico.

Regras:
- Escreva em PT-BR.
- Use termos técnicos de obra.
- Sem floreio, sem opinião.
- Máximo 12 palavras.
- Se tiver um código (ex: FREE_FLOW_P10 / BSO_04), mantenha no final.
- Use acentuação correta (EXECUÇÃO, não EXECUCAO).

Contexto do contrato: ${contratoKey}
Texto bruto (OCR/nome de arquivo): ${foto.descricao || foto.filename || ""}

Retorne apenas a legenda final (uma linha).
`.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    
    // Verifica se é requisição em lote ou única
    if (body.fotos && Array.isArray(body.fotos)) {
      // Batch request
      const { contratoKey, fotos, limit = 25 } = body as BatchCaptionRequest;
      
      const results: Array<{ id: string | number | undefined; caption: string }> = [];
      const processLimit = Math.min(fotos.length, limit);

      for (let i = 0; i < processLimit; i++) {
        const foto = fotos[i];
        const raw = (foto.descricao || "").trim();
        
        // Só processa se tiver conteúdo mínimo
        if (!raw || raw.length < 6) {
          results.push({ id: foto.id, caption: raw });
          continue;
        }

        try {
          const prompt = buildPrompt(contratoKey || "GLOBAL", foto);

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { 
                  role: "system", 
                  content: "Você é um assistente técnico especializado em obras rodoviárias. Responda apenas com a legenda solicitada, sem explicações adicionais." 
                },
                { role: "user", content: prompt }
              ],
              max_tokens: 100,
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              // Rate limit - para de processar e retorna o que tem
              console.warn("Rate limit atingido, retornando resultados parciais");
              break;
            }
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const caption = aiData.choices?.[0]?.message?.content?.trim() || raw;
          
          results.push({ id: foto.id, caption });
        } catch (err) {
          console.error(`Erro ao processar foto ${foto.id}:`, err);
          results.push({ id: foto.id, caption: raw });
        }

        // Pequeno delay entre requisições para evitar rate limit
        if (i < processLimit - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // Single request
      const { contratoKey, foto } = body as CaptionRequest;

      if (!foto || (!foto.descricao && !foto.filename)) {
        return new Response(
          JSON.stringify({ error: "Foto com descrição ou filename é obrigatória" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = buildPrompt(contratoKey || "GLOBAL", foto);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { 
              role: "system", 
              content: "Você é um assistente técnico especializado em obras rodoviárias. Responda apenas com a legenda solicitada, sem explicações adicionais." 
            },
            { role: "user", content: prompt }
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const caption = aiData.choices?.[0]?.message?.content?.trim() || "";

      return new Response(
        JSON.stringify({ success: true, caption }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("suggest-caption error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
