import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import logoObraphoto from '@/assets/logo-obraphoto.png';

const Header: React.FC = () => {
  return (
    <header className="bg-card border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          <img 
            src={logoObraphoto} 
            alt="ObraPhoto AI Logo" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              ObraPhoto <span className="text-primary">AI</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Separador inteligente de fotos
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="hidden md:flex items-center gap-3">
          <div className="gnome-pill bg-success/15 text-success text-xs">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            IA Ativa
          </div>
          <div className="gnome-pill bg-primary/15 text-primary text-xs">
            <Cpu className="w-3.5 h-3.5" />
            Gemini 2.5
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
