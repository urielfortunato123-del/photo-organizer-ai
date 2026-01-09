-- ========================================
-- CORREÇÕES DE SEGURANÇA - POLÍTICAS RLS
-- ========================================

-- 1. OBRAS_CONHECIMENTO - Adicionar DELETE restritivo (só admins)
CREATE POLICY "Only admins can delete obras conhecimento" 
ON public.obras_conhecimento 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. OBRAS_SINONIMOS - Adicionar DELETE e UPDATE restritivos
CREATE POLICY "Only admins can delete sinonimos" 
ON public.obras_sinonimos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update sinonimos" 
ON public.obras_sinonimos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. OBRAS_DOCUMENTACAO - Adicionar DELETE restritivo
CREATE POLICY "Only admins can delete documentacao" 
ON public.obras_documentacao 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. CATEGORIAS_FRENTES - Adicionar DELETE restritivo
CREATE POLICY "Only admins can delete categorias" 
ON public.categorias_frentes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. FRENTES_SERVICO - Adicionar DELETE restritivo
CREATE POLICY "Only admins can delete frentes servico" 
ON public.frentes_servico 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 6. OBRAS_APRENDIZADO - Corrigir SELECT e adicionar UPDATE/DELETE
-- Primeiro dropar a política SELECT permissiva
DROP POLICY IF EXISTS "Usuários podem ver próprio aprendizado" ON public.obras_aprendizado;

-- Criar política correta (só próprios dados)
CREATE POLICY "Users can view own aprendizado" 
ON public.obras_aprendizado 
FOR SELECT 
USING (auth.uid() = user_id);

-- UPDATE só próprios registros
CREATE POLICY "Users can update own aprendizado" 
ON public.obras_aprendizado 
FOR UPDATE 
USING (auth.uid() = user_id);

-- DELETE só admins
CREATE POLICY "Only admins can delete aprendizado" 
ON public.obras_aprendizado 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 7. TRIAL_SESSIONS - Prevenir DELETE por usuários
CREATE POLICY "Only admins can delete trial sessions" 
ON public.trial_sessions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);