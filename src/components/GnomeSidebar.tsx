import React from 'react';
import { 
  Upload, 
  Table as TableIcon, 
  FolderTree, 
  Settings,
  Home,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoObraphoto from '@/assets/logo-obraphoto.png';
import VersionButton from './VersionButton';

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
    <aside className="w-64 flex flex-col" style={{ backgroundColor: 'hsl(220, 30%, 10%)' }}>
      {/* Logo Section */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <img 
            src={logoObraphoto} 
            alt="ObraPhoto AI" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-semibold text-foreground">ObraPhoto</h1>
            <p className="text-xs text-muted-foreground">Análise com IA</p>
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
      </nav>

      {/* AI Status Card */}
      <div className="p-4 space-y-3">
        <div className="gnome-card p-4 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">IA Integrada</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Gemini 2.5 Flash para análise de imagens em tempo real
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-medium">Online</span>
          </div>
        </div>
        
        {/* Version Button */}
        <div className="flex justify-center">
          <VersionButton />
        </div>
      </div>
    </aside>
  );
};

export default GnomeSidebar;
