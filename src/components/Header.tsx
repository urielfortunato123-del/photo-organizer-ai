import React from 'react';
import { Cpu } from 'lucide-react';
import logoObraphoto from '@/assets/logo-obraphoto.png';

const Header: React.FC = () => {
  return (
    <header className="bg-card border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-center px-6 py-3">
        {/* Logo centralizada e maior */}
        <img 
          src={logoObraphoto} 
          alt="ObraPhoto AI" 
          className="h-14 object-contain"
        />

        {/* Status Pills - posicionados à direita */}
        <div className="hidden md:flex items-center gap-3 absolute right-6">
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
