import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, Upload, FileSpreadsheet, Search, 
  Check, X, Edit2, RefreshCw, Download, Trash2,
  ChevronDown, ChevronRight, AlertTriangle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useBMImport, BMItem, findBestMatch } from '@/hooks/useBMImport';
import { supabase } from '@/integrations/supabase/client';

interface RDAItem {
  id: string;
  data: string;
  obra: string;
  atividade: string;
  quantidadeVerificada?: number;
  quantidadeSugerida?: number;
  fonteSugestao?: string;
  confiancaSugestao?: number;
  valorUnitario?: number;
  valorTotal?: number;
  itemBM?: BMItem;
  status: 'pendente' | 'calculado' | 'sem_match' | 'editando';
}

interface RDACalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RDACalculator({ isOpen, onClose }: RDACalculatorProps) {
  const { toast } = useToast();
  const { bmData, importBM, loadSavedBM, clearBM, isLoading: bmLoading } = useBMImport();
  
  const [rdaItems, setRdaItems] = useState<RDAItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['import', 'items']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Carrega BM salvo ao montar
  useEffect(() => {
    loadSavedBM();
  }, [loadSavedBM]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Importa arquivo BM
  const handleBMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importBM(file);
    }
  };

  // Importa RDA (planilha de atividades)
  const handleRDAUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const lines = content.split('\n').filter(l => l.trim());
      const items: RDAItem[] = [];

      // Pula header e processa linhas
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/[;,\t]/);
        if (cells.length >= 4) {
          const data = cells[0]?.trim() || '';
          const obra = cells[3]?.trim() || '';
          const atividade = cells[10]?.trim() || ''; // Coluna de atividades

          if (atividade && atividade !== 'Sem atividades') {
            items.push({
              id: `rda_${i}`,
              data,
              obra,
              atividade,
              status: 'pendente',
            });
          }
        }
      }

      setRdaItems(items);
      toast({
        title: "RDA importado",
        description: `${items.length} atividades carregadas`,
      });

      // Auto-match com BM se disponível
      if (bmData?.items.length) {
        autoMatchItems(items);
      }
    } catch (error) {
      console.error('Erro ao importar RDA:', error);
      toast({
        title: "Erro ao importar",
        description: "Verifique o formato do arquivo",
        variant: "destructive",
      });
    }
  };

  // Faz matching automático com BM
  const autoMatchItems = useCallback((items: RDAItem[]) => {
    if (!bmData?.items.length) return;

    const updated = items.map(item => {
      const match = findBestMatch(item.atividade, bmData.items);
      if (match) {
        return {
          ...item,
          itemBM: match,
          valorUnitario: match.valorUnitario,
          status: 'pendente' as const,
        };
      }
      return { ...item, status: 'sem_match' as const };
    });

    setRdaItems(updated);

    const matched = updated.filter(i => i.itemBM).length;
    toast({
      title: "Matching automático",
      description: `${matched} de ${updated.length} atividades vinculadas ao BM`,
    });
  }, [bmData, toast]);

  // Extrai quantidades via IA
  const extractQuantities = async () => {
    const pendentes = rdaItems.filter(i => !i.quantidadeVerificada && i.atividade);
    if (!pendentes.length) {
      toast({ title: "Nada a processar", description: "Todas as atividades já têm quantidade" });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-quantities', {
        body: {
          atividades: pendentes.map(p => ({
            id: p.id,
            texto: p.atividade,
            unidadeEsperada: p.itemBM?.unidade,
          })),
        },
      });

      if (error) throw error;

      const results = data.results || [];
      
      setRdaItems(prev => prev.map(item => {
        const found = results.find((r: any) => r.id === item.id);
        if (found && found.quantidade != null) {
          const valorTotal = found.quantidade * (item.valorUnitario || 0);
          return {
            ...item,
            quantidadeSugerida: found.quantidade,
            fonteSugestao: found.fonte,
            confiancaSugestao: found.confianca,
            valorTotal: valorTotal > 0 ? valorTotal : undefined,
            status: 'calculado' as const,
          };
        }
        return item;
      }));

      toast({
        title: "Quantidades extraídas",
        description: `${data.comQuantidade} de ${pendentes.length} atividades processadas`,
      });
    } catch (error) {
      console.error('Erro ao extrair quantidades:', error);
      toast({
        title: "Erro na extração",
        description: "Não foi possível processar as atividades",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirma quantidade sugerida
  const confirmQuantity = (id: string) => {
    setRdaItems(prev => prev.map(item => {
      if (item.id === id && item.quantidadeSugerida != null) {
        const valorTotal = item.quantidadeSugerida * (item.valorUnitario || 0);
        return {
          ...item,
          quantidadeVerificada: item.quantidadeSugerida,
          valorTotal: valorTotal > 0 ? valorTotal : undefined,
          status: 'calculado' as const,
        };
      }
      return item;
    }));
  };

  // Atualiza quantidade manualmente
  const updateQuantity = (id: string, value: number) => {
    setRdaItems(prev => prev.map(item => {
      if (item.id === id) {
        const valorTotal = value * (item.valorUnitario || 0);
        return {
          ...item,
          quantidadeVerificada: value,
          valorTotal: valorTotal > 0 ? valorTotal : undefined,
          status: 'calculado' as const,
        };
      }
      return item;
    }));
    setEditingId(null);
  };

  // Atualiza valor unitário
  const updateValorUnitario = (id: string, value: number) => {
    setRdaItems(prev => prev.map(item => {
      if (item.id === id) {
        const qtd = item.quantidadeVerificada || item.quantidadeSugerida || 0;
        return {
          ...item,
          valorUnitario: value,
          valorTotal: qtd * value,
        };
      }
      return item;
    }));
  };

  // Exporta resultado
  const exportResults = () => {
    const headers = ['Data', 'Obra', 'Atividade', 'Qtd Verificada', 'Unidade', 'Valor Unitário', 'Valor Total'];
    const rows = rdaItems.map(item => [
      item.data,
      item.obra,
      item.atividade,
      (item.quantidadeVerificada ?? item.quantidadeSugerida ?? '').toString(),
      item.itemBM?.unidade || '',
      (item.valorUnitario ?? '').toString(),
      (item.valorTotal ?? '').toString(),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RDA_Calculado_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calcula totais
  const totais = rdaItems.reduce((acc, item) => ({
    total: acc.total + 1,
    comQuantidade: acc.comQuantidade + (item.quantidadeVerificada || item.quantidadeSugerida ? 1 : 0),
    valorTotal: acc.valorTotal + (item.valorTotal || 0),
  }), { total: 0, comQuantidade: 0, valorTotal: 0 });

  // Filtra itens
  const filteredItems = rdaItems.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.atividade.toLowerCase().includes(term) ||
      item.obra.toLowerCase().includes(term) ||
      item.data.includes(term)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-card">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Calculadora RDA - Cruzamento de Dados
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Seção de Importação */}
          <Collapsible open={expandedSections.has('import')}>
            <CollapsibleTrigger 
              onClick={() => toggleSection('import')}
              className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded-lg hover:bg-muted"
            >
              {expandedSections.has('import') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Upload className="h-4 w-4" />
              <span className="font-medium">1. Importar Arquivos</span>
              {bmData && <Badge variant="secondary" className="ml-2">BM: {bmData.items.length} itens</Badge>}
              {rdaItems.length > 0 && <Badge variant="secondary" className="ml-2">RDA: {rdaItems.length} atividades</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Upload BM */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Tabela de Preços (BM)</span>
                    </div>
                    {bmData && (
                      <Button variant="ghost" size="sm" onClick={clearBM}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {bmData ? (
                    <div className="text-sm text-muted-foreground">
                      <p>✓ {bmData.nome}</p>
                      <p>{bmData.items.length} itens carregados</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Formato: Código;Descrição;Unidade;Valor
                      </p>
                      <Input
                        type="file"
                        accept=".csv,.txt,.xls,.xlsx"
                        onChange={handleBMUpload}
                        disabled={bmLoading}
                      />
                    </div>
                  )}
                </div>

                {/* Upload RDA */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Relatório de Atividades (RDA)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exporte do ObraPhoto ou use planilha própria
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx"
                    onChange={handleRDAUpload}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Seção de Processamento */}
          {rdaItems.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <Button 
                onClick={extractQuantities} 
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Extrair Quantidades (IA)
              </Button>

              {bmData && (
                <Button 
                  variant="outline"
                  onClick={() => autoMatchItems(rdaItems)}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Re-vincular ao BM
                </Button>
              )}

              <div className="flex-1" />

              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totais.comQuantidade}</span>/{totais.total} com quantidade
              </div>

              {totais.valorTotal > 0 && (
                <Badge variant="default" className="text-base px-3 py-1">
                  Total: R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              )}

              <Button onClick={exportResults} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          )}

          {/* Lista de Itens */}
          {rdaItems.length > 0 && (
            <Collapsible open={expandedSections.has('items')} className="flex-1">
              <CollapsibleTrigger 
                onClick={() => toggleSection('items')}
                className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded-lg hover:bg-muted"
              >
                {expandedSections.has('items') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">2. Atividades ({rdaItems.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="mb-3">
                  <Input
                    placeholder="Buscar atividade, obra ou data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Data</th>
                        <th className="p-2 text-left">Obra</th>
                        <th className="p-2 text-left">Atividade</th>
                        <th className="p-2 text-right">Qtd Sugerida</th>
                        <th className="p-2 text-right">Qtd Verificada</th>
                        <th className="p-2 text-right">Valor Unit.</th>
                        <th className="p-2 text-right">Valor Total</th>
                        <th className="p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => (
                        <tr key={item.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{item.data}</td>
                          <td className="p-2 max-w-[150px] truncate" title={item.obra}>{item.obra}</td>
                          <td className="p-2 max-w-[250px]">
                            <div className="truncate" title={item.atividade}>{item.atividade}</div>
                            {item.fonteSugestao && (
                              <div className="text-xs text-muted-foreground italic">
                                Fonte: "{item.fonteSugestao}"
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.quantidadeSugerida != null ? (
                              <div className="flex items-center justify-end gap-1">
                                <span>{item.quantidadeSugerida}</span>
                                <span className="text-xs text-muted-foreground">{item.itemBM?.unidade}</span>
                                {item.confiancaSugestao && (
                                  <Badge variant={item.confiancaSugestao > 0.7 ? 'default' : 'secondary'} className="text-xs">
                                    {Math.round(item.confiancaSugestao * 100)}%
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {editingId === item.id ? (
                              <Input
                                type="number"
                                className="w-24 h-7 text-right"
                                defaultValue={item.quantidadeVerificada || item.quantidadeSugerida || ''}
                                autoFocus
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) updateQuantity(item.id, val);
                                  else setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat((e.target as HTMLInputElement).value);
                                    if (!isNaN(val)) updateQuantity(item.id, val);
                                  }
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                            ) : (
                              <span 
                                className={item.quantidadeVerificada != null ? 'font-medium text-green-600' : 'text-muted-foreground'}
                                onClick={() => setEditingId(item.id)}
                              >
                                {item.quantidadeVerificada ?? '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.valorUnitario ? (
                              <span>R$ {item.valorUnitario.toFixed(2)}</span>
                            ) : item.status === 'sem_match' ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Sem BM
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {item.valorTotal ? (
                              <span className="text-green-600">
                                R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {item.quantidadeSugerida != null && !item.quantidadeVerificada && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 text-green-600"
                                  onClick={() => confirmQuantity(item.id)}
                                  title="Confirmar sugestão"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6"
                                onClick={() => setEditingId(item.id)}
                                title="Editar quantidade"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Estado vazio */}
          {rdaItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Importe um arquivo RDA para começar</p>
                <p className="text-sm">E opcionalmente uma tabela de preços (BM) para vincular valores</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
