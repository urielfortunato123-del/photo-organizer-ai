import React from 'react';
import { Cpu, HelpCircle } from 'lucide-react';
import logoObraphoto from '@/assets/logo-obraphoto.png';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onStartTour?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
  soundEnabled = true,
  onToggleSound,
  onStartTour,
}) => {
  return (
    <header className="bg-card border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-center px-6 py-3">
        {/* Logo centralizada e maior */}
        <img 
          src={logoObraphoto} 
          alt="ObraPhoto AI" 
          className="h-14 object-contain"
        />

        {/* Controls - posicionados à direita */}
        <div className="hidden md:flex items-center gap-2 absolute right-6">
          {/* Status Pills */}
          <div className="gnome-pill bg-success/15 text-success text-xs">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            IA Ativa
          </div>
          <div className="gnome-pill bg-primary/15 text-primary text-xs">
            <Cpu className="w-3.5 h-3.5" />
            Gemini 2.5
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-2" />

          {/* Theme Toggle */}
          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          {/* Sound Toggle */}
          {onToggleSound && (
            <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
          )}

          {/* Help/Tour Button */}
          {onStartTour && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onStartTour}
                  className="h-9 w-9 rounded-xl"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Como usar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
