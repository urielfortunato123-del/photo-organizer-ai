import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Table as TableIcon, 
  FolderTree, 
  HelpCircle,
  Sparkles,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import logoObraphoto from '@/assets/logo-obraphoto.png';
import VersionButton from './VersionButton';
import { useAuth } from '@/hooks/useAuth';

interface GnomeSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  resultsCount: number;
}

const GnomeSidebar: React.FC<GnomeSidebarProps> = ({ 
  activeTab, 
  onTabChange,
  resultsCount 
}) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const menuItems = [
    { 
      id: 'upload', 
      label: 'Upload', 
      icon: Upload,
      description: 'Adicionar fotos'
    },
    { 
      id: 'results', 
      label: 'Resultados', 
      icon: TableIcon,
      description: 'Ver análises',
      badge: resultsCount > 0 ? resultsCount : undefined
    },
    { 
      id: 'tree', 
      label: 'Árvore', 
      icon: FolderTree,
      description: 'Estrutura de pastas'
    },
  ];

  return (
    <aside className="w-64 flex flex-col glass-sidebar h-full">
      {/* Logo Section with macOS traffic lights */}
      <div className="p-5 border-b border-glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="macos-traffic-lights">
            <div className="macos-btn macos-btn-close" />
            <div className="macos-btn macos-btn-minimize" />
            <div className="macos-btn macos-btn-maximize" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={logoObraphoto} 
              alt="ObraPhoto AI" 
              className="w-11 h-11 object-contain"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground tracking-tight">ObraPhoto</h1>
            <p className="text-xs text-muted-foreground">Análise com IA</p>
          </div>
        </div>
      </div>

      {/* User Info with glass effect */}
      <div className="p-4 border-b border-glass">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center ring-2 ring-white/10">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.empresa || 'Usuário'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "gnome-sidebar-item w-full text-left",
              activeTab === item.id && "active"
            )}
          >
            <item.icon className="w-5 h-5" />
            <div className="flex-1">
              <span className="block font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* How to Use Link */}
        <button
          onClick={() => navigate('/como-usar')}
          className="gnome-sidebar-item w-full text-left mt-4"
        >
          <HelpCircle className="w-5 h-5" />
          <div className="flex-1">
            <span className="block font-medium">Como Usar</span>
          </div>
        </button>
      </nav>

      {/* AI Status Card with enhanced glass effect */}
      <div className="p-4 space-y-3">
        <div className="glass-card p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">IA Integrada</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gemini 2.5 Flash para análise de imagens em tempo real
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(142_76%_36%/0.6)]" />
              <span className="text-xs text-success font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Auth Button with glass style */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full glass-btn text-sm"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
        
        {/* Version Button */}
        <div className="flex justify-center">
          <VersionButton />
        </div>
      </div>
    </aside>
  );
};

export default GnomeSidebar;
