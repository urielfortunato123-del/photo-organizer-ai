import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface ResultFilters {
  search: string;
  portico: string;
  disciplina: string;
  method: string;
  minConfidence: number;
}

interface ResultsFiltersProps {
  filters: ResultFilters;
  onFiltersChange: (filters: ResultFilters) => void;
  porticos: string[];
  disciplinas: string[];
}

const ResultsFilters: React.FC<ResultsFiltersProps> = ({
  filters,
  onFiltersChange,
  porticos,
  disciplinas,
}) => {
  const hasActiveFilters = 
    filters.search || 
    filters.portico || 
    filters.disciplina || 
    filters.method || 
    filters.minConfidence > 0;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      portico: '',
      disciplina: '',
      method: '',
      minConfidence: 0,
    });
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Filtros</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Label className="text-xs text-muted-foreground">Buscar arquivo</Label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nome do arquivo..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Portico */}
        <div>
          <Label className="text-xs text-muted-foreground">Pórtico</Label>
          <Select
            value={filters.portico}
            onValueChange={(value) => onFiltersChange({ ...filters, portico: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="h-9 mt-1 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {porticos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Disciplina */}
        <div>
          <Label className="text-xs text-muted-foreground">Disciplina</Label>
          <Select
            value={filters.disciplina}
            onValueChange={(value) => onFiltersChange({ ...filters, disciplina: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="h-9 mt-1 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {disciplinas.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Method */}
        <div>
          <Label className="text-xs text-muted-foreground">Método</Label>
          <Select
            value={filters.method}
            onValueChange={(value) => onFiltersChange({ ...filters, method: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="h-9 mt-1 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="heuristica">Heurística</SelectItem>
              <SelectItem value="ia_fallback">IA Fallback</SelectItem>
              <SelectItem value="ia_forcada">IA Forçada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Confiança mínima: {filters.minConfidence}%
          </Label>
          <div className="mt-2 px-1">
            <Slider
              value={[filters.minConfidence]}
              onValueChange={([value]) => onFiltersChange({ ...filters, minConfidence: value })}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsFilters;
