import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, Calendar, Tag, FileQuestion, CheckCircle2, 
  XCircle, Pencil, Save, X, ChevronDown, ChevronRight,
  Download, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ProcessingResult } from '@/services/api';

interface InconsistencyGroup {
  type: 'sem_data' | 'sem_categoria' | 'sem_item' | 'sem_portico';
  label: string;
  icon: React.ReactNode;
  color: string;
  items: ProcessingResult[];
}

interface PreDownloadValidationProps {
  isOpen: boolean;
  onClose: () => void;
  results: ProcessingResult[];
  onBulkUpdate: (updates: ProcessingResult[]) => void;
  onContinue: () => void;
}

const extractCategory = (dest: string | undefined): string => {
  if (!dest) return '';
  // FOTOS/PORTICO/CATEGORIA/ITEM/...
  const parts = dest.split('/');
  return parts[2] || '';
};

const extractItem = (dest: string | undefined): string => {
  if (!dest) return '';
  const parts = dest.split('/');
  return parts[3] || '';
};

const PreDownloadValidation: React.FC<PreDownloadValidationProps> = ({
  isOpen,
  onClose,
  results,
  onBulkUpdate,
  onContinue,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['sem_data', 'sem_categoria', 'sem_item', 'sem_portico']));
  const [editingItems, setEditingItems] = useState<Map<string, Partial<ProcessingResult>>>(new Map());
  const [bulkValues, setBulkValues] = useState<Record<string, { data?: string; portico?: string; service?: string }>>({
    sem_data: { data: '' },
    sem_portico: { portico: '' },
    sem_categoria: { service: '' },
    sem_item: { service: '' },
  });

  const successResults = useMemo(() => 
    results.filter(r => r.status === 'Sucesso'),
  [results]);

  const inconsistencies = useMemo<InconsistencyGroup[]>(() => {
    const sem_data = successResults.filter(r => !r.data_detectada && !r.exif_date);
    const sem_portico = successResults.filter(r => !r.portico || r.portico === 'NAO_IDENTIFICADO');
    const sem_categoria = successResults.filter(r => {
      const cat = extractCategory(r.dest);
      return !cat || cat === 'GERAL' || cat === 'NAO_IDENTIFICADO';
    });
    const sem_item = successResults.filter(r => {
      const item = extractItem(r.dest);
      return !item || item === 'REGISTRO' || item === 'GERAL';
    });

    return [
      {
        type: 'sem_data',
        label: 'Sem Data',
        icon: <Calendar className="w-4 h-4" />,
        color: 'text-orange-500',
        items: sem_data,
      },
      {
        type: 'sem_portico',
        label: 'Sem Obra/Local',
        icon: <Folder className="w-4 h-4" />,
        color: 'text-red-500',
        items: sem_portico,
      },
      {
        type: 'sem_categoria',
        label: 'Sem Categoria',
        icon: <Tag className="w-4 h-4" />,
        color: 'text-amber-500',
        items: sem_categoria,
      },
      {
        type: 'sem_item',
        label: 'Sem Item/Atividade',
        icon: <FileQuestion className="w-4 h-4" />,
        color: 'text-yellow-500',
        items: sem_item,
      },
    ];
  }, [successResults]);

  const totalInconsistencies = useMemo(() => {
    const uniqueFiles = new Set<string>();
    inconsistencies.forEach(g => g.items.forEach(i => uniqueFiles.add(i.filename)));
    return uniqueFiles.size;
  }, [inconsistencies]);

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleBulkFix = (type: InconsistencyGroup['type']) => {
    const group = inconsistencies.find(g => g.type === type);
    if (!group || group.items.length === 0) return;

    const values = bulkValues[type];
    const updates: ProcessingResult[] = [];

    group.items.forEach(item => {
      let updated = { ...item };
      let changed = false;

      if (type === 'sem_data' && values.data) {
        updated.data_detectada = values.data;
        changed = true;
      }
      if (type === 'sem_portico' && values.portico) {
        updated.portico = values.portico;
        // Rebuild dest path
        const parts = (updated.dest || '').split('/');
        parts[1] = values.portico;
        updated.dest = parts.join('/');
        changed = true;
      }
      if ((type === 'sem_categoria' || type === 'sem_item') && values.service) {
        updated.service = values.service;
        // Rebuild dest path with new service
        const parts = (updated.dest || '').split('/');
        if (type === 'sem_categoria') {
          parts[2] = values.service.toUpperCase().replace(/\s+/g, '_');
        }
        if (type === 'sem_item') {
          parts[3] = values.service.toUpperCase().replace(/\s+/g, '_');
        }
        updated.dest = parts.join('/');
        changed = true;
      }

      if (changed) updates.push(updated);
    });

    if (updates.length > 0) {
      onBulkUpdate(updates);
    }
  };

  const handleSingleEdit = (filename: string, field: string, value: string) => {
    setEditingItems(prev => {
      const next = new Map(prev);
      const current = next.get(filename) || {};
      next.set(filename, { ...current, [field]: value });
      return next;
    });
  };

  const handleSaveSingle = (item: ProcessingResult) => {
    const edits = editingItems.get(item.filename);
    if (!edits) return;

    const updated: ProcessingResult = { ...item, ...edits };
    
    // If service changed, rebuild dest
    if (edits.service) {
      const parts = (updated.dest || 'FOTOS/NAO_IDENTIFICADO/GERAL/REGISTRO').split('/');
      // Extract categoria and atividade from service
      if (edits.service.includes('-')) {
        const [cat, ...rest] = edits.service.split('-');
        parts[2] = cat.trim().toUpperCase().replace(/\s+/g, '_');
        parts[3] = rest.join('-').trim().toUpperCase().replace(/\s+/g, '_');
      } else {
        parts[2] = edits.service.trim().toUpperCase().replace(/\s+/g, '_');
        parts[3] = edits.service.trim().toUpperCase().replace(/\s+/g, '_');
      }
      updated.dest = parts.join('/');
    }

    if (edits.portico) {
      const parts = (updated.dest || '').split('/');
      parts[1] = edits.portico;
      updated.dest = parts.join('/');
    }

    onBulkUpdate([updated]);
    setEditingItems(prev => {
      const next = new Map(prev);
      next.delete(item.filename);
      return next;
    });
  };

  const handleCancelEdit = (filename: string) => {
    setEditingItems(prev => {
      const next = new Map(prev);
      next.delete(filename);
      return next;
    });
  };

  const allClear = totalInconsistencies === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allClear ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            Validação Pré-Download
          </DialogTitle>
          <DialogDescription>
            {allClear 
              ? 'Todas as fotos estão classificadas corretamente!' 
              : `${totalInconsistencies} foto(s) com inconsistências detectadas`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {inconsistencies.map(group => (
                <div 
                  key={group.type}
                  className={`p-3 rounded-lg border ${group.items.length > 0 ? 'bg-muted/50' : 'bg-green-500/10 border-green-500/30'}`}
                >
                  <div className={`flex items-center gap-2 ${group.items.length > 0 ? group.color : 'text-green-500'}`}>
                    {group.items.length > 0 ? group.icon : <CheckCircle2 className="w-4 h-4" />}
                    <span className="text-sm font-medium">{group.label}</span>
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${group.items.length > 0 ? group.color : 'text-green-500'}`}>
                    {group.items.length}
                  </p>
                </div>
              ))}
            </div>

            {/* Groups with items */}
            {inconsistencies.filter(g => g.items.length > 0).map(group => (
              <Collapsible
                key={group.type}
                open={expandedGroups.has(group.type)}
                onOpenChange={() => toggleGroup(group.type)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(group.type) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className={group.color}>{group.icon}</span>
                        <span className="font-medium">{group.label}</span>
                        <Badge variant="secondary">{group.items.length}</Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 border-t space-y-3">
                      {/* Bulk fix */}
                      <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Correção em Lote</Label>
                        <div className="flex gap-2">
                          {group.type === 'sem_data' && (
                            <Input
                              placeholder="DD/MM/AAAA"
                              value={bulkValues.sem_data.data || ''}
                              onChange={(e) => setBulkValues(prev => ({
                                ...prev,
                                sem_data: { data: e.target.value }
                              }))}
                              className="flex-1 h-8 text-sm"
                            />
                          )}
                          {group.type === 'sem_portico' && (
                            <Input
                              placeholder="Ex: FREE_FLOW_P10, BSO_01"
                              value={bulkValues.sem_portico.portico || ''}
                              onChange={(e) => setBulkValues(prev => ({
                                ...prev,
                                sem_portico: { portico: e.target.value }
                              }))}
                              className="flex-1 h-8 text-sm"
                            />
                          )}
                          {(group.type === 'sem_categoria' || group.type === 'sem_item') && (
                            <Input
                              placeholder="Ex: SEGURANÇA - ALAMBRADO"
                              value={bulkValues[group.type].service || ''}
                              onChange={(e) => setBulkValues(prev => ({
                                ...prev,
                                [group.type]: { service: e.target.value }
                              }))}
                              className="flex-1 h-8 text-sm"
                            />
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleBulkFix(group.type)}
                            className="h-8"
                          >
                            Aplicar em {group.items.length}
                          </Button>
                        </div>
                      </div>

                      {/* Item list */}
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {group.items.slice(0, 20).map(item => {
                          const isEditing = editingItems.has(item.filename);
                          const edits = editingItems.get(item.filename) || {};

                          return (
                            <div 
                              key={item.filename}
                              className="flex items-center gap-2 p-2 bg-background rounded border text-sm"
                            >
                              <span className="flex-1 truncate text-muted-foreground">
                                {item.filename}
                              </span>
                              
                              {isEditing ? (
                                <>
                                  {group.type === 'sem_data' && (
                                    <Input
                                      placeholder="DD/MM/AAAA"
                                      value={edits.data_detectada || ''}
                                      onChange={(e) => handleSingleEdit(item.filename, 'data_detectada', e.target.value)}
                                      className="w-28 h-6 text-xs"
                                    />
                                  )}
                                  {group.type === 'sem_portico' && (
                                    <Input
                                      placeholder="Obra/Local"
                                      value={edits.portico || ''}
                                      onChange={(e) => handleSingleEdit(item.filename, 'portico', e.target.value)}
                                      className="w-32 h-6 text-xs"
                                    />
                                  )}
                                  {(group.type === 'sem_categoria' || group.type === 'sem_item') && (
                                    <Input
                                      placeholder="Serviço"
                                      value={edits.service || ''}
                                      onChange={(e) => handleSingleEdit(item.filename, 'service', e.target.value)}
                                      className="w-40 h-6 text-xs"
                                    />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-green-500"
                                    onClick={() => handleSaveSingle(item)}
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                    onClick={() => handleCancelEdit(item.filename)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-xs">
                                    {group.type === 'sem_data' && 'Sem data'}
                                    {group.type === 'sem_portico' && (item.portico || 'N/A')}
                                    {group.type === 'sem_categoria' && extractCategory(item.dest)}
                                    {group.type === 'sem_item' && extractItem(item.dest)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setEditingItems(prev => new Map(prev).set(item.filename, {}))}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })}
                        {group.items.length > 20 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            ... e mais {group.items.length - 20} itens
                          </p>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}

            {allClear && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-600">Tudo certo!</h3>
                <p className="text-muted-foreground">
                  Todas as {successResults.length} fotos estão prontas para download.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <XCircle className="w-4 h-4 mr-2" />
            Voltar e Corrigir
          </Button>
          <Button 
            onClick={onContinue}
            className="flex-1 gnome-btn-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            {totalInconsistencies > 0 
              ? `Baixar mesmo assim (${successResults.length} fotos)`
              : `Baixar ZIP (${successResults.length} fotos)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreDownloadValidation;
