import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, MapPin, Calendar, Brain, Building2, Zap, ScanText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProcessingOptionsProps {
  defaultPortico: string;
  onDefaultPorticoChange: (value: string) => void;
  empresa: string;
  onEmpresaChange: (value: string) => void;
  organizeByDate: boolean;
  onOrganizeByDateChange: (value: boolean) => void;
  iaPriority: boolean;
  onIaPriorityChange: (value: boolean) => void;
  economicMode?: boolean;
  onEconomicModeChange?: (value: boolean) => void;
  useLocalOCR?: boolean;
  onUseLocalOCRChange?: (value: boolean) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  }
};

const optionVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  })
};

const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({
  defaultPortico,
  onDefaultPorticoChange,
  empresa,
  onEmpresaChange,
  organizeByDate,
  onOrganizeByDateChange,
  iaPriority,
  onIaPriorityChange,
  economicMode = false,
  onEconomicModeChange,
  useLocalOCR = true,
  onUseLocalOCRChange,
}) => {
  return (
    <motion.div 
      className="glass-card p-5 space-y-5"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex items-center gap-3 pb-3 border-b border-border"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div 
          className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center"
          whileHover={{ scale: 1.1, rotate: 90 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Settings className="w-4 h-4 text-primary" />
        </motion.div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Opções de Processamento</h3>
          <p className="text-xs text-muted-foreground">Configure como as fotos serão organizadas</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        {/* Empresa/Cliente */}
        <motion.div 
          className="space-y-1.5"
          custom={0}
          variants={optionVariants}
          initial="hidden"
          animate="visible"
        >
          <Label htmlFor="empresa" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            Empresa / Cliente
          </Label>
          <motion.div whileFocus={{ scale: 1.01 }}>
            <Input
              id="empresa"
              placeholder="HABITECHENE"
              value={empresa}
              onChange={(e) => onEmpresaChange(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className="h-9 bg-secondary/50 border-border focus:border-primary text-sm"
            />
          </motion.div>
          <p className="text-[10px] text-muted-foreground/70">
            Nome da pasta raiz para organização
          </p>
        </motion.div>

        {/* Default Frente de Serviço */}
        <motion.div 
          className="space-y-1.5"
          custom={1}
          variants={optionVariants}
          initial="hidden"
          animate="visible"
        >
          <Label htmlFor="portico" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            Frente de Serviço Padrão
          </Label>
          <Input
            id="portico"
            placeholder="Ex: PORTICO_01, CONSERVAC"
            value={defaultPortico}
            onChange={(e) => onDefaultPorticoChange(e.target.value)}
            className="h-9 bg-secondary/50 border-border focus:border-primary text-sm"
          />
          <p className="text-[10px] text-muted-foreground/70">
            Usado quando a frente de serviço não é identificada
          </p>
        </motion.div>

        {/* Organize by Date */}
        <motion.div 
          className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
          custom={2}
          variants={optionVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ 
            scale: 1.01, 
            backgroundColor: "hsla(var(--secondary), 0.5)",
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div 
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </motion.div>
            <div>
              <p className="text-xs font-medium text-foreground">Organizar por Data</p>
              <p className="text-[10px] text-muted-foreground">
                Cria subpastas mês_ano/dia_mês
              </p>
            </div>
          </div>
          <Switch
            checked={organizeByDate}
            onCheckedChange={onOrganizeByDateChange}
          />
        </motion.div>

        {/* AI Priority */}
        <motion.div 
          className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
          custom={3}
          variants={optionVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ 
            scale: 1.01,
            backgroundColor: "hsla(var(--primary), 0.1)",
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div 
              className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"
              animate={iaPriority ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 0.5, repeat: iaPriority ? Infinity : 0, repeatDelay: 3 }}
            >
              <Brain className="w-4 h-4 text-primary" />
            </motion.div>
            <div>
              <p className="text-xs font-medium text-foreground">Prioridade IA</p>
              <p className="text-[10px] text-muted-foreground">
                Usa análise avançada com Gemini/GPT
              </p>
            </div>
          </div>
          <Switch
            checked={iaPriority}
            onCheckedChange={onIaPriorityChange}
          />
        </motion.div>

        {/* OCR Local - only show when AI is enabled */}
        <AnimatePresence>
          {iaPriority && onUseLocalOCRChange && (
            <motion.div 
              className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              whileHover={{ 
                scale: 1.01,
                backgroundColor: "hsla(210, 100%, 50%, 0.15)",
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <div className="flex items-center gap-2.5">
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                >
                  <ScanText className="w-4 h-4 text-blue-500" />
                </motion.div>
                <div>
                  <p className="text-xs font-medium text-foreground">OCR Local</p>
                  <p className="text-[10px] text-muted-foreground">
                    Extrai texto antes da IA (-60% custo)
                  </p>
                </div>
              </div>
              <Switch
                checked={useLocalOCR}
                onCheckedChange={onUseLocalOCRChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Economic Mode - only show when AI is enabled */}
        <AnimatePresence>
          {iaPriority && onEconomicModeChange && (
            <motion.div 
              className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              whileHover={{ 
                scale: 1.01,
                backgroundColor: "hsla(142, 76%, 36%, 0.15)",
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <div className="flex items-center gap-2.5">
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center"
                  animate={economicMode ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: economicMode ? Infinity : 0, repeatDelay: 2 }}
                >
                  <Zap className="w-4 h-4 text-green-500" />
                </motion.div>
                <div>
                  <p className="text-xs font-medium text-foreground">Modo Econômico</p>
                  <p className="text-[10px] text-muted-foreground">
                    2x mais fotos por $ (modelo leve)
                  </p>
                </div>
              </div>
              <Switch
                checked={economicMode}
                onCheckedChange={onEconomicModeChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProcessingOptions;
