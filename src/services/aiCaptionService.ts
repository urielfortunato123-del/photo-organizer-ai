/**
 * Serviço para sugestão de legendas via IA
 */

import { supabase } from "@/integrations/supabase/client";
import { FotoReport, buildAICaptionPrompt } from "@/utils/normalizationValidation";

interface CaptionResult {
  id?: string | number;
  caption: string;
}

interface BatchCaptionResponse {
  success: boolean;
  results?: CaptionResult[];
  error?: string;
}

interface SingleCaptionResponse {
  success: boolean;
  caption?: string;
  error?: string;
}

/**
 * Sugere legenda para uma única foto via IA
 */
export async function suggestCaption(
  contratoKey: string,
  foto: FotoReport
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke<SingleCaptionResponse>(
      "suggest-caption",
      {
        body: { contratoKey, foto },
      }
    );

    if (error) {
      console.error("Erro ao sugerir legenda:", error);
      throw new Error(error.message);
    }

    if (!data?.success) {
      throw new Error(data?.error || "Falha ao gerar legenda");
    }

    return data.caption || foto.descricao || "";
  } catch (err) {
    console.error("suggestCaption error:", err);
    // Retorna descrição original em caso de erro
    return foto.descricao || "";
  }
}

/**
 * Sugere legendas para múltiplas fotos via IA (em lote)
 */
export async function suggestCaptionsBatch(
  contratoKey: string,
  fotos: FotoReport[],
  limit: number = 25
): Promise<Map<string | number, string>> {
  const results = new Map<string | number, string>();

  try {
    const { data, error } = await supabase.functions.invoke<BatchCaptionResponse>(
      "suggest-caption",
      {
        body: { contratoKey, fotos, limit },
      }
    );

    if (error) {
      console.error("Erro ao sugerir legendas em lote:", error);
      throw new Error(error.message);
    }

    if (!data?.success || !data.results) {
      throw new Error(data?.error || "Falha ao gerar legendas");
    }

    // Popula o mapa com os resultados
    for (const result of data.results) {
      if (result.id !== undefined) {
        results.set(result.id, result.caption);
      }
    }

    return results;
  } catch (err) {
    console.error("suggestCaptionsBatch error:", err);
    // Retorna mapa vazio em caso de erro
    return results;
  }
}

/**
 * Cria função de sugestão de legenda compatível com prepareReportForExport
 */
export function createAICaptionFn(): (params: { contratoKey: string; foto: FotoReport }) => Promise<string> {
  return async ({ contratoKey, foto }) => {
    return suggestCaption(contratoKey, foto);
  };
}

/**
 * Gera prompt para uso direto (caso queira usar em outro contexto)
 */
export { buildAICaptionPrompt };
