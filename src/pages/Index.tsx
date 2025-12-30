import React, { useState, useEffect } from 'react';
import { 
  Play, Download, ImageIcon, CheckCircle2, XCircle, 
  Upload, Table as TableIcon, FolderTree, AlertCircle,
  Settings, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ProcessingOptions from '@/components/ProcessingOptions';
import ResultsTable from '@/components/ResultsTable';
import StatsCard from '@/components/StatsCard';
import TreeView from '@/components/TreeView';
import { 
  api, 
  ProcessingResult, 
  TreeNode,
  mockTreeData, 
  generateMockResults 
} from '@/services/api';

const Index: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [defaultPortico, setDefaultPortico] = useState('');
  const [organizeByDate, setOrganizeByDate] = useState(true);
  const [iaPriority, setIaPriority] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  const successCount = results.filter(r => r.status === 'Sucesso').length;
  const errorCount = results.filter(r => r.status.includes('Erro')).length;
  const heuristicaCount = results.filter(r => r.method === 'heuristica').length;
  const iaCount = results.filter(r => r.method === 'ia_fallback' || r.method === 'ia_forcada').length;

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      const connected = await api.healthCheck();
      setIsBackendConnected(connected);
      
      if (connected) {
        // Load tree data
        try {
          const tree = await api.getTree();
          setTreeData(tree);
        } catch {
          setTreeData(mockTreeData);
        }
      } else {
        // Use mock data for demo
        setTreeData(mockTreeData);
      }
    };
    
    checkBackend();
  }, []);

  const loadTreeData = async () => {
    setIsLoadingTree(true);
    try {
      if (isBackendConnected) {
        const tree = await api.getTree();
        setTreeData(tree);
      } else {
        // Simulate loading for demo
        await new Promise(resolve => setTimeout(resolve, 500));
        setTreeData(mockTreeData);
      }
    } catch (error) {
      console.error('Failed to load tree:', error);
      setTreeData(mockTreeData);
    } finally {
      setIsLoadingTree(false);
    }
  };

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

    const config = {
      default_portico: defaultPortico,
      organize_by_date: organizeByDate,
      ia_priority: iaPriority,
    };

    try {
      if (isBackendConnected) {
        // Real API call
        const processedResults = await api.processPhotos(files, config);
        setResults(processedResults);
      } else {
        // Mock processing for demo
        const mockResults: ProcessingResult[] = [];
        
        for (let i = 0; i < files.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
          const batchResults = generateMockResults([files[i]], config);
          mockResults.push(...batchResults);
          setResults([...mockResults]);
        }
      }

      // Switch to results tab
      setActiveTab('results');
      
      // Reload tree data
      await loadTreeData();

      const finalSuccessCount = results.filter(r => r.status === 'Sucesso').length;
      toast({
        title: "Processamento concluído!",
        description: `${finalSuccessCount} de ${files.length} fotos processadas.`,
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Erro no processamento",
        description: "Verifique a conexão com o backend",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (isBackendConnected) {
        const blob = await api.downloadZip();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fotos_organizadas.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast({
          title: "Modo demonstração",
          description: "Conecte ao backend FastAPI para baixar o ZIP",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível gerar o arquivo ZIP",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 pb-16">
        {/* Backend Status Banner */}
        {isBackendConnected === false && (
          <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modo Demonstração</p>
              <p className="text-xs text-muted-foreground">
                Backend FastAPI não detectado. Usando dados simulados. 
                Configure <code className="px-1 py-0.5 bg-secondary rounded text-xs">VITE_API_URL</code> para conectar.
              </p>
            </div>
            <Server className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
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
              icon={Settings}
              label="Heurística"
              value={heuristicaCount}
            />
            <StatsCard
              icon={Settings}
              label="IA"
              value={iaCount}
              variant="primary"
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
                        Processando...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Processar {files.length > 0 ? `${files.length} Fotos` : 'Fotos'}
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
                <ResultsTable results={results} isProcessing={isProcessing} />
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDownload}
                    disabled={isProcessing}
                  >
                    <Download className="w-5 h-5" />
                    Baixar ZIP Organizado
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={loadTreeData}
                      disabled={isLoadingTree}
                    >
                      {isLoadingTree ? (
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      ) : (
                        'Atualizar'
                      )}
                    </Button>
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
                  variant="outline"
                  size="lg"
                  onClick={handleDownload}
                  className="w-full"
                  disabled={treeData.length === 0}
                >
                  <Download className="w-5 h-5" />
                  Baixar ZIP
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center py-8 mt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            ObraPhoto AI • OCR + Heurística + Gemini/GPT
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Padrão: PORTICO/DISCIPLINA/SERVICO/MM_MES/DD_MM
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
