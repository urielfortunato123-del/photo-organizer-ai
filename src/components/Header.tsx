import React from 'react';
import { Camera, Zap, Cpu } from 'lucide-react';

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
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-300">
                <Camera className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-success flex items-center justify-center shadow-lg">
                <Zap className="w-3 h-3 text-success-foreground" />
              </div>
            </div>
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
