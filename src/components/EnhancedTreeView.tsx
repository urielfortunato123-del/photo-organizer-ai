import React, { useState, useMemo } from 'react';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, Image, 
  Search, Filter, X, Calendar, TrendingUp 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ProcessingResult } from '@/services/api';

// Icons by folder level
const LEVEL_ICONS: Record<number, string> = {
  0: '🏗️', // Serviço
  1: '🔧', // Estrutura
  2: '📋', // Atividade
  3: '📁', // Tipo
  4: '📅', // Mês
  5: '📆', // Dia
};

export interface EnhancedTreeNode {
  name: string;
  type: 'folder' | 'photo';
  count: number;
  confidence?: number;
  children?: EnhancedTreeNode[];
  photoData?: ProcessingResult;
  path?: string;
  level: number;
}

interface EnhancedTreeViewProps {
  results: ProcessingResult[];
  fileUrls?: Map<string, string>;
  onPhotoClick?: (result: ProcessingResult, imageUrl?: string) => void;
  className?: string;
}

// Build enhanced tree from results
const buildEnhancedTree = (results: ProcessingResult[]): EnhancedTreeNode[] => {
  const root: Record<string, EnhancedTreeNode> = {};

  results.forEach(result => {
    if (!result.dest) return;
    
    const parts = result.dest.split('/').filter(Boolean);
    let current = root;
    let path = '';

    parts.forEach((part, index) => {
      path += (path ? '/' : '') + part;
      
      if (!current[part]) {
        current[part] = {
          name: part,
          type: index === parts.length - 1 && result.filename ? 'folder' : 'folder',
          count: 0,
          children: [],
          path,
          level: index,
        };
      }
      
      current[part].count++;
      
      // Accumulate confidence for averaging
      if (result.confidence) {
        const node = current[part];
        if (node.confidence === undefined) {
          node.confidence = result.confidence;
        } else {
          node.confidence = (node.confidence * (node.count - 1) + result.confidence) / node.count;
        }
      }

      if (index < parts.length - 1) {
        if (!current[part].children) {
          current[part].children = [];
        }
        const childMap: Record<string, EnhancedTreeNode> = {};
        current[part].children!.forEach(c => { childMap[c.name] = c; });
        current = childMap;
      }
    });

    // Add photo as leaf
    const lastPart = parts[parts.length - 1];
    if (current[lastPart]) {
      current[lastPart].children = current[lastPart].children || [];
      current[lastPart].children!.push({
        name: result.filename,
        type: 'photo',
        count: 1,
        confidence: result.confidence,
        photoData: result,
        path: result.dest + '/' + result.filename,
        level: parts.length,
      });
    }
  });

  const toArray = (obj: Record<string, EnhancedTreeNode>): EnhancedTreeNode[] => {
    return Object.values(obj).map(node => ({
      ...node,
      children: node.children ? toArray(
        node.children.reduce((acc, c) => ({ ...acc, [c.name]: c }), {})
      ) : undefined,
    }));
  };

  return toArray(root);
};

// Recursive tree node component
interface TreeNodeItemProps {
  node: EnhancedTreeNode;
  fileUrls?: Map<string, string>;
  onPhotoClick?: (result: ProcessingResult, imageUrl?: string) => void;
  searchTerm?: string;
  expandedBySearch?: boolean;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ 
  node, 
  fileUrls, 
  onPhotoClick,
  searchTerm,
  expandedBySearch,
}) => {
  const [isOpen, setIsOpen] = useState(expandedBySearch || node.level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isPhoto = node.type === 'photo';

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">{part}</mark> : part
    );
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const pct = Math.round(confidence * 100);
    const variant = pct >= 90 ? 'success' : pct >= 50 ? 'warning' : 'destructive';
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-[10px] px-1.5",
          variant === 'success' && "border-success/50 text-success",
          variant === 'warning' && "border-warning/50 text-warning",
          variant === 'destructive' && "border-destructive/50 text-destructive"
        )}
      >
        {pct}%
      </Badge>
    );
  };

  const imageUrl = isPhoto && node.photoData ? fileUrls?.get(node.photoData.filename) : undefined;

  return (
    <div className="select-none">
      <div 
        className={cn(
          "tree-node group flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors",
          hasChildren && "cursor-pointer",
          isPhoto && "cursor-pointer hover:bg-primary/10"
        )}
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          if (isPhoto && node.photoData && onPhotoClick) {
            onPhotoClick(node.photoData, imageUrl);
          }
        }}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
      >
        {/* Icon */}
        {isPhoto ? (
          <Popover>
            <PopoverTrigger asChild>
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" side="right">
              {imageUrl && (
                <img src={imageUrl} alt={node.name} className="w-full h-48 object-cover rounded-lg" />
              )}
              <p className="text-xs text-muted-foreground mt-2 truncate">{node.name}</p>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-lg flex-shrink-0">
            {LEVEL_ICONS[node.level] || (isOpen ? <FolderOpen className="w-4 h-4 folder-icon" /> : <Folder className="w-4 h-4 folder-icon" />)}
          </span>
        )}

        {/* Name */}
        <span className={cn(
          "flex-1 truncate text-sm",
          isPhoto ? "text-muted-foreground" : "text-foreground font-medium"
        )}>
          {highlightMatch(node.name, searchTerm || '')}
        </span>

        {/* Count & Confidence */}
        {!isPhoto && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {node.count} {node.count === 1 ? 'foto' : 'fotos'}
            </Badge>
            {getConfidenceBadge(node.confidence)}
          </div>
        )}
        
        {isPhoto && getConfidenceBadge(node.confidence)}

        {/* Expand indicator */}
        {hasChildren && !isPhoto && (
          <span className="opacity-50 group-hover:opacity-100 transition-opacity">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div className="animate-fade-in">
          {node.children!.map((child, index) => (
            <TreeNodeItem
              key={`${child.name}-${index}`}
              node={child}
              fileUrls={fileUrls}
              onPhotoClick={onPhotoClick}
              searchTerm={searchTerm}
              expandedBySearch={expandedBySearch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EnhancedTreeView: React.FC<EnhancedTreeViewProps> = ({
  results,
  fileUrls,
  onPhotoClick,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  // Filter results
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchable = [
          r.filename, r.service, r.portico, r.disciplina, 
          r.rodovia, r.data_detectada
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      // Confidence filter
      if (confidenceFilter !== 'all') {
        const conf = (r.confidence || 0) * 100;
        if (confidenceFilter === 'high' && conf < 90) return false;
        if (confidenceFilter === 'medium' && (conf < 50 || conf >= 90)) return false;
        if (confidenceFilter === 'low' && conf >= 50) return false;
      }

      // Period filter (based on data_detectada)
      if (periodFilter !== 'all' && r.data_detectada) {
        const today = new Date();
        const match = r.data_detectada.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const photoDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          const diffDays = Math.floor((today.getTime() - photoDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (periodFilter === 'today' && diffDays !== 0) return false;
          if (periodFilter === 'week' && diffDays > 7) return false;
          if (periodFilter === 'month' && diffDays > 30) return false;
        }
      }

      return true;
    });
  }, [results, searchTerm, confidenceFilter, periodFilter]);

  const treeData = useMemo(() => buildEnhancedTree(filteredResults), [filteredResults]);

  const hasActiveFilters = searchTerm || confidenceFilter !== 'all' || periodFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setConfidenceFilter('all');
    setPeriodFilter('all');
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Folder className="w-16 h-16 mx-auto mb-4 opacity-30 animate-pulse" />
        <p className="text-lg font-medium">Nenhuma foto organizada ainda</p>
        <p className="text-sm mt-1">Processe algumas fotos para ver a estrutura</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and filters */}
      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por serviço, atividade, data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as datas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>

          <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
            <SelectTrigger className="w-40">
              <TrendingUp className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Confiança" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta (90%+)</SelectItem>
              <SelectItem value="medium">Média (50-89%)</SelectItem>
              <SelectItem value="low">Baixa (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Mostrando <strong className="text-foreground">{filteredResults.length}</strong> de{' '}
            <strong className="text-foreground">{results.length}</strong> fotos
          </p>
        )}
      </div>

      {/* Tree */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
        {treeData.length > 0 ? (
          treeData.map((node, index) => (
            <TreeNodeItem
              key={`${node.name}-${index}`}
              node={node}
              fileUrls={fileUrls}
              onPhotoClick={onPhotoClick}
              searchTerm={searchTerm}
              expandedBySearch={!!searchTerm}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum resultado encontrado</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTreeView;
