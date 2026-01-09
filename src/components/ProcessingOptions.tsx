import React from 'react';
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
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Opções de Processamento</h3>
          <p className="text-xs text-muted-foreground">Configure como as fotos serão organizadas</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Empresa/Cliente */}
        <div className="space-y-1.5">
          <Label htmlFor="empresa" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            Empresa / Cliente
          </Label>
          <Input
            id="empresa"
            placeholder="HABITECHENE"
            value={empresa}
            onChange={(e) => onEmpresaChange(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            className="h-9 bg-secondary/50 border-border focus:border-primary text-sm"
          />
          <p className="text-[10px] text-muted-foreground/70">
            Nome da pasta raiz para organização
          </p>
        </div>

        {/* Default Frente de Serviço */}
        <div className="space-y-1.5">
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
        </div>

        {/* Organize by Date */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
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
        </div>

        {/* AI Priority */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
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
        </div>

        {/* OCR Local - only show when AI is enabled */}
        {iaPriority && onUseLocalOCRChange && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ScanText className="w-4 h-4 text-blue-500" />
              </div>
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
          </div>
        )}

        {/* Economic Mode - only show when AI is enabled */}
        {iaPriority && onEconomicModeChange && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-500" />
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingOptions;
