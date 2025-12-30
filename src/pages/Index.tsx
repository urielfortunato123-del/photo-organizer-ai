import React, { useState } from 'react';
import { Play, Download, ImageIcon, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';
import ProcessingOptions from '@/components/ProcessingOptions';
import ResultsTable, { ProcessingResult } from '@/components/ResultsTable';
import StatsCard from '@/components/StatsCard';

const Index: React.FC = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [defaultPortico, setDefaultPortico] = useState('');
  const [organizeByDate, setOrganizeByDate] = useState(true);
  const [iaPriority, setIaPriority] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);

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

    // Simulate processing with mock results
    // In production, this would call your FastAPI backend
    const mockResults: ProcessingResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      const services = [
        'Bueiro Tubular',
        'Escada Hidráulica',
        'Dissipador de Energia',
        'Solo-Cimento',
        'Terraplenagem',
        'Drenagem Profunda',
      ];
      
      const porticos = ['P01', 'P02', 'P03', 'P04', 'P05'];
      const disciplines = ['DRENAGEM', 'TERRAPLENAGEM', 'PAVIMENTACAO', 'OAC'];
      
      const isSuccess = Math.random() > 0.1;
      const randomService = services[Math.floor(Math.random() * services.length)];
      const randomPortico = defaultPortico || porticos[Math.floor(Math.random() * porticos.length)];
      const randomDiscipline = disciplines[Math.floor(Math.random() * disciplines.length)];
      
      const result: ProcessingResult = {
        filename: files[i].name,
        status: isSuccess ? 'Sucesso' : 'Erro: Falha ao processar imagem',
        service: isSuccess ? randomService : undefined,
        dest: isSuccess 
          ? `organized_photos/PORTICO_${randomPortico}/${randomDiscipline}/${randomService}${organizeByDate ? '/2025-01-15' : ''}`
          : undefined,
        tecnico: isSuccess && iaPriority
          ? `Estrutura de drenagem do tipo ${randomService.toLowerCase()} em bom estado de conservação. Dimensões aproximadas compatíveis com projeto. Recomenda-se vistoria periódica.`
          : undefined,
      };
      
      mockResults.push(result);
      setResults([...mockResults]);
    }

    setIsProcessing(false);
    
    const successCount = mockResults.filter(r => r.status === 'Sucesso').length;
    toast({
      title: "Processamento concluído!",
      description: `${successCount} de ${files.length} fotos processadas com sucesso.`,
    });
  };

  const handleDownload = () => {
    toast({
      title: "Download iniciado",
      description: "Preparando arquivo ZIP com fotos organizadas...",
    });
    // In production, this would trigger download from your FastAPI backend
  };

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
            <StatsCard
              icon={ImageIcon}
              label="Fotos Processadas"
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
          </div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <UploadZone files={files} onFilesChange={setFiles} />
            </div>

            {/* Action Buttons */}
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
              
              {results.length > 0 && (
                <Button
                  variant="outline"
                  size="xl"
                  onClick={handleDownload}
                  disabled={isProcessing}
                >
                  <Download className="w-5 h-5" />
                  Baixar ZIP
                </Button>
              )}
            </div>
          </div>

          {/* Options Sidebar */}
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

        {/* Results */}
        <ResultsTable results={results} isProcessing={isProcessing} />

        {/* Footer Note */}
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">
            ObraPhoto AI • Análise inteligente com OCR + Gemini/GPT
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Conecte seu backend FastAPI para funcionalidade completa
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
