import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  Play, ImageIcon, CheckCircle2, XCircle, 
  Upload, Table as TableIcon, FolderTree, Folder,
  User, Sparkles, RefreshCw, FolderArchive, FileSpreadsheet,
  Plus, X, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import GnomeSidebar from '@/components/GnomeSidebar';
import UploadZone from '@/components/UploadZone';
import ProcessingOptions from '@/components/ProcessingOptions';
import EditableResultsTable from '@/components/EditableResultsTable';
import StatsCard from '@/components/StatsCard';
import TreeView from '@/components/TreeView';
import ProcessingProgress from '@/components/ProcessingProgress';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';
import ResultsFilters, { ResultFilters } from '@/components/ResultsFilters';
import StatisticsCard from '@/components/StatisticsCard';
import { exportToExcelXML } from '@/utils/exportExcel';
import { useImageCache } from '@/hooks/useImageCache';
import { 
  api, 
  ProcessingResult, 
  TreeNode,
  buildTreeFromResults 
} from '@/services/api';

const Index: React.FC = () => {
  const imageCache = useImageCache();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());
  const [defaultPortico, setDefaultPortico] = useState('');
  const [empresa, setEmpresa] = useState('HABITECHENE');
  const [organizeByDate, setOrganizeByDate] = useState(true);
  const [iaPriority, setIaPriority] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  
  // Progress tracking
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>();
  
  // Photo preview modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    result: ProcessingResult | null;
    imageUrl?: string;
  }>({ isOpen: false, result: null });
  
  // Filters
  const [filters, setFilters] = useState<ResultFilters>({
    search: '',
    portico: '',
    disciplina: '',
    method: '',
    minConfidence: 0,
  });

  // Generate file URLs when files change
  useEffect(() => {
    const urls = new Map<string, string>();
    files.forEach(file => {
      urls.set(file.name, URL.createObjectURL(file));
    });
    setFileUrls(urls);
    
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  // Update tree when results change
  useEffect(() => {
    if (results.length > 0) {
      setTreeData(buildTreeFromResults(results));
    }
  }, [results]);

  // Extract unique values for filter dropdowns
  const uniquePorticos = useMemo(() => 
    [...new Set(results.map(r => r.portico).filter(Boolean) as string[])],
    [results]
  );
  
  const uniqueDisciplinas = useMemo(() => 
    [...new Set(results.map(r => r.disciplina).filter(Boolean) as string[])],
    [results]
  );

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (filters.search && !r.filename.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.portico && r.portico !== filters.portico) {
        return false;
      }
      if (filters.disciplina && r.disciplina !== filters.disciplina) {
        return false;
      }
      if (filters.method && r.method !== filters.method) {
        return false;
      }
      if (filters.minConfidence > 0 && (r.confidence || 0) * 100 < filters.minConfidence) {
        return false;
      }
      return true;
    });
  }, [results, filters]);

  const successCount = results.filter(r => r.status === 'Sucesso').length;
  const errorCount = results.filter(r => r.status.includes('Erro')).length;

  // Track processed filenames to avoid duplicates
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());

  const handleProcess = async () => {
    // Filter out already processed files
    const newFiles = files.filter(f => !processedFiles.has(f.name));
    
    if (newFiles.length === 0) {
      toast({
        title: "Nenhuma foto nova",
        description: files.length > 0 
          ? "Todas as fotos já foram processadas. Adicione novas fotos."
          : "Adicione fotos para processar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    setProcessingProgress({ current: 0, total: newFiles.length, currentFile: 'Preparando...' });

    const config = {
      default_portico: defaultPortico,
      empresa: empresa,
      organize_by_date: organizeByDate,
      ia_priority: iaPriority,
    };

    try {
      // Use the optimized processPhotos with cache and batching
      const newResults = await api.processPhotos(
        newFiles,
        config,
        (current, total, filename) => {
          setProcessingProgress({ current, total, currentFile: filename });
        },
        {
          getCached: imageCache.getCached,
          setCache: imageCache.setCache,
          setCacheBulk: imageCache.setCacheBulk,
        },
        // Callback for batch completion - update results in real-time
        (batchResults) => {
          setResults(prev => [...prev, ...batchResults]);
          batchResults.forEach(r => {
            setProcessedFiles(prev => new Set([...prev, r.filename]));
          });
          // Switch to results tab when first results arrive
          setActiveTab('results');
        }
      );

      // Final update for processed files
      const newProcessedNames = new Set(processedFiles);
      newResults.forEach(r => newProcessedNames.add(r.filename));
      setProcessedFiles(newProcessedNames);

      const cacheStats = imageCache.getCacheStats();
      const cachedCount = newResults.filter(r => r.status === 'Sucesso').length;
      
      toast({
        title: "Lote processado!",
        description: `${cachedCount} de ${newFiles.length} fotos analisadas. Cache: ${cacheStats.total} itens.`,
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentFile: '' });
      setProcessingStartTime(undefined);
    }
  };

  const handleRetryFailed = async () => {
    const failedResults = results.filter(r => r.status.includes('Erro'));
    if (failedResults.length === 0) {
      toast({
        title: "Nenhum erro encontrado",
        description: "Não há fotos com erro para reprocessar.",
      });
      return;
    }

    const failedFiles = files.filter(f => 
      failedResults.some(r => r.filename === f.name)
    );

    if (failedFiles.length === 0) {
      toast({
        title: "Arquivos não encontrados",
        description: "Os arquivos originais não estão mais disponíveis.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    setProcessingProgress({ current: 0, total: failedFiles.length, currentFile: '' });

    const config = {
      default_portico: defaultPortico,
      empresa: empresa,
      organize_by_date: organizeByDate,
      ia_priority: true,
    };

    try {
      const retryResults = await api.processPhotos(
        failedFiles,
        config,
        (current, total, filename) => {
          setProcessingProgress({ current, total, currentFile: filename });
        },
        // Don't use cache for retries
        undefined,
        // Callback for batch completion - replace failed results in real-time
        (batchResults) => {
          setResults(prev => {
            const updated = [...prev];
            for (const newResult of batchResults) {
              const idx = updated.findIndex(r => r.filename === newResult.filename);
              if (idx >= 0) {
                updated[idx] = newResult;
              } else {
                updated.push(newResult);
              }
            }
            return updated;
          });
        }
      );

      // Cache successful results
      retryResults
        .filter(r => r.status === 'Sucesso' && r.hash)
        .forEach(r => imageCache.setCache(r.hash!, r));

      toast({
        title: "Reprocessamento concluído!",
        description: `${failedFiles.length} fotos reprocessadas.`,
      });
    } catch (error) {
      console.error('Retry error:', error);
      toast({
        title: "Erro no reprocessamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentFile: '' });
      setProcessingStartTime(undefined);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportZIP = async () => {
    const successResults = results.filter((r) => r.status === 'Sucesso' && r.dest);

    if (successResults.length === 0) {
      toast({
        title: "Nenhuma foto para exportar",
        description: "Não há fotos com classificação bem-sucedida.",
        variant: "destructive",
      });
      return;
    }

    const sanitizeZipPart = (part: string) =>
      part
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    setIsExporting(true);

    try {
      const zip = new JSZip();

      for (const result of successResults) {
        const file = files.find((f) => f.name === result.filename);
        if (!file || !result.dest) continue;

        const arrayBuffer = await file.arrayBuffer();

        const destParts = result.dest
          .split('/')
          .filter(Boolean)
          .map(sanitizeZipPart);
        const safeFilename = sanitizeZipPart(result.filename);

        zip.file(`${destParts.join('/')}/${safeFilename}`, arrayBuffer);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obraphoto_organizado_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast({
        title: "ZIP exportado!",
        description: `${successResults.length} fotos organizadas em pastas.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewPhoto = (result: ProcessingResult, imageUrl?: string) => {
    setPreviewModal({ isOpen: true, result, imageUrl });
  };

  const handleUpdateResult = (updated: ProcessingResult) => {
    setResults(prev => prev.map(r => 
      r.filename === updated.filename ? updated : r
    ));
    setPreviewModal({ isOpen: false, result: null });
    toast({
      title: "Classificação atualizada",
      description: `${updated.filename} foi reclassificado.`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* GNOME Sidebar */}
      <GnomeSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        resultsCount={results.length}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Processing Progress */}
        {isProcessing && (
          <div className="p-6 border-b border-border bg-card">
            <ProcessingProgress
              current={processingProgress.current}
              total={processingProgress.total}
              currentFileName={processingProgress.currentFile}
              startTime={processingStartTime}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Stats Bar */}
        {results.length > 0 && !isProcessing && (
          <div className="p-6 border-b border-border bg-card/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
              <StatsCard
                icon={ImageIcon}
                label="Processadas"
                value={results.length}
                variant="primary"
              />
              <StatsCard
                icon={CheckCircle2}
                label="Sucesso"
                value={successCount}
                variant="success"
              />
              <StatsCard
                icon={XCircle}
                label="Erros"
                value={errorCount}
              />
              <StatsCard
                icon={TableIcon}
                label="Filtradas"
                value={filteredResults.length}
              />
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-fade-in">
              {/* Accumulated results banner */}
              {results.length > 0 && (
                <div className="gnome-card p-4 bg-primary/10 border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderArchive className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {results.length} fotos já processadas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Adicione mais fotos e continue processando. Cache: {imageCache.getCacheStats().total} itens ({imageCache.getCacheStats().size})
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        imageCache.clearCache();
                        toast({ title: "Cache limpo", description: "O cache de imagens foi removido." });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Database className="w-4 h-4 mr-1" />
                      Limpar cache
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResults([]);
                        setProcessedFiles(new Set());
                        setFiles([]);
                        setTreeData([]);
                        toast({ title: "Sessão limpa", description: "Todos os resultados foram removidos." });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar tudo
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Upload de Fotos</h2>
                  <p className="text-muted-foreground">Adicione fotos de obra para análise automática com IA</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="gnome-card p-6">
                    <UploadZone files={files} onFilesChange={setFiles} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleProcess}
                      disabled={isProcessing || files.length === 0}
                      className="gnome-btn-primary flex-1 h-12 text-base"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {files.filter(f => !processedFiles.has(f.name)).length > 0 
                            ? `Analisar ${files.filter(f => !processedFiles.has(f.name)).length} Novas Fotos`
                            : files.length > 0 
                              ? 'Todas já processadas'
                              : 'Adicionar Fotos'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <ProcessingOptions
                    defaultPortico={defaultPortico}
                    onDefaultPorticoChange={setDefaultPortico}
                    empresa={empresa}
                    onEmpresaChange={setEmpresa}
                    organizeByDate={organizeByDate}
                    onOrganizeByDateChange={setOrganizeByDate}
                    iaPriority={iaPriority}
                    onIaPriorityChange={setIaPriority}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              {results.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">Resultados da Análise</h2>
                      <p className="text-muted-foreground">{results.length} fotos processadas</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => exportToExcelXML(results, `obraphoto_${new Date().toISOString().split('T')[0]}.xls`)}
                        disabled={isProcessing}
                        className="rounded-xl"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </Button>
                      <Button
                        onClick={handleExportZIP}
                        disabled={isProcessing || isExporting}
                        className="gnome-btn-primary"
                      >
                        {isExporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <FolderArchive className="w-4 h-4" />
                            Baixar ZIP
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <ResultsFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    porticos={uniquePorticos}
                    disciplinas={uniqueDisciplinas}
                  />

                  {/* Statistics */}
                  <StatisticsCard results={results} />
                  
                  {/* Results Table */}
                  <EditableResultsTable 
                    results={filteredResults} 
                    isProcessing={isProcessing}
                    fileUrls={fileUrls}
                    onViewPhoto={handleViewPhoto}
                    onUpdateResult={handleUpdateResult}
                  />
                  
                  {errorCount > 0 && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={handleRetryFailed}
                        disabled={isProcessing}
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reprocessar {errorCount} com Erro
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="gnome-card p-16 text-center">
                  <TableIcon className="w-20 h-20 mx-auto mb-6 text-muted-foreground/30" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Nenhum resultado ainda
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Processe algumas fotos para ver os resultados aqui
                  </p>
                  <Button 
                    onClick={() => setActiveTab('upload')}
                    className="gnome-btn-primary"
                  >
                    <Upload className="w-4 h-4" />
                    Ir para Upload
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tree View Tab */}
          {activeTab === 'tree' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Estrutura de Pastas</h2>
                  <p className="text-muted-foreground">Visualize a organização das fotos</p>
                </div>
                <Button
                  onClick={handleExportZIP}
                  disabled={isExporting || results.length === 0}
                  className="gnome-btn-primary"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-4 h-4" />
                      Baixar ZIP
                    </>
                  )}
                </Button>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="gnome-card p-6">
                    {/* Editable root folder */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                      <Folder className="w-5 h-5 text-primary" />
                      <input
                        type="text"
                        value={empresa}
                        onChange={(e) => {
                          const newEmpresa = e.target.value.toUpperCase().replace(/\s+/g, '_');
                          setEmpresa(newEmpresa);
                          // Update all results with new empresa
                          setResults(prev => prev.map(r => ({
                            ...r,
                            empresa: newEmpresa,
                            dest: r.dest?.replace(/^[^/]+/, newEmpresa)
                          })));
                        }}
                        className="font-mono font-semibold text-foreground bg-transparent border-b border-dashed border-primary/50 focus:border-primary outline-none px-1"
                        placeholder="NOME_EMPRESA"
                      />
                      <span className="text-muted-foreground font-mono">/</span>
                      <span className="font-mono text-muted-foreground">FOTOS/</span>
                    </div>
                    
                    <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                      {treeData.length > 0 ? (
                        <TreeView data={treeData} />
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FolderTree className="w-16 h-16 mx-auto mb-4 opacity-30" />
                          <p>Nenhuma estrutura para exibir</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <div className="gnome-card p-6">
                    <h4 className="font-semibold text-foreground mb-4">Estrutura Padrão</h4>
                    <div className="space-y-2 text-sm font-mono text-muted-foreground bg-secondary/50 p-4 rounded-xl">
                      <p className="text-primary font-semibold">{empresa || 'EMPRESA'}/</p>
                      <p className="pl-4">└─ FOTOS/</p>
                      <p className="pl-8">└─ FRENTE_SERVICO/</p>
                      <p className="pl-12">└─ DISCIPLINA/</p>
                      <p className="pl-16">└─ SERVICO/</p>
                      <p className="pl-20">└─ MES_ANO/</p>
                      <p className="pl-24">└─ DIA_MES/</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Clique no nome da empresa acima para editar
                    </p>
                  </div>

                  <div className="gnome-card p-6">
                    <h4 className="font-semibold text-foreground mb-4">Legenda</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="confidence-high">90%+</span>
                        <span className="text-sm text-muted-foreground">Alta confiança</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="confidence-medium">50-89%</span>
                        <span className="text-sm text-muted-foreground">Média confiança</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="confidence-low">&lt;50%</span>
                        <span className="text-sm text-muted-foreground">Baixa confiança</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <User className="w-4 h-4" />
            Desenvolvido por <span className="font-medium text-foreground">Uriel da Fonseca Fortunato</span>
          </p>
        </footer>
      </main>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, result: null })}
        result={previewModal.result}
        imageUrl={previewModal.imageUrl}
        onUpdateResult={handleUpdateResult}
      />
    </div>
  );
};

export default Index;
