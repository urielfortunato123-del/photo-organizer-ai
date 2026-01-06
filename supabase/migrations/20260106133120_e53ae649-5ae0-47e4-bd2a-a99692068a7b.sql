-- ============================================================================
-- TABELA: frentes_servico (Catálogo de Frentes de Serviço)
-- ============================================================================
CREATE TABLE public.frentes_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  regex_pattern TEXT NOT NULL,
  variacoes TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_frentes_servico_categoria ON public.frentes_servico(categoria);
CREATE INDEX idx_frentes_servico_codigo ON public.frentes_servico(codigo);
CREATE INDEX idx_frentes_servico_ativo ON public.frentes_servico(ativo);

-- RLS
ALTER TABLE public.frentes_servico ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública, escrita autenticada
CREATE POLICY "Frentes de serviço são públicas para leitura"
  ON public.frentes_servico FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir frentes"
  ON public.frentes_servico FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar frentes"
  ON public.frentes_servico FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_frentes_servico_updated_at
  BEFORE UPDATE ON public.frentes_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABELA: categorias_frentes (Categorias de Frentes de Serviço)
-- ============================================================================
CREATE TABLE public.categorias_frentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.categorias_frentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias são públicas para leitura"
  ON public.categorias_frentes FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir categorias"
  ON public.categorias_frentes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar categorias"
  ON public.categorias_frentes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- DADOS INICIAIS: Categorias
-- ============================================================================
INSERT INTO public.categorias_frentes (codigo, nome, descricao, icone, cor, ordem) VALUES
('OAE', 'Obras de Arte Especiais', 'Pontes, viadutos, túneis, passarelas', 'construction', '#ef4444', 1),
('CONTENCAO', 'Obras de Contenção', 'Muros, cortinas, taludes', 'layers', '#f97316', 2),
('RODOVIARIA', 'Infraestrutura Rodoviária', 'Praças, pórticos, BSOs', 'road', '#eab308', 3),
('PAVIMENTACAO', 'Pavimentação', 'Asfalto, recapeamento, fresagem', 'square', '#84cc16', 4),
('TERRAPLENAGEM', 'Terraplenagem', 'Cortes, aterros, movimentação', 'mountain', '#22c55e', 5),
('DRENAGEM', 'Drenagem', 'Sarjetas, bueiros, galerias', 'droplets', '#06b6d4', 6),
('SINALIZACAO', 'Sinalização', 'Horizontal, vertical, defensas', 'signpost', '#3b82f6', 7),
('SANEAMENTO', 'Saneamento', 'Água, esgoto, tratamento', 'waves', '#8b5cf6', 8),
('ELETRICA', 'Elétrica e Telecom', 'Redes, iluminação, subestações', 'zap', '#a855f7', 9),
('EDIFICACAO', 'Edificações', 'Fundações, estruturas, acabamento', 'building', '#ec4899', 10);

-- ============================================================================
-- DADOS INICIAIS: Frentes de Serviço (principais)
-- ============================================================================
INSERT INTO public.frentes_servico (codigo, nome, categoria, subcategoria, regex_pattern, variacoes, ordem) VALUES
-- OAE
('PONTE', 'Ponte', 'OAE', 'Travessia', '\bPONTE[\s\-_]*([A-Z0-9\-]+)?\b', ARRAY['ponte', 'pont', 'bridge'], 1),
('VIADUTO', 'Viaduto', 'OAE', 'Travessia', '\bVIADUTO[\s\-_]*([A-Z0-9\-]+)?\b', ARRAY['viaduto', 'viad'], 2),
('PASSARELA', 'Passarela', 'OAE', 'Pedestres', '\bPASSARELA[\s\-_]*(\d{1,2})?\b', ARRAY['passarela'], 3),
('TUNEL', 'Túnel', 'OAE', 'Subterrâneo', '\bT[UÚ]NEL[\s\-_]*([A-Z0-9\-]+)?\b', ARRAY['túnel', 'tunel', 'tunnel'], 4),
('GALERIA', 'Galeria', 'OAE', 'Drenagem', '\bGALERIA[\s\-_]*([A-Z0-9\-]+)?\b', ARRAY['galeria'], 5),
('OAE', 'OAE (Genérico)', 'OAE', NULL, '\bOAE[\s\-_]*(\d{1,2})?\b', ARRAY['oae', 'obra de arte especial'], 6),

-- Contenção
('CORTINA_ATIRANTADA', 'Cortina Atirantada', 'CONTENCAO', 'Atirantada', '\bCORTINA[\s\-_]*ATIRANTADA\b', ARRAY['cortina atirantada'], 1),
('CORTINA', 'Cortina', 'CONTENCAO', NULL, '\bCORTINA[\s\-_]*(\d{1,2})?\b', ARRAY['cortina'], 2),
('MURO_ARRIMO', 'Muro de Arrimo', 'CONTENCAO', 'Gravidade', '\bMURO[\s\-_]*(DE[\s\-_]*)?(ARRIMO|CONTEN[CÇ][AÃ]O)\b', ARRAY['muro de arrimo', 'muro arrimo'], 3),
('GABIAO', 'Gabião', 'CONTENCAO', 'Flexível', '\bGABI[AÃ]O\b', ARRAY['gabião', 'gabiao'], 4),
('SOLO_GRAMPEADO', 'Solo Grampeado', 'CONTENCAO', 'Reforçado', '\bSOLO[\s\-_]*GRAMPEADO\b', ARRAY['solo grampeado'], 5),
('TERRA_ARMADA', 'Terra Armada', 'CONTENCAO', 'Reforçado', '\bTERRA[\s\-_]*ARMADA\b', ARRAY['terra armada'], 6),
('TIRANTE', 'Tirante', 'CONTENCAO', 'Ancoragem', '\bTIRANTE[\s\-_]*(T?\d+)?\b', ARRAY['tirante', 'anchor'], 7),
('TALUDE', 'Talude', 'CONTENCAO', 'Natural', '\bTALUDE[\s\-_]*(\d{1,2})?\b', ARRAY['talude', 'encosta'], 8),

-- Rodoviária
('BSO', 'BSO - Base de Serviço', 'RODOVIARIA', 'Operação', '\bBSO[\s\-_]*(\d{1,2})\b', ARRAY['bso', 'base de serviço'], 1),
('PORTICO', 'Pórtico', 'RODOVIARIA', 'Sinalização', '\bP[OÓ]RTICO[\s\-_]*(\d{1,2})?\b', ARRAY['pórtico', 'portico'], 2),
('FREE_FLOW', 'Free Flow', 'RODOVIARIA', 'Pedágio', '\bFREE[\s\-_]?FLOW[\s\-_]*(P[\-\s]*\d+|[A-Z]?\d+)?\b', ARRAY['free flow', 'freeflow'], 3),
('PRACA_PEDAGIO', 'Praça de Pedágio', 'RODOVIARIA', 'Pedágio', '\bPRA[CÇ]A[\s\-_]*(DE[\s\-_]*)?(PED[AÁ]GIO)?\b', ARRAY['praça de pedágio'], 4),
('PMV', 'PMV - Painel Mensagem', 'RODOVIARIA', 'Sinalização', '\bPMV[\s\-_]*(\d{1,2})?\b', ARRAY['pmv', 'painel mensagem variável'], 5),
('CCO', 'CCO - Centro Controle', 'RODOVIARIA', 'Operação', '\bCCO[\s\-_]*(\d{1,2})?\b', ARRAY['cco', 'centro de controle'], 6),
('SAU', 'SAU - Atendimento Usuário', 'RODOVIARIA', 'Operação', '\bSAU[\s\-_]*(\d{1,2})?\b', ARRAY['sau'], 7),

-- Pavimentação
('PAVIMENTACAO', 'Pavimentação', 'PAVIMENTACAO', NULL, '\bPAVIMENTA[CÇ][AÃ]O\b', ARRAY['pavimentação'], 1),
('RECAPEAMENTO', 'Recapeamento', 'PAVIMENTACAO', 'Restauração', '\bRECAP(EAMENTO|E)?\b', ARRAY['recapeamento', 'recape'], 2),
('FRESAGEM', 'Fresagem', 'PAVIMENTACAO', 'Restauração', '\bFRESA(GEM)?\b', ARRAY['fresagem', 'fresa'], 3),
('CBUQ', 'CBUQ', 'PAVIMENTACAO', 'Revestimento', '\bCBUQ\b', ARRAY['cbuq', 'concreto betuminoso'], 4),

-- Terraplenagem
('TERRAPLENAGEM', 'Terraplenagem', 'TERRAPLENAGEM', NULL, '\bTERRAPLENAGEM\b', ARRAY['terraplenagem'], 1),
('ATERRO', 'Aterro', 'TERRAPLENAGEM', 'Movimento', '\bATERRO\b', ARRAY['aterro'], 2),
('CORTE', 'Corte', 'TERRAPLENAGEM', 'Movimento', '\b(CORTE|ESCAVA[CÇ][AÃ]O)\b', ARRAY['corte', 'escavação'], 3),
('BOTA_FORA', 'Bota-Fora', 'TERRAPLENAGEM', 'Descarte', '\bBOTA[\s\-_]*FORA\b', ARRAY['bota-fora'], 4),

-- Drenagem
('DRENAGEM', 'Drenagem', 'DRENAGEM', NULL, '\bDRENAGEM\b', ARRAY['drenagem'], 1),
('SARJETA', 'Sarjeta', 'DRENAGEM', 'Superficial', '\bSARJETA\b', ARRAY['sarjeta'], 2),
('BUEIRO', 'Bueiro', 'DRENAGEM', 'Travessia', '\bBUEIRO\b', ARRAY['bueiro'], 3),
('VALETA', 'Valeta', 'DRENAGEM', 'Superficial', '\bVALETA\b', ARRAY['valeta'], 4),

-- Sinalização
('SINALIZACAO_HORIZONTAL', 'Sinalização Horizontal', 'SINALIZACAO', 'Horizontal', '\bSINALIZA[CÇ][AÃ]O[\s\-_]*HORIZONTAL\b', ARRAY['sinalização horizontal'], 1),
('SINALIZACAO_VERTICAL', 'Sinalização Vertical', 'SINALIZACAO', 'Vertical', '\bSINALIZA[CÇ][AÃ]O[\s\-_]*VERTICAL\b', ARRAY['sinalização vertical'], 2),
('DEFENSA', 'Defensa Metálica', 'SINALIZACAO', 'Segurança', '\b(DEFENSA|GUARD[\s\-_]*RAIL)\b', ARRAY['defensa', 'guardrail'], 3),
('BARREIRA_CONCRETO', 'Barreira de Concreto', 'SINALIZACAO', 'Segurança', '\b(BARREIRA[\s\-_]*(DE[\s\-_]*)?CONCRETO|NEW[\s\-_]*JERSEY)\b', ARRAY['barreira de concreto', 'new jersey'], 4),

-- Saneamento
('REDE_AGUA', 'Rede de Água', 'SANEAMENTO', 'Água', '\b(REDE[\s\-_]*(DE[\s\-_]*)?[AÁ]GUA|ADUTORA)\b', ARRAY['rede de água', 'adutora'], 1),
('REDE_ESGOTO', 'Rede de Esgoto', 'SANEAMENTO', 'Esgoto', '\b(REDE[\s\-_]*(DE[\s\-_]*)?ESGOTO|COLETOR)\b', ARRAY['rede de esgoto'], 2),
('ETE', 'ETE', 'SANEAMENTO', 'Tratamento', '\bETE\b', ARRAY['ete', 'estação tratamento esgoto'], 3),
('ETA', 'ETA', 'SANEAMENTO', 'Tratamento', '\bETA\b', ARRAY['eta', 'estação tratamento água'], 4),

-- Elétrica
('REDE_ELETRICA', 'Rede Elétrica', 'ELETRICA', NULL, '\bREDE[\s\-_]*EL[EÉ]TRICA\b', ARRAY['rede elétrica'], 1),
('SUBESTACAO', 'Subestação', 'ELETRICA', 'Transformação', '\bSUBESTA[CÇ][AÃ]O\b', ARRAY['subestação'], 2),
('ILUMINACAO', 'Iluminação', 'ELETRICA', 'Iluminação', '\bILUMINA[CÇ][AÃ]O\b', ARRAY['iluminação'], 3),

-- Edificação
('FUNDACAO', 'Fundação', 'EDIFICACAO', 'Infraestrutura', '\b(FUNDA[CÇ][AÃ]O|ESTACA|SAPATA)\b', ARRAY['fundação', 'estaca', 'sapata'], 1),
('ESTRUTURA', 'Estrutura', 'EDIFICACAO', 'Estrutura', '\bESTRUTURA\b', ARRAY['estrutura'], 2),
('ALVENARIA', 'Alvenaria', 'EDIFICACAO', 'Vedação', '\bALVENARIA\b', ARRAY['alvenaria'], 3);
