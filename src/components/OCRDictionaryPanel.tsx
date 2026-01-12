import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X, Search, BookOpen, Filter, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOCRDictionary, DictionaryTerm } from '@/hooks/useOCRDictionary';
import { TECH_DICTIONARIES } from '@/utils/normalizationValidation';
import { cn } from '@/lib/utils';

// Contratos disponíveis
const CONTRATOS = [
  { value: 'GLOBAL', label: 'Global (todos)' },
  { value: 'FREEFLOW_SP270', label: 'Free Flow SP-270' },
  { value: 'CCR_VIAOESTE', label: 'CCR ViaOeste' },
  { value: 'ARTERIS', label: 'Arteris' },
  { value: 'CUSTOM', label: 'Customizado' },
];

const OCRDictionaryPanel: React.FC = () => {
  const {
    terms,
    loading,
    addTerm,
    updateTerm,
    deleteTerm,
    toggleActive,
  } = useOCRDictionary();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContrato, setFilterContrato] = useState<string>('ALL');
  const [showBuiltIn, setShowBuiltIn] = useState(false);
  
  // Form state
  const [newTermoErrado, setNewTermoErrado] = useState('');
  const [newTermoCorreto, setNewTermoCorreto] = useState('');
  const [newContrato, setNewContrato] = useState('GLOBAL');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTermoErrado, setEditTermoErrado] = useState('');
  const [editTermoCorreto, setEditTermoCorreto] = useState('');

  // Combinar termos built-in + customizados
  const allTerms = useMemo(() => {
    const combined: Array<DictionaryTerm & { isBuiltIn?: boolean }> = [];
    
    // Adicionar termos do banco
    for (const term of terms) {
      combined.push({ ...term, isBuiltIn: false });
    }
    
    // Adicionar termos built-in se mostrar
    if (showBuiltIn) {
      for (const [contrato, dict] of Object.entries(TECH_DICTIONARIES)) {
        for (const [errado, correto] of Object.entries(dict)) {
          combined.push({
            id: `builtin-${contrato}-${errado}`,
            termo_errado: errado,
            termo_correto: correto,
            contrato_key: contrato,
            ativo: true,
            created_at: '',
            updated_at: '',
            isBuiltIn: true,
          });
        }
      }
    }
    
    return combined;
  }, [terms, showBuiltIn]);

  // Filtrar termos
  const filteredTerms = useMemo(() => {
    return allTerms.filter(term => {
      const matchesSearch = 
        term.termo_errado.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.termo_correto.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesContrato = 
        filterContrato === 'ALL' || term.contrato_key === filterContrato;
      
      return matchesSearch && matchesContrato;
    });
  }, [allTerms, searchQuery, filterContrato]);

  // Adicionar novo termo
  const handleAddTerm = async () => {
    if (!newTermoErrado.trim() || !newTermoCorreto.trim()) return;
    
    const success = await addTerm({
      termo_errado: newTermoErrado,
      termo_correto: newTermoCorreto,
      contrato_key: newContrato,
    });
    
    if (success) {
      setNewTermoErrado('');
      setNewTermoCorreto('');
    }
  };

  // Iniciar edição
  const startEdit = (term: DictionaryTerm) => {
    setEditingId(term.id);
    setEditTermoErrado(term.termo_errado);
    setEditTermoCorreto(term.termo_correto);
  };

  // Salvar edição
  const handleSaveEdit = async (id: string) => {
    const success = await updateTerm(id, {
      termo_errado: editTermoErrado,
      termo_correto: editTermoCorreto,
    });
    
    if (success) {
      setEditingId(null);
    }
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingId(null);
    setEditTermoErrado('');
    setEditTermoCorreto('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Dicionário OCR
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Dicionário de Correções OCR
          </DialogTitle>
          <DialogDescription>
            Adicione termos para corrigir automaticamente erros de OCR (ex: EXECUO → EXECUÇÃO)
          </DialogDescription>
        </DialogHeader>

        {/* Formulário para adicionar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-secondary/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">Termo Errado</Label>
            <Input
              placeholder="EXECUO"
              value={newTermoErrado}
              onChange={(e) => setNewTermoErrado(e.target.value.toUpperCase())}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Termo Correto</Label>
            <Input
              placeholder="EXECUÇÃO"
              value={newTermoCorreto}
              onChange={(e) => setNewTermoCorreto(e.target.value.toUpperCase())}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contrato</Label>
            <Select value={newContrato} onValueChange={setNewContrato}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRATOS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleAddTerm} 
              disabled={!newTermoErrado.trim() || !newTermoCorreto.trim()}
              className="w-full h-9 gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar termo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {CONTRATOS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuiltIn(!showBuiltIn)}
            className={cn("gap-2", showBuiltIn && "bg-primary/10")}
          >
            {showBuiltIn ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {showBuiltIn ? 'Ocultando' : 'Mostrar'} built-in
          </Button>
        </div>

        {/* Tabela de termos */}
        <ScrollArea className="flex-1 border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Termo Errado</TableHead>
                <TableHead className="w-[200px]">Termo Correto</TableHead>
                <TableHead className="w-[120px]">Contrato</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTerms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Nenhum termo encontrado' : 'Nenhum termo cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTerms.map((term) => (
                  <TableRow key={term.id} className={cn(term.isBuiltIn && "opacity-60")}>
                    <TableCell className="font-mono text-sm">
                      {editingId === term.id ? (
                        <Input
                          value={editTermoErrado}
                          onChange={(e) => setEditTermoErrado(e.target.value.toUpperCase())}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-destructive">{term.termo_errado}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {editingId === term.id ? (
                        <Input
                          value={editTermoCorreto}
                          onChange={(e) => setEditTermoCorreto(e.target.value.toUpperCase())}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-success">{term.termo_correto}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {term.contrato_key}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {term.isBuiltIn ? (
                        <Badge variant="secondary" className="text-xs">Built-in</Badge>
                      ) : term.ativo ? (
                        <Badge className="bg-success/20 text-success text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {term.isBuiltIn ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : editingId === term.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSaveEdit(term.id)}
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleActive(term.id, !term.ativo)}
                          >
                            {term.ativo ? (
                              <ToggleRight className="h-4 w-4 text-success" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(term)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteTerm(term.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Footer com estatísticas */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>
            {filteredTerms.length} termo(s) • {terms.length} customizado(s)
          </span>
          <span>
            Termos são aplicados automaticamente durante o processamento
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OCRDictionaryPanel;
