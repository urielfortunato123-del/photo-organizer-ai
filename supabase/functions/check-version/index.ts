import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Versão atual do aplicativo (fonte da verdade)
const CURRENT_VERSION = '2.0.0';

// Changelog completo
const CHANGELOG = [
  {
    version: '2.0.0',
    date: '11/01/2026',
    changes: [
      '🧠 Sistema de aprendizado automático - IA fica mais inteligente a cada análise',
      '📊 Indicador de inteligência no header mostrando evolução do sistema',
      '🏢 Detecção automática de empresa/cliente nas placas',
      '✅ Aplicar campos em lote (Data, Serviço, Disciplina) corrigido',
      '🔄 Banco de conhecimento se atualiza automaticamente',
      '📈 Estatísticas de identificações e variações aprendidas',
      '🔍 Verificação de atualização via API',
    ],
  },
  {
    version: '1.5.0',
    date: '10/01/2026',
    changes: [
      'Botão "Aplicar p/ Todos" com seleção de campos',
      'Edição em lote de múltiplas fotos selecionadas',
      'Correção de bugs no popover de aplicação',
      'Melhorias na detecção de datas',
    ],
  },
  {
    version: '1.4.0',
    date: '08/01/2026',
    changes: [
      'Processamento otimizado em lotes paralelos',
      'Cooldown inteligente para evitar rate limiting',
      'Overlay de cooldown com progresso visual',
      'Botão de pular cooldown',
    ],
  },
  {
    version: '1.3.0',
    date: '04/01/2026',
    changes: [
      'Sistema de login com confirmação por email',
      'Modo degustação: 30 min gratuitos (2x/dia)',
      'Página "Como Usar" com tutorial completo',
      'Perfil de usuário com nome e empresa',
      'Recuperação de senha por email',
    ],
  },
  {
    version: '1.2.0',
    date: '04/01/2026',
    changes: [
      'Resultados aparecem em tempo real durante o processamento',
      'Otimização com cache de imagens para reduzir chamadas à IA',
      'Processamento em lote para maior eficiência',
      'Sistema de versões e changelog',
    ],
  },
  {
    version: '1.1.0',
    date: '03/01/2026',
    changes: [
      'Análise de fotos com IA integrada',
      'Exportação para Excel e ZIP',
      'Edição de resultados inline',
      'Preview de fotos em modal',
    ],
  },
  {
    version: '1.0.0',
    date: '01/01/2026',
    changes: [
      'Lançamento inicial do ObraPhoto',
      'Upload de múltiplas fotos',
      'Classificação por disciplina e serviço',
      'Estrutura de pastas automática',
    ],
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const clientVersion = url.searchParams.get('current');
    
    // Compara versões
    const hasUpdate = clientVersion ? clientVersion !== CURRENT_VERSION : false;
    
    // Encontra versões mais recentes que a do cliente
    const newVersions = clientVersion 
      ? CHANGELOG.filter(v => compareVersions(v.version, clientVersion) > 0)
      : [];

    return new Response(
      JSON.stringify({
        currentVersion: CURRENT_VERSION,
        hasUpdate,
        changelog: CHANGELOG,
        newVersions,
        checkedAt: new Date().toISOString(),
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        } 
      }
    );
  } catch (error) {
    console.error('Error checking version:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check version' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função para comparar versões semânticas
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  return 0;
}
