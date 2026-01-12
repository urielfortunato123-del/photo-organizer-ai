-- Tabela para armazenar termos de correção OCR customizados
CREATE TABLE public.ocr_dictionary_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termo_errado VARCHAR(100) NOT NULL,
  termo_correto VARCHAR(100) NOT NULL,
  contrato_key VARCHAR(50) DEFAULT 'GLOBAL',
  ativo BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(termo_errado, contrato_key)
);

-- Índices para busca rápida
CREATE INDEX idx_ocr_dictionary_contrato ON public.ocr_dictionary_terms(contrato_key);
CREATE INDEX idx_ocr_dictionary_ativo ON public.ocr_dictionary_terms(ativo) WHERE ativo = true;

-- Enable RLS
ALTER TABLE public.ocr_dictionary_terms ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ler, apenas autenticados podem criar/editar
CREATE POLICY "Termos são visíveis para todos" 
ON public.ocr_dictionary_terms 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem criar termos" 
ON public.ocr_dictionary_terms 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar termos" 
ON public.ocr_dictionary_terms 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar termos" 
ON public.ocr_dictionary_terms 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_ocr_dictionary_updated_at
BEFORE UPDATE ON public.ocr_dictionary_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();