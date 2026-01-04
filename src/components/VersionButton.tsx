import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Versão atual do aplicativo
export const APP_VERSION = '1.2.0';

// Histórico de versões com melhorias
const CHANGELOG = [
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

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(VERSION_KEY);
    if (!lastSeenVersion) {
      // First visit - show changelog
      setHasUpdate(true);
    } else if (lastSeenVersion !== APP_VERSION) {
      // New version available
      setHasUpdate(true);
    }
  }, []);

  const handleOpenChangelog = () => {
    setShowChangelog(true);
    setHasUpdate(false);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenChangelog}
        className={`relative gap-2 text-muted-foreground hover:text-foreground ${className}`}
      >
        {hasUpdate && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
        )}
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-mono">v{APP_VERSION}</span>
      </Button>

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
                    <span className="text-xs text-primary-foreground bg-primary px-2 py-0.5 rounded font-medium">
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
