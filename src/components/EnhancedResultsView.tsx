import React, { useState, useMemo } from 'react';
import { 
  Grid3X3, List, Table2, SortAsc, SortDesc, Check, X, 
  Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Download,
  CheckSquare, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ProcessingResult } from '@/services/api';

type ViewMode = 'grid' | 'list' | 'table';
type SortField = 'filename' | 'portico' | 'data_detectada' | 'confidence';
type SortOrder = 'asc' | 'desc';

interface EnhancedResultsViewProps {
  results: ProcessingResult[];
  fileUrls?: Map<string, string>;
  onViewPhoto?: (result: ProcessingResult, imageUrl?: string) => void;
  onUpdateResult?: (result: ProcessingResult) => void;
  onDeleteResults?: (filenames: string[]) => void;
  isProcessing?: boolean;
}

const getConfidenceClass = (confidence?: number) => {
  if (!confidence) return 'confidence-low';
  if (confidence >= 0.9) return 'confidence-high';
  if (confidence >= 0.5) return 'confidence-medium';
  return 'confidence-low';
};

const EnhancedResultsView: React.FC<EnhancedResultsViewProps> = ({
  results,
  fileUrls,
  onViewPhoto,
  onUpdateResult,
  onDeleteResults,
  isProcessing,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('filename');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Sort results
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'filename':
          aVal = a.filename;
          bVal = b.filename;
          break;
        case 'portico':
          aVal = a.portico || '';
          bVal = b.portico || '';
          break;
        case 'data_detectada':
          aVal = a.data_detectada || '';
          bVal = b.data_detectada || '';
          break;
        case 'confidence':
          aVal = a.confidence || 0;
          bVal = b.confidence || 0;
          break;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [results, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelection = (filename: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === paginatedResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedResults.map(r => r.filename)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <SortAsc className="w-3 h-3 ml-1" /> : 
      <SortDesc className="w-3 h-3 ml-1" />;
  };

  // Grid view card
  const GridCard = ({ result }: { result: ProcessingResult }) => {
    const imageUrl = fileUrls?.get(result.filename);
    const isSelected = selectedItems.has(result.filename);

    return (
      <div 
        className={cn(
          "group gnome-card overflow-hidden transition-all duration-200",
          isSelected && "ring-2 ring-primary"
        )}
      >
        {/* Thumbnail */}
        <div className="relative aspect-square bg-secondary">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={result.filename} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Sem preview
            </div>
          )}

          {/* Selection checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(result.filename);
            }}
            className="absolute top-2 left-2 w-6 h-6 rounded bg-background/80 flex items-center justify-center"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Hover actions */}
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onViewPhoto?.(result, imageUrl)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUpdateResult?.(result)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium truncate" title={result.filename}>
            {result.filename}
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">
              {result.portico || 'N/A'}
            </Badge>
            <span className={getConfidenceClass(result.confidence)}>
              {result.confidence ? `${Math.round(result.confidence * 100)}%` : '-'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.data_detectada || 'Sem data'}
          </p>
        </div>
      </div>
    );
  };

  // List view row
  const ListRow = ({ result }: { result: ProcessingResult }) => {
    const imageUrl = fileUrls?.get(result.filename);
    const isSelected = selectedItems.has(result.filename);

    return (
      <div 
        className={cn(
          "flex items-center gap-4 p-3 gnome-card transition-all duration-200",
          isSelected && "ring-2 ring-primary"
        )}
      >
        <button
          onClick={() => toggleSelection(result.filename)}
          className="flex-shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              N/A
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{result.filename}</p>
          <p className="text-sm text-muted-foreground">
            {result.portico || 'N/A'} • {result.disciplina || 'N/A'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm">{result.data_detectada || 'Sem data'}</p>
          <span className={getConfidenceClass(result.confidence)}>
            {result.confidence ? `${Math.round(result.confidence * 100)}%` : '-'}
          </span>
        </div>

        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onViewPhoto?.(result, imageUrl)}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8"
          >
            <Table2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Sort */}
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="filename">Nome</SelectItem>
            <SelectItem value="portico">Serviço</SelectItem>
            <SelectItem value="data_detectada">Data</SelectItem>
            <SelectItem value="confidence">Confiança</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
        </Button>
      </div>

      {/* Selection bar */}
      {selectedItems.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-3 animate-fade-in">
          <p className="text-sm font-medium">
            {selectedItems.size} {selectedItems.size === 1 ? 'foto selecionada' : 'fotos selecionadas'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDeleteResults?.(Array.from(selectedItems))}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {paginatedResults.map((result, index) => (
            <GridCard key={`${result.filename}-${index}`} result={result} />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {paginatedResults.map((result, index) => (
            <ListRow key={`${result.filename}-${index}`} result={result} />
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="gnome-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button onClick={toggleSelectAll}>
                    {selectedItems.size === paginatedResults.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Foto</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('portico')}
                >
                  <span className="flex items-center">
                    Serviço <SortIcon field="portico" />
                  </span>
                </TableHead>
                <TableHead>Estrutura</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('data_detectada')}
                >
                  <span className="flex items-center">
                    Data <SortIcon field="data_detectada" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('confidence')}
                >
                  <span className="flex items-center">
                    Confiança <SortIcon field="confidence" />
                  </span>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((result, index) => {
                const imageUrl = fileUrls?.get(result.filename);
                const isSelected = selectedItems.has(result.filename);

                return (
                  <TableRow 
                    key={`${result.filename}-${index}`}
                    className={cn(isSelected && "bg-primary/5")}
                  >
                    <TableCell>
                      <button onClick={() => toggleSelection(result.filename)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <span className="truncate max-w-[150px] text-sm">{result.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell>{result.portico || '-'}</TableCell>
                    <TableCell>{result.disciplina || '-'}</TableCell>
                    <TableCell>{result.service || '-'}</TableCell>
                    <TableCell>{result.data_detectada || '-'}</TableCell>
                    <TableCell>
                      <span className={getConfidenceClass(result.confidence)}>
                        {result.confidence ? `${Math.round(result.confidence * 100)}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onViewPhoto?.(result, imageUrl)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <Select 
              value={String(itemsPerPage)} 
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedResultsView;
