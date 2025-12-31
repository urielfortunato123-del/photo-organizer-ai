import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  Play, ImageIcon, CheckCircle2, XCircle, 
  Upload, Table as TableIcon, FolderTree,
  Settings, User, Sparkles, RefreshCw, FolderArchive, FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ProcessingOptions from '@/components/ProcessingOptions';
import EditableResultsTable from '@/components/EditableResultsTable';
import StatsCard from '@/components/StatsCard';
import TreeView from '@/components/TreeView';
import ProcessingProgress from '@/components/ProcessingProgress';
import PhotoPreviewModal from '@/components/PhotoPreviewModal';
import ResultsFilters, { ResultFilters } from '@/components/ResultsFilters';
import StatisticsCard from '@/components/StatisticsCard';
import { exportToCSV, exportToExcelXML } from '@/utils/exportExcel';
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
  const [organizeByDate, setOrganizeByDate] = useState(true);
  const [iaPriority, setIaPriority] = useState(true); // Default to AI mode
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

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhuma foto selecionada",
        description: "Adicione fotos para processar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProcessingStartTime(Date.now());
    setProcessingProgress({ current: 0, total: files.length, currentFile: '' });

    const config = {
      default_portico: defaultPortico,
      organize_by_date: organizeByDate,
      ia_priority: iaPriority,
    };

    try {
      const processedResults: ProcessingResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingProgress({ 
          current: i + 1, 
          total: files.length, 
          currentFile: file.name 
        });
        
        let result: ProcessingResult;

        try {
          if (config.ia_priority) {
            // Usar análise com IA
            result = await api.analyzeImage(file, config.default_portico);

            // Delay maior entre requisições para evitar rate limit (429)
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
            // Classificação simples sem IA (baseado apenas no nome do arquivo)
            result = {
              filename: file.name,
              status: 'Sucesso',
              portico: config.default_portico || 'NAO_IDENTIFICADO',
              disciplina: 'GERAL',
              service: 'REGISTRO',
              method: 'heuristica',
              confidence: 0.5,
              dest: `organized_photos/${config.default_portico || 'NAO_IDENTIFICADO'}/GERAL/REGISTRO`,
            };
          }
        } catch (fileError) {
          // Se falhar, registra erro mas continua com próximos arquivos
          console.warn(`Erro ao processar ${file.name}:`, fileError);
          result = {
            filename: file.name,
            status: `Erro: ${fileError instanceof Error ? fileError.message : 'Falha na análise'}`,
            method: 'ia_forcada',
            confidence: 0,
          };
        }

        // Update dest based on organize_by_date setting
        if (result.status === 'Sucesso' && result.dest && !config.organize_by_date) {
          // Remove date folders from path
          const parts = result.dest.split('/');
          const filtered = parts.filter((_, idx) => idx < 4);
          result.dest = filtered.join('/');
        }

        processedResults.push(result);
        setResults([...processedResults]);
      }

      setActiveTab('results');

      const finalSuccessCount = processedResults.filter(r => r.status === 'Sucesso').length;
      toast({
        title: "Processamento concluído!",
        description: `${finalSuccessCount} de ${files.length} fotos ${config.ia_priority ? 'analisadas com IA' : 'processadas'}.`,
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

  // Reprocessar apenas fotos que falharam
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

        // Atualizar resultado existente
        setResults(prev => prev.map(r => 
          r.filename === file.name ? result : r
        ));
      }

      const newResults = results.map(r => {
        const retried = failedFiles.find(f => f.name === r.filename);
        return retried ? results.find(nr => nr.filename === r.filename) || r : r;
      });

      const retriedSuccessCount = newResults.filter(r => 
        failedResults.some(fr => fr.filename === r.filename) && r.status === 'Sucesso'
      ).length;

      toast({
        title: "Reprocessamento concluído!",
        description: `${retriedSuccessCount} de ${failedFiles.length} fotos recuperadas.`,
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

  const handleDownload = async () => {
    toast({
      title: "Exportação",
      description: "Use o botão 'Exportar CSV' para baixar os resultados.",
    });
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

        // Adiciona o arquivo na estrutura de pastas
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
      // Revogar depois para não interromper download em alguns navegadores
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
    <div className="min-h-screen bg-background noise-overlay">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 pb-16">
        {/* AI Enabled Banner */}
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">IA Integrada Ativa</p>
            <p className="text-xs text-muted-foreground">
              Análise de imagens com Gemini 2.5 Flash • Sem necessidade de API key
            </p>
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="mb-6">
            <ProcessingProgress
              current={processingProgress.current}
              total={processingProgress.total}
              currentFileName={processingProgress.currentFile}
              startTime={processingStartTime}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && !isProcessing && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in">
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
              icon={Settings}
              label="Filtradas"
              value={filteredResults.length}
            />
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Resultados</span>
              {results.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                  {results.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tree"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <FolderTree className="w-4 h-4" />
              <span className="hidden sm:inline">Árvore</span>
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6">
                  <UploadZone files={files} onFilesChange={setFiles} />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleProcess}
                    disabled={isProcessing || files.length === 0}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        {iaPriority ? 'Analisando com IA...' : 'Processando...'}
                      </>
                    ) : (
                      <>
                        {iaPriority ? <Sparkles className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        {iaPriority 
                          ? `Analisar ${files.length > 0 ? `${files.length} Fotos` : 'Fotos'} com IA`
                          : `Processar ${files.length > 0 ? `${files.length} Fotos` : 'Fotos'}`
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-1">
                <ProcessingOptions
                  defaultPortico={defaultPortico}
                  onDefaultPorticoChange={setDefaultPortico}
                  organizeByDate={organizeByDate}
                  onOrganizeByDateChange={setOrganizeByDate}
                  iaPriority={iaPriority}
                  onIaPriorityChange={setIaPriority}
                />
              </div>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6 animate-fade-in">
            {results.length > 0 ? (
              <>
                {/* Filters */}
                <ResultsFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  porticos={uniquePorticos}
                  disciplinas={uniqueDisciplinas}
                />

                {/* Statistics */}
                <StatisticsCard results={results} />
                
                {/* Editable Results Table */}
                <EditableResultsTable 
                  results={filteredResults} 
                  isProcessing={isProcessing}
                  fileUrls={fileUrls}
                  onViewPhoto={handleViewPhoto}
                  onUpdateResult={handleUpdateResult}
                />
                
                <div className="flex justify-center gap-4">
                  {errorCount > 0 && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleRetryFailed}
                      disabled={isProcessing}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Reprocessar {errorCount} com Erro
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => exportToExcelXML(results, `obraphoto_${new Date().toISOString().split('T')[0]}.xls`)}
                    disabled={isProcessing}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Exportar Excel
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleExportZIP}
                    disabled={isProcessing || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Gerando ZIP...
                      </>
                    ) : (
                      <>
                        <FolderArchive className="w-5 h-5" />
                        Baixar ZIP Organizado
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <TableIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum resultado ainda
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Processe algumas fotos para ver os resultados aqui
                </p>
                <Button variant="outline" onClick={() => setActiveTab('upload')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Ir para Upload
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tree View Tab */}
          <TabsContent value="tree" className="animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <FolderTree className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Estrutura de Pastas</h3>
                        <p className="text-xs text-muted-foreground">
                          Visualize a organização das fotos
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                    <TreeView data={treeData} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-4">
                <div className="glass-card p-6">
                  <h4 className="font-semibold text-foreground mb-3">Estrutura Padrão</h4>
                  <div className="space-y-2 text-xs font-mono text-muted-foreground">
                    <p className="text-foreground">organized_photos/</p>
                    <p className="pl-4">└─ PORTICO_P_XX/</p>
                    <p className="pl-8">└─ DISCIPLINA/</p>
                    <p className="pl-12">└─ SERVICO/</p>
                    <p className="pl-16">└─ MM_MES/</p>
                    <p className="pl-20">└─ DD_MM/</p>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h4 className="font-semibold text-foreground mb-3">Legenda</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="confidence-high">90%+</span>
                      <span className="text-muted-foreground">Alta confiança</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="confidence-medium">50-89%</span>
                      <span className="text-muted-foreground">Média confiança</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="confidence-low">&lt;50%</span>
                      <span className="text-muted-foreground">Baixa confiança</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleExportZIP}
                  disabled={isExporting || results.length === 0}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Gerando ZIP...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-5 h-5" />
                      Baixar ZIP Organizado
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer with Developer Credit */}
        <div className="text-center py-8 mt-8 border-t border-border">
          <p className="text-sm text-foreground font-medium mb-1">
            ObraPhoto AI
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Análise com IA Gemini • Padrão: PORTICO/DISCIPLINA/SERVICO/MM_MES/DD_MM
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <User className="w-3 h-3" />
            Desenvolvido por <span className="text-primary font-medium">Uriel da Fonseca Fortunato</span>
          </p>
        </div>
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
