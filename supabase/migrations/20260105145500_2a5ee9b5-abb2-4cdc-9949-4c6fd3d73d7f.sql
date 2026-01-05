-- Tabela de conhecimento de obras (base de conhecimento para OCR/IA)
CREATE TABLE public.obras_conhecimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identificação principal
  codigo_normalizado TEXT NOT NULL, -- Ex: FREE_FLOW_P17, BSO_04, CORTINA_01
  nome_exibicao TEXT NOT NULL, -- Ex: Free Flow P17, BSO 04
  tipo TEXT NOT NULL, -- Ex: portal, estrutura, cortina, bso, free_flow, habitechne
  
  -- Variações de escrita (para matching OCR)
  variacoes TEXT[] NOT NULL DEFAULT '{}', -- Ex: ['free flow p17', 'freeflow p17', 'ff p17', 'obra free flow p17']
  
  -- Dados da localização
  rodovia TEXT, -- Ex: SP-070
  km_inicio NUMERIC,
  km_fim NUMERIC,
  sentido TEXT, -- Ex: LESTE, OESTE, NORTE, SUL
  
  -- Dados administrativos
  contratada TEXT, -- Ex: CCR, Arteris
  contrato TEXT,
  
  -- Documentação técnica
  descricao TEXT, -- Descrição da obra
  especificacoes JSONB DEFAULT '{}', -- Especificações técnicas em JSON
  
  -- Geo-localização
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Controle de aprendizado
  confianca INTEGER DEFAULT 100, -- 0-100: quanto maior, mais confiável
  origem TEXT DEFAULT 'manual', -- manual, aprendizado, importacao
  vezes_identificado INTEGER DEFAULT 0, -- quantas vezes foi identificado corretamente
  
  -- Metadados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(codigo_normalizado)
);

-- Tabela de sinônimos/padrões de palavras-chave
CREATE TABLE public.obras_sinonimos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termo_original TEXT NOT NULL, -- Ex: free flow
  termo_normalizado TEXT NOT NULL, -- Ex: FREE_FLOW
  categoria TEXT NOT NULL, -- tipo_obra, rodovia, sentido, contratada
  idioma TEXT DEFAULT 'pt', -- pt, en, es
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(termo_original, categoria)
);

-- Tabela de aprendizado (correções do usuário)
CREATE TABLE public.obras_aprendizado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  texto_ocr TEXT NOT NULL, -- texto que o OCR extraiu
  identificacao_errada TEXT, -- o que o sistema identificou errado
  identificacao_correta TEXT NOT NULL, -- o que o usuário corrigiu
  obra_id UUID REFERENCES public.obras_conhecimento(id),
  aplicado BOOLEAN DEFAULT false, -- se já foi incorporado ao conhecimento
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de documentação técnica
CREATE TABLE public.obras_documentacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES public.obras_conhecimento(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL, -- markdown
  tipo TEXT DEFAULT 'manual', -- manual, especificacao, procedimento
  idioma TEXT DEFAULT 'pt',
  fonte TEXT, -- URL ou nome do documento fonte
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.obras_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_sinonimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_aprendizado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_documentacao ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (conhecimento é compartilhado)
CREATE POLICY "Conhecimento é público para leitura" ON public.obras_conhecimento
  FOR SELECT USING (true);

CREATE POLICY "Sinônimos são públicos para leitura" ON public.obras_sinonimos
  FOR SELECT USING (true);

CREATE POLICY "Documentação é pública para leitura" ON public.obras_documentacao
  FOR SELECT USING (true);

-- Políticas de escrita para usuários autenticados
CREATE POLICY "Usuários autenticados podem inserir conhecimento" ON public.obras_conhecimento
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar conhecimento" ON public.obras_conhecimento
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir sinônimos" ON public.obras_sinonimos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir documentação" ON public.obras_documentacao
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar documentação" ON public.obras_documentacao
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Aprendizado: usuário só vê/edita o próprio
CREATE POLICY "Usuários podem ver próprio aprendizado" ON public.obras_aprendizado
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem inserir aprendizado" ON public.obras_aprendizado
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Índices para busca rápida
CREATE INDEX idx_obras_conhecimento_codigo ON public.obras_conhecimento(codigo_normalizado);
CREATE INDEX idx_obras_conhecimento_tipo ON public.obras_conhecimento(tipo);
CREATE INDEX idx_obras_conhecimento_variacoes ON public.obras_conhecimento USING GIN(variacoes);
CREATE INDEX idx_obras_sinonimos_termo ON public.obras_sinonimos(termo_original);
CREATE INDEX idx_obras_sinonimos_categoria ON public.obras_sinonimos(categoria);

-- Trigger para updated_at
CREATE TRIGGER update_obras_conhecimento_updated_at
  BEFORE UPDATE ON public.obras_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_obras_documentacao_updated_at
  BEFORE UPDATE ON public.obras_documentacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Popular com dados iniciais de obras conhecidas
INSERT INTO public.obras_conhecimento (codigo_normalizado, nome_exibicao, tipo, variacoes) VALUES
  ('FREE_FLOW_P17', 'Free Flow P17', 'free_flow', ARRAY['free flow p17', 'freeflow p17', 'ff p17', 'obra free flow p17', 'p17', 'ff17']),
  ('FREE_FLOW_P18', 'Free Flow P18', 'free_flow', ARRAY['free flow p18', 'freeflow p18', 'ff p18', 'obra free flow p18', 'p18', 'ff18']),
  ('FREE_FLOW_P19', 'Free Flow P19', 'free_flow', ARRAY['free flow p19', 'freeflow p19', 'ff p19', 'obra free flow p19', 'p19', 'ff19']),
  ('HABITECHNE', 'Habitechne', 'habitechne', ARRAY['habitechne', 'habitecne', 'habiteque', 'hab']),
  ('BSO_01', 'BSO 01', 'bso', ARRAY['bso 01', 'bso01', 'bso-01', 'bso_01']),
  ('BSO_02', 'BSO 02', 'bso', ARRAY['bso 02', 'bso02', 'bso-02', 'bso_02']),
  ('BSO_03', 'BSO 03', 'bso', ARRAY['bso 03', 'bso03', 'bso-03', 'bso_03']),
  ('BSO_04', 'BSO 04', 'bso', ARRAY['bso 04', 'bso04', 'bso-04', 'bso_04']),
  ('CORTINA_01', 'Cortina 01', 'cortina', ARRAY['cortina 01', 'cortina01', 'cortina-01', 'cortina_01', 'cort 01']),
  ('CORTINA_02', 'Cortina 02', 'cortina', ARRAY['cortina 02', 'cortina02', 'cortina-02', 'cortina_02', 'cort 02']),
  ('PORTAL_01', 'Portal 01', 'portal', ARRAY['portal 01', 'portal01', 'p01']),
  ('PORTAL_02', 'Portal 02', 'portal', ARRAY['portal 02', 'portal02', 'p02']);

-- Popular sinônimos comuns
INSERT INTO public.obras_sinonimos (termo_original, termo_normalizado, categoria) VALUES
  ('free flow', 'FREE_FLOW', 'tipo_obra'),
  ('freeflow', 'FREE_FLOW', 'tipo_obra'),
  ('ff', 'FREE_FLOW', 'tipo_obra'),
  ('bso', 'BSO', 'tipo_obra'),
  ('cortina', 'CORTINA', 'tipo_obra'),
  ('portal', 'PORTAL', 'tipo_obra'),
  ('habitechne', 'HABITECHNE', 'tipo_obra'),
  ('leste', 'LESTE', 'sentido'),
  ('oeste', 'OESTE', 'sentido'),
  ('norte', 'NORTE', 'sentido'),
  ('sul', 'SUL', 'sentido'),
  ('l', 'LESTE', 'sentido'),
  ('o', 'OESTE', 'sentido'),
  ('east', 'LESTE', 'sentido'),
  ('west', 'OESTE', 'sentido');