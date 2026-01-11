import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Versão atual do aplicativo
export const APP_VERSION = '2.0.0';

// Histórico de versões com melhorias
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

const VERSION_KEY = 'obraphoto_last_seen_version';

interface VersionButtonProps {
  className?: string;
}

const VersionButton: React.FC<VersionButtonProps> = ({ className }) => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(VERSION_KEY);
    if (!lastSeenVersion) {
      // First visit - show changelog
      setHasUpdate(true);
      toast.info('Bem-vindo ao ObraPhoto!', {
        description: `Versão ${APP_VERSION} - Clique no botão de versão para ver as novidades.`,
        duration: 5000,
      });
    } else if (lastSeenVersion !== APP_VERSION) {
      // New version available
      setHasUpdate(true);
      toast.success('Nova versão disponível!', {
        description: `ObraPhoto atualizado para v${APP_VERSION}. Clique para ver as novidades.`,
        duration: 6000,
        action: {
          label: 'Ver novidades',
          onClick: () => handleOpenChangelog(),
        },
      });
    }
  }, []);

  const handleOpenChangelog = () => {
    setShowChangelog(true);
    setHasUpdate(false);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  };

  const handleCheckUpdate = useCallback(async () => {
    setIsChecking(true);
    
    // Simula verificação (em produção, faria request para API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lastSeenVersion = localStorage.getItem(VERSION_KEY);
    
    if (lastSeenVersion !== APP_VERSION) {
      setHasUpdate(true);
      setShowChangelog(true);
      toast.success('🎉 Nova versão encontrada!', {
        description: `Versão ${APP_VERSION} disponível com novas funcionalidades.`,
      });
    } else {
      toast.success('✅ Você está na versão mais recente!', {
        description: `ObraPhoto v${APP_VERSION}`,
      });
    }
    
    setIsChecking(false);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenChangelog}
          className="relative gap-2 text-muted-foreground hover:text-foreground"
        >
          {hasUpdate && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          )}
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-mono">v{APP_VERSION}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCheckUpdate}
          disabled={isChecking}
          className="gap-1 text-muted-foreground hover:text-foreground text-xs"
        >
          {isChecking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isChecking ? 'Verificando...' : 'Buscar Atualização'}
          </span>
        </Button>
      </div>

      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Novidades do ObraPhoto
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {CHANGELOG.map((release, index) => (
              <div
                key={release.version}
                className={`relative pl-6 pb-6 ${
                  index < CHANGELOG.length - 1 ? 'border-l-2 border-border' : ''
                }`}
              >
                {/* Version dot */}
                <div
                  className={`absolute -left-2 w-4 h-4 rounded-full ${
                    index === 0
                      ? 'bg-primary ring-4 ring-primary/20'
                      : 'bg-muted-foreground/30'
                  }`}
                />

                {/* Version header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-lg font-bold ${
                      index === 0 ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    v{release.version}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {release.date}
                  </span>
                  {index === 0 && (
                    <span className="text-xs text-primary-foreground bg-primary px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Atual
                    </span>
                  )}
                </div>

                {/* Changes list */}
                <ul className="space-y-2">
                  {release.changes.map((change, changeIndex) => (
                    <li
                      key={changeIndex}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-primary mt-1">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-border flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowChangelog(false)}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button onClick={handleRefresh} className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              Recarregar App
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionButton;
