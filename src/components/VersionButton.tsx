import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, Download, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Versão local do aplicativo
export const APP_VERSION = '2.0.0';

// Changelog local (fallback)
const LOCAL_CHANGELOG = [
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
];

interface VersionRelease {
  version: string;
  date: string;
  changes: string[];
}

interface VersionCheckResponse {
  currentVersion: string;
  hasUpdate: boolean;
  changelog: VersionRelease[];
  newVersions: VersionRelease[];
  checkedAt: string;
}

const VERSION_KEY = 'obraphoto_last_seen_version';
const LAST_CHECK_KEY = 'obraphoto_last_version_check';

interface VersionButtonProps {
  className?: string;
}

const VersionButton: React.FC<VersionButtonProps> = ({ className }) => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [changelog, setChangelog] = useState<VersionRelease[]>(LOCAL_CHANGELOG);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // Verifica atualização via API
  const checkForUpdates = useCallback(async (showToast = true) => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke<VersionCheckResponse>('check-version', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = data as VersionCheckResponse | null;
      
      if (error || !response) {
        console.error('Error checking version:', error);
        if (showToast) {
          toast.error('Erro ao verificar atualizações', {
            description: 'Usando dados locais.',
          });
        }
        setChangelog(LOCAL_CHANGELOG);
        return;
      }

      setServerVersion(response.currentVersion);
      setChangelog(response.changelog || LOCAL_CHANGELOG);
      setLastChecked(new Date().toLocaleString('pt-BR'));
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

      const needsUpdate = response.currentVersion !== APP_VERSION;
      setHasUpdate(needsUpdate);

      if (showToast) {
        if (needsUpdate) {
          toast.success('🎉 Nova versão disponível!', {
            description: `Versão ${response.currentVersion} disponível. Recarregue para atualizar.`,
            action: {
              label: 'Ver novidades',
              onClick: () => setShowChangelog(true),
            },
          });
          setShowChangelog(true);
        } else {
          toast.success('✅ Você está na versão mais recente!', {
            description: `ObraPhoto v${APP_VERSION}`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to check version:', err);
      if (showToast) {
        toast.error('Falha na verificação', {
          description: 'Não foi possível conectar ao servidor.',
        });
      }
      setChangelog(LOCAL_CHANGELOG);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Verifica no mount e a cada 30 min
  useEffect(() => {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // Verifica na primeira vez ou se passou 30 min
    if (!lastCheck || (now - new Date(lastCheck).getTime()) > thirtyMinutes) {
      checkForUpdates(false);
    }
    
    // Verifica se é primeira visita
    const lastSeenVersion = localStorage.getItem(VERSION_KEY);
    if (!lastSeenVersion) {
      setHasUpdate(true);
      toast.info('Bem-vindo ao ObraPhoto!', {
        description: `Versão ${APP_VERSION} - Clique para ver as novidades.`,
        duration: 5000,
      });
    } else if (lastSeenVersion !== APP_VERSION) {
      setHasUpdate(true);
    }
  }, [checkForUpdates]);

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
          onClick={() => checkForUpdates(true)}
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
            {lastChecked && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                Última verificação: {lastChecked}
              </p>
            )}
            {serverVersion && serverVersion !== APP_VERSION && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm text-primary font-medium">
                  🎉 Nova versão disponível: v{serverVersion}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recarregue o app para atualizar
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {changelog.map((release, index) => (
              <div
                key={release.version}
                className={`relative pl-6 pb-6 ${
                  index < changelog.length - 1 ? 'border-l-2 border-border' : ''
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
                  {release.version === APP_VERSION && (
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
