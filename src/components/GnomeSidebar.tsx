import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 30,
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { x: -12, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  }
};

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
    <motion.aside 
      className="w-56 flex flex-col glass-sidebar h-full"
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
    >
      {/* Logo Section with macOS traffic lights */}
      <motion.div 
        className="p-4 border-b border-glass"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="macos-traffic-lights">
            <motion.div 
              className="macos-btn macos-btn-close" 
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
            <motion.div 
              className="macos-btn macos-btn-minimize" 
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
            <motion.div 
              className="macos-btn macos-btn-maximize" 
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
        </div>
        <motion.div 
          className="flex items-center gap-2.5"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="relative">
            <motion.img 
              src={logoObraphoto} 
              alt="ObraPhoto AI" 
              className="w-10 h-10 object-contain"
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            />
            <motion.div 
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="font-semibold text-foreground tracking-tight text-sm">ObraPhoto</h1>
            <p className="text-[10px] text-muted-foreground">Análise com IA</p>
          </div>
        </motion.div>
      </motion.div>

      {/* User Info with glass effect */}
      <motion.div 
        className="p-3 border-b border-glass"
        variants={itemVariants}
      >
        <motion.div 
          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          whileHover={{ x: 4, backgroundColor: "hsla(0, 0%, 100%, 0.08)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center ring-1 ring-white/10"
            whileHover={{ scale: 1.1 }}
          >
            <User className="w-3.5 h-3.5 text-primary" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {profile?.empresa || 'Usuário'}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        <AnimatePresence mode="wait">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "gnome-sidebar-item w-full text-left text-xs relative overflow-hidden",
                activeTab === item.id && "active"
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              whileHover={{ 
                x: 6,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              whileTap={{ scale: 0.97 }}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/15 rounded-lg"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3 w-full">
                <motion.div
                  animate={activeTab === item.id ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <item.icon className="w-4 h-4" />
                </motion.div>
                <div className="flex-1">
                  <span className="block font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <motion.span 
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary text-primary-foreground"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* How to Use Link */}
        <motion.button
          onClick={() => navigate('/como-usar')}
          className="gnome-sidebar-item w-full text-left text-xs mt-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
          whileHover={{ x: 6 }}
          whileTap={{ scale: 0.97 }}
        >
          <HelpCircle className="w-4 h-4" />
          <div className="flex-1">
            <span className="block font-medium">Como Usar</span>
          </div>
        </motion.button>
      </nav>

      {/* AI Status Card with enhanced glass effect */}
      <motion.div 
        className="p-3 space-y-2"
        variants={itemVariants}
      >
        <motion.div 
          className="glass-card p-3 relative overflow-hidden"
          whileHover={{ 
            scale: 1.02,
            y: -2,
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <motion.div 
                className="p-1 rounded-md bg-primary/20"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-3 h-3 text-primary" />
              </motion.div>
              <span className="text-xs font-medium text-foreground">IA Integrada</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Gemini 2.5 Flash para análise de imagens em tempo real
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-success"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[10px] text-success font-medium">Online</span>
            </div>
          </div>
        </motion.div>

        {/* Auth Button with glass style */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full glass-btn text-xs h-8"
            onClick={signOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sair
          </Button>
        </motion.div>
        
        {/* Version Button */}
        <div className="flex justify-center">
          <VersionButton />
        </div>
      </motion.div>
    </motion.aside>
  );
};

export default GnomeSidebar;
