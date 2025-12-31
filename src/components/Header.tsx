import React from 'react';
import { Cpu } from 'lucide-react';
import logoObraphoto from '@/assets/logo-obraphoto.png';

const Header: React.FC = () => {
  return (
    <header className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
      
      <div className="relative z-10 py-12 md:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src={logoObraphoto} 
              alt="ObraPhoto AI Logo" 
              className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-foreground">Obra</span>
            <span className="text-gradient">Photo</span>
            <span className="text-foreground"> AI</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Separador inteligente de fotos para obras rodoviárias
          </p>

          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">OCR Avançado</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Análise com IA</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground">Organização Automática</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
