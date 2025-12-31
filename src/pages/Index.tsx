import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  Play, ImageIcon, CheckCircle2, XCircle, 
  Upload, Table as TableIcon, FolderTree,
  User, Sparkles, RefreshCw, FolderArchive, FileSpreadsheet,
  Plus, X
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
import { 
  api, 
  ProcessingResult, 
  TreeNode,
  buildTreeFromResults 
} from '@/services/api';

const Index: React.FC = () => {
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
    setProcessingProgress({ current: 0, total: newFiles.length, currentFile: '' });

    const config = {
      default_portico: defaultPortico,
      empresa: empresa,
      organize_by_date: organizeByDate,
      ia_priority: iaPriority,
    };

    try {
      const newResults: ProcessingResult[] = [];
      const newProcessedNames = new Set(processedFiles);
      
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        setProcessingProgress({ 
          current: i + 1, 
          total: newFiles.length, 
          currentFile: file.name 
        });
        
        let result: ProcessingResult;

        try {
          if (config.ia_priority) {
            result = await api.analyzeImage(file, config.default_portico, config.empresa);
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
            const empresaNome = config.empresa || 'EMPRESA';
            result = {
              filename: file.name,
              status: 'Sucesso',
              portico: config.default_portico || 'NAO_IDENTIFICADO',
              disciplina: 'GERAL',
              service: 'REGISTRO',
              empresa: empresaNome,
              method: 'heuristica',
              confidence: 0.5,
              dest: `${empresaNome}/FOTOS/${config.default_portico || 'NAO_IDENTIFICADO'}/GERAL/REGISTRO`,
            };
          }
        } catch (fileError) {
          console.warn(`Erro ao processar ${file.name}:`, fileError);
          result = {
            filename: file.name,
            status: `Erro: ${fileError instanceof Error ? fileError.message : 'Falha na análise'}`,
            method: 'ia_forcada',
            confidence: 0,
          };
        }

        // If not organizing by date, remove date folders from path
        if (result.status === 'Sucesso' && result.dest && !config.organize_by_date) {
          const parts = result.dest.split('/');
          // Keep: EMPRESA/FOTOS/FRENTE/DISCIPLINA/SERVICO (5 parts)
          const filtered = parts.slice(0, 5);
          result.dest = filtered.join('/');
        }

        newResults.push(result);
        newProcessedNames.add(file.name);
        
        // Accumulate results instead of replacing
        setResults(prev => [...prev, result]);
      }

      setProcessedFiles(newProcessedNames);
      setActiveTab('results');

      const finalSuccessCount = newResults.filter(r => r.status === 'Sucesso').length;
      toast({
        title: "Lote processado!",
        description: `${finalSuccessCount} de ${newFiles.length} novas fotos analisadas. Total: ${results.length + newResults.length} fotos.`,
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

    try {
      for (let i = 0; i < failedFiles.length; i++) {
        const file = failedFiles[i];
        setProcessingProgress({ 
          current: i + 1, 
          total: failedFiles.length, 
          currentFile: file.name 
        });

        let result: ProcessingResult;

        try {
          result = await api.analyzeImage(file, defaultPortico);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (fileError) {
          console.warn(`Erro ao reprocessar ${file.name}:`, fileError);
          result = {
            filename: file.name,
            status: `Erro: ${fileError instanceof Error ? fileError.message : 'Falha na análise'}`,
            method: 'ia_forcada',
            confidence: 0,
          };
        }

        setResults(prev => prev.map(r => 
          r.filename === file.name ? result : r
        ));
      }

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
                        Adicione mais fotos e continue processando. Baixe tudo no final.
                      </p>
                    </div>
                  </div>
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
                      <p className="text-foreground">organized_photos/</p>
                      <p className="pl-4">└─ PORTICO_P_XX/</p>
                      <p className="pl-8">└─ DISCIPLINA/</p>
                      <p className="pl-12">└─ SERVICO/</p>
                      <p className="pl-16">└─ MM_MES/</p>
                      <p className="pl-20">└─ DD_MM/</p>
                    </div>
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
