import React from 'react';
import { Settings, MapPin, Calendar, Brain, Building2 } from 'lucide-react';
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
}) => {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Opções de Processamento</h3>
          <p className="text-xs text-muted-foreground">Configure como as fotos serão organizadas</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Empresa/Cliente */}
        <div className="space-y-2">
          <Label htmlFor="empresa" className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="w-4 h-4 text-primary" />
            Empresa / Cliente
          </Label>
          <Input
            id="empresa"
            placeholder="Ex: HABITECHENE, ABTECK..."
            value={empresa}
            onChange={(e) => onEmpresaChange(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            className="bg-secondary/50 border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Nome da pasta raiz para organização
          </p>
        </div>

        {/* Default Frente de Serviço */}
        <div className="space-y-2">
          <Label htmlFor="portico" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4 text-primary" />
            Frente de Serviço Padrão
          </Label>
          <Input
            id="portico"
            placeholder="Ex: PORTICO_01, CONSERVACAO_RODOVIA..."
            value={defaultPortico}
            onChange={(e) => onDefaultPorticoChange(e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Usado quando a frente de serviço não é identificada
          </p>
        </div>

        {/* Organize by Date */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Organizar por Data</p>
              <p className="text-xs text-muted-foreground">
                Cria subpastas MÊS_ANO/DIA_MÊS
              </p>
            </div>
          </div>
          <Switch
            checked={organizeByDate}
            onCheckedChange={onOrganizeByDateChange}
          />
        </div>

        {/* AI Priority */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Prioridade IA</p>
              <p className="text-xs text-muted-foreground">
                Usa análise avançada com Gemini/GPT
              </p>
            </div>
          </div>
          <Switch
            checked={iaPriority}
            onCheckedChange={onIaPriorityChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingOptions;
