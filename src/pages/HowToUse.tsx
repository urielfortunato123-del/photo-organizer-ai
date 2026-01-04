import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Upload, Settings, Sparkles, FileSpreadsheet, 
  FolderArchive, CheckCircle2, HelpCircle, Brain, Calendar,
  MapPin, Building2, Edit2, Eye, RefreshCw
} from 'lucide-react';
import logoObraphoto from '@/assets/logo-obraphoto.png';

const steps = [
  {
    number: 1,
    title: 'Upload das Fotos',
    icon: Upload,
    description: 'Adicione as fotos de obra que deseja classificar',
    details: [
      'Arraste as fotos para a área de upload ou clique para selecionar',
      'Formatos aceitos: JPG, JPEG, PNG, WEBP',
      'Tamanho máximo: 20MB por foto',
      'Você pode adicionar quantas fotos quiser de uma vez',
    ],
    tips: 'Dica: Fotos com placas de identificação ou datas visíveis terão classificação mais precisa.',
  },
  {
    number: 2,
    title: 'Configure as Opções',
    icon: Settings,
    description: 'Personalize como as fotos serão organizadas',
    details: [
      { icon: Building2, text: 'Empresa/Cliente: Nome da pasta raiz para organização' },
      { icon: MapPin, text: 'Frente de Serviço Padrão: Usado quando não identificado automaticamente' },
      { icon: Calendar, text: 'Organizar por Data: Cria subpastas por mês/ano e dia' },
      { icon: Brain, text: 'Prioridade IA: Usa análise avançada com inteligência artificial' },
    ],
    tips: 'Dica: Mantenha a "Prioridade IA" ativada para classificação mais precisa.',
  },
  {
    number: 3,
    title: 'Processar com IA',
    icon: Sparkles,
    description: 'A inteligência artificial analisa e classifica cada foto',
    details: [
      'Clique no botão "Processar com IA" para iniciar',
      'A IA analisa o conteúdo visual de cada imagem',
      'OCR extrai textos visíveis (placas, datas, identificações)',
      'Resultados aparecem em tempo real na tabela',
      'Cache evita reprocessamento de fotos duplicadas',
    ],
    tips: 'Dica: O processamento leva de 3-5 segundos por foto. Fotos em lote são mais rápidas.',
  },
  {
    number: 4,
    title: 'Revise os Resultados',
    icon: CheckCircle2,
    description: 'Verifique e corrija as classificações se necessário',
    details: [
      { icon: Eye, text: 'Clique no olho para ver a foto em tamanho maior' },
      { icon: Edit2, text: 'Clique no lápis para editar a classificação manualmente' },
      'Confira o nível de confiança (%) de cada classificação',
      'Use os filtros para encontrar fotos específicas',
      'Selecione múltiplas fotos para operações em lote',
    ],
    tips: 'Dica: Classificações com confiança abaixo de 70% merecem revisão manual.',
  },
  {
    number: 5,
    title: 'Exporte os Resultados',
    icon: FileSpreadsheet,
    description: 'Baixe a planilha e as fotos organizadas',
    details: [
      { icon: FileSpreadsheet, text: 'Excel: Relatório completo com todas as classificações' },
      { icon: FolderArchive, text: 'ZIP: Fotos organizadas em estrutura de pastas' },
    ],
    tips: 'Dica: O ZIP já vem com a estrutura pronta para copiar para o servidor.',
  },
];

const disciplines = [
  { name: 'FUNDAÇÃO', example: 'Estacas, blocos, sapatas' },
  { name: 'ESTRUTURA', example: 'Pilares, vigas, lajes' },
  { name: 'CONTENCÃO', example: 'Cortinas, tirantes' },
  { name: 'TERRAPLENAGEM', example: 'Escavação, aterro' },
  { name: 'DRENAGEM', example: 'Bueiros, bocas de lobo' },
  { name: 'PAVIMENTAÇÃO', example: 'Asfalto, base' },
  { name: 'ACABAMENTO', example: 'Pintura, textura' },
  { name: 'HIDRÁULICA', example: 'Tubulações, caixas' },
  { name: 'ELÉTRICA', example: 'Eletrodutos, quadros' },
  { name: 'E MAIS...', example: '+15 disciplinas' },
];

const HowToUse: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoObraphoto} alt="ObraPhoto" className="h-8" />
            <span className="font-semibold text-lg hidden sm:block">Como Usar</span>
          </div>
          <Button onClick={() => navigate('/')}>
            Ir para o App
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Como Usar o ObraPhoto AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Aprenda a classificar e organizar suas fotos de obra em poucos passos 
            usando nossa inteligência artificial avançada.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-16">
          {steps.map((step, index) => (
            <Card key={step.number} className="overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="bg-primary/5 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <step.icon className="w-5 h-5 text-primary" />
                      {step.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-4">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {typeof detail === 'string' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </>
                      ) : (
                        <>
                          <detail.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <span>{detail.text}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{step.tips}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disciplines Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Disciplinas Reconhecidas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {disciplines.map((disc, i) => (
              <Card key={i} className="text-center p-4 hover:border-primary transition-colors">
                <p className="font-semibold text-sm text-foreground">{disc.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{disc.example}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-2">
                A IA erra? Posso corrigir?
              </h3>
              <p className="text-muted-foreground text-sm">
                Sim! A IA tem taxa de acerto de 85-95%, mas você pode corrigir qualquer classificação 
                clicando no ícone de edição na tabela de resultados.
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-2">
                Minhas fotos ficam salvas em algum lugar?
              </h3>
              <p className="text-muted-foreground text-sm">
                Não. As fotos são processadas apenas para classificação e não são armazenadas em nossos servidores. 
                Toda a visualização é feita localmente no seu navegador.
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-2">
                O que significa o percentual de confiança?
              </h3>
              <p className="text-muted-foreground text-sm">
                É a certeza da IA sobre a classificação. Acima de 80% é considerado muito confiável. 
                Abaixo de 70%, recomendamos revisar manualmente.
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-2">
                Posso processar mais fotos depois?
              </h3>
              <p className="text-muted-foreground text-sm">
                Sim! O sistema acumula os resultados. Basta adicionar mais fotos e clicar em processar novamente. 
                Fotos duplicadas são detectadas automaticamente pelo cache.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="p-8 bg-primary/5 border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground mb-6">
              Experimente agora e veja como a IA pode transformar sua gestão de fotos de obra.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/')}>
                <Sparkles className="w-5 h-5 mr-2" />
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                Criar Conta Gratuita
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>ObraPhoto AI © 2026 - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
};

export default HowToUse;
