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
    <aside className="w-56 flex flex-col glass-sidebar h-full">
      {/* Logo Section with macOS traffic lights */}
      <div className="p-4 border-b border-glass">
        <div className="flex items-center gap-2 mb-3">
          <div className="macos-traffic-lights">
            <div className="macos-btn macos-btn-close" />
            <div className="macos-btn macos-btn-minimize" />
            <div className="macos-btn macos-btn-maximize" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img 
              src={logoObraphoto} 
              alt="ObraPhoto AI" 
              className="w-10 h-10 object-contain"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground tracking-tight text-sm">ObraPhoto</h1>
            <p className="text-[10px] text-muted-foreground">Análise com IA</p>
          </div>
        </div>
      </div>

      {/* User Info with glass effect */}
      <div className="p-3 border-b border-glass">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center ring-1 ring-white/10">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {profile?.empresa || 'Usuário'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "gnome-sidebar-item w-full text-left text-xs",
              activeTab === item.id && "active"
            )}
          >
            <item.icon className="w-4 h-4" />
            <div className="flex-1">
              <span className="block font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* How to Use Link */}
        <button
          onClick={() => navigate('/como-usar')}
          className="gnome-sidebar-item w-full text-left text-xs mt-3"
        >
          <HelpCircle className="w-4 h-4" />
          <div className="flex-1">
            <span className="block font-medium">Como Usar</span>
          </div>
        </button>
      </nav>

      {/* AI Status Card with enhanced glass effect */}
      <div className="p-3 space-y-2">
        <div className="glass-card p-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1 rounded-md bg-primary/20">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">IA Integrada</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Gemini 2.5 Flash para análise de imagens em tempo real
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Auth Button with glass style */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full glass-btn text-xs h-8"
          onClick={signOut}
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
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
