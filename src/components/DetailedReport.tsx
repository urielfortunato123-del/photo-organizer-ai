import React, { useRef, useState } from 'react';
import { ProcessingResult } from '@/services/api';
import { 
  FileText, Printer, XCircle, Camera, LayoutTemplate
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import logoObraphoto from '@/assets/logo-obraphoto.png';

// Template types
type ReportTemplate = 'obra' | 'servico' | 'checklist' | 'simples';

interface DetailedReportProps {
  results: ProcessingResult[];
  fileUrls: Map<string, string>;
  empresa?: string;
  onClose: () => void;
}

// Helper to chunk array into groups
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Template configurations
const TEMPLATE_CONFIG: Record<ReportTemplate, { 
  name: string; 
  description: string; 
  photosPerPage: number;
  primaryColor: string;
  headerBg: string;
}> = {
  obra: {
    name: 'Acompanhamento de Obra',
    description: 'Tabela com etapa, município, % físico',
    photosPerPage: 6,
    primaryColor: '#000000',
    headerBg: '#ffffff',
  },
  servico: {
    name: 'Relatório de Serviço',
    description: 'Cabeçalho colorido com cliente/empresa',
    photosPerPage: 4,
    primaryColor: '#D97706',
    headerBg: '#FEF3C7',
  },
  checklist: {
    name: 'Checklist de Inspeção',
    description: 'Estilo inspeção com diagnóstico',
    photosPerPage: 4,
    primaryColor: '#059669',
    headerBg: '#D1FAE5',
  },
  simples: {
    name: 'Simples',
    description: 'Apenas fotos com legendas',
    photosPerPage: 6,
    primaryColor: '#374151',
    headerBg: '#F3F4F6',
  },
};

const DetailedReport: React.FC<DetailedReportProps> = ({
  results,
  fileUrls,
  empresa = 'EMPRESA',
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<ReportTemplate>('obra');
  
  // Report metadata for all templates
  const [reportData, setReportData] = useState({
    // Obra template
    etapa: '',
    municipio: '',
    data: new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
    percentualFisico: '0,00%',
    evolucaoSemanal: '0,00%',
    // Servico template
    cliente: '',
    clienteRazaoSocial: '',
    objetivo: '',
    servicoRealizado: '',
    localizacaoGps: '',
    observacoes: '',
    responsavel: '',
    // Checklist template
    tituloInspecao: 'Checklist de Inspeção Visual',
    pontuacao: '100%',
    diagnostico: '',
    solucoesAplicadas: '',
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'Relatório Fotográfico';
    window.print();
    document.title = originalTitle;
  };

  const allResults = results;
  const config = TEMPLATE_CONFIG[template];
  const pages = chunkArray(allResults, config.photosPerPage);
  const totalPages = pages.length;

  // Render photo item based on template
  const renderPhotoItem = (result: ProcessingResult, globalIndex: number) => {
    const imageUrl = fileUrls.get(result.filename);
    const caption = result.service 
      ? `${result.service}${result.portico ? ` - ${result.portico}` : ''}`
      : result.tecnico?.substring(0, 80) || result.disciplina || 'REGISTRO FOTOGRÁFICO';
    const photoDate = result.exif_date || result.data_detectada || '';
    const hasGps = result.gps_lat && result.gps_lon;

    return (
      <div key={`${result.filename}-${globalIndex}`} className="photo-cell">
        <div className="photo-wrapper">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={`Foto ${globalIndex + 1}`}
              className="photo-image"
            />
          ) : (
            <div className="photo-placeholder">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {(photoDate || hasGps) && (
            <div className="photo-metadata-overlay">
              {photoDate && <span>{photoDate}</span>}
              {hasGps && <span>{result.gps_lat?.toFixed(5)}, {result.gps_lon?.toFixed(5)}</span>}
            </div>
          )}
        </div>
        
        <div className="photo-caption" style={{ borderColor: config.primaryColor }}>
          <span className="font-bold">FOTO {globalIndex + 1}</span> - {caption.toUpperCase()}
        </div>
      </div>
    );
  };

  // Render template-specific header
  const renderHeader = (pageIndex: number) => {
    switch (template) {
      case 'obra':
        return (
          <>
            <div className="text-center mb-4">
              <h1 className="text-base font-bold text-black uppercase underline">
                RELATÓRIO DE FOTOGRÁFICO
              </h1>
            </div>
            <table className="w-full mb-4 border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-white" style={{ width: '12%' }}>Etapa:</td>
                  <td className="border border-black p-2 text-center" colSpan={2}>
                    {reportData.etapa || 'DESCRIÇÃO DA ETAPA'}
                  </td>
                  <td className="border border-black p-2 font-bold bg-white" style={{ width: '12%' }}>Folha:</td>
                  <td className="border border-black p-2 text-center" style={{ width: '12%' }}>
                    {String(pageIndex + 1).padStart(2, '0')} de {String(totalPages).padStart(2, '0')}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold bg-white">Município:</td>
                  <td className="border border-black p-2">{reportData.municipio || empresa}</td>
                  <td className="border border-black p-2 font-bold bg-white" style={{ width: '20%' }}></td>
                  <td className="border border-black p-2 font-bold bg-white">Data:</td>
                  <td className="border border-black p-2 text-center">{reportData.data}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold bg-white" colSpan={2}>% Físico Concluído da Obra:</td>
                  <td className="border border-black p-2 text-center">{reportData.percentualFisico}</td>
                  <td className="border border-black p-2 font-bold bg-white">Evolução Semanal:</td>
                  <td className="border border-black p-2 text-center">{reportData.evolucaoSemanal}</td>
                </tr>
              </tbody>
            </table>
            <div className="text-center mb-3">
              <h2 className="text-sm font-bold text-black uppercase">FOTOS</h2>
            </div>
          </>
        );

      case 'servico':
        return (
          <>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2" style={{ borderColor: config.primaryColor }}>
              <img src={logoObraphoto} alt="Logo" className="h-12 object-contain" />
              <div className="text-right">
                <h1 className="text-lg font-bold" style={{ color: config.primaryColor }}>
                  Relatório Fotográfico de Serviço
                </h1>
                <p className="text-xs text-gray-600">
                  Em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Cliente section */}
            <div className="mb-3 p-2 rounded" style={{ backgroundColor: config.headerBg }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: config.primaryColor }}>Cliente</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="font-semibold">Nome:</span> {reportData.cliente || empresa}</div>
                <div><span className="font-semibold">Razão social:</span> {reportData.clienteRazaoSocial || '-'}</div>
              </div>
            </div>

            {/* Dados gerais */}
            <div className="mb-3 p-2 rounded" style={{ backgroundColor: config.headerBg }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: config.primaryColor }}>Dados gerais</h3>
              <div className="text-xs space-y-1">
                <div><span className="font-semibold">Objetivo:</span> {reportData.objetivo || 'Registro fotográfico'}</div>
                <div><span className="font-semibold">Serviço realizado:</span> {reportData.servicoRealizado || '-'}</div>
                <div><span className="font-semibold">Localização GPS:</span> {reportData.localizacaoGps || '-'}</div>
              </div>
            </div>

            {/* Fotos header */}
            <div className="p-2 mb-3 rounded" style={{ backgroundColor: config.primaryColor }}>
              <h2 className="text-sm font-bold text-white">Fotos do Relatório</h2>
            </div>
          </>
        );

      case 'checklist':
        return (
          <>
            <div className="flex items-center gap-4 mb-4 pb-2 border-b-2" style={{ borderColor: config.primaryColor }}>
              <img src={logoObraphoto} alt="Logo" className="h-10 object-contain" />
              <div className="flex-1">
                <h1 className="text-base font-bold" style={{ color: config.primaryColor }}>
                  {reportData.tituloInspecao}
                </h1>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>Em: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Empresa info */}
            <div className="mb-3 p-2 rounded border" style={{ borderColor: config.primaryColor, backgroundColor: config.headerBg }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: config.primaryColor }}>Empresa responsável</h3>
              <div className="text-xs"><span className="font-semibold">Nome:</span> {empresa}</div>
            </div>

            {/* Checklist resultado */}
            <div className="mb-3 p-2 rounded border" style={{ borderColor: config.primaryColor }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: config.primaryColor }}>
                Checklist da Inspeção (Pontuação: {reportData.pontuacao})
              </h3>
              <div className="text-xs grid grid-cols-2 gap-2">
                <div className="flex justify-between border-b border-gray-200 py-1">
                  <span>Todos os itens verificados?</span>
                  <span className="font-semibold text-green-600">Conforme</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 py-1">
                  <span>Documentação completa?</span>
                  <span className="font-semibold text-green-600">Conforme</span>
                </div>
              </div>
            </div>

            {/* Diagnóstico */}
            {reportData.diagnostico && (
              <div className="mb-3 p-2 rounded border" style={{ borderColor: config.primaryColor }}>
                <h3 className="text-xs font-bold mb-1" style={{ color: config.primaryColor }}>Diagnóstico</h3>
                <p className="text-xs">{reportData.diagnostico}</p>
              </div>
            )}

            {/* Registro Fotográfico header */}
            <div className="p-2 mb-3 text-center" style={{ backgroundColor: config.headerBg }}>
              <h2 className="text-sm font-bold" style={{ color: config.primaryColor }}>Registro Fotográfico</h2>
            </div>
          </>
        );

      case 'simples':
        return (
          <>
            <div className="text-center mb-4 pb-2 border-b-2 border-gray-300">
              <h1 className="text-lg font-bold text-gray-800">Relatório Fotográfico</h1>
              <p className="text-xs text-gray-500">{empresa} • {new Date().toLocaleDateString('pt-BR')}</p>
              <p className="text-xs text-gray-400">Página {pageIndex + 1} de {totalPages}</p>
            </div>
          </>
        );
    }
  };

  // Render template-specific footer
  const renderFooter = (pageIndex: number) => {
    switch (template) {
      case 'servico':
        return (
          <div className="mt-4 pt-2 border-t text-xs" style={{ borderColor: config.primaryColor }}>
            {reportData.observacoes && (
              <div className="mb-2">
                <span className="font-bold" style={{ color: config.primaryColor }}>Observações Gerais:</span>
                <p className="text-gray-700">{reportData.observacoes}</p>
              </div>
            )}
            <div className="flex justify-between items-end">
              <div>
                <p className="font-semibold">Nome do Responsável:</p>
                <p>{reportData.responsavel || '-'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Assinatura do Responsável:</p>
                <div className="border-b border-black w-32 h-8"></div>
              </div>
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="mt-4 pt-2 border-t" style={{ borderColor: config.primaryColor }}>
            <div className="text-xs">
              <p className="font-bold" style={{ color: config.primaryColor }}>Assinatura</p>
              <p className="text-gray-600 mb-2">Assinatura do responsável pela inspeção</p>
              <div className="border-b border-black w-48 h-8"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="page-footer">
            Página {pageIndex + 1}
          </div>
        );
    }
  };

  // Template-specific form fields
  const renderFormFields = () => {
    switch (template) {
      case 'obra':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <Label htmlFor="etapa" className="text-xs">Etapa</Label>
              <Input
                id="etapa"
                value={reportData.etapa}
                onChange={(e) => setReportData(prev => ({ ...prev, etapa: e.target.value }))}
                placeholder="Ex: GALERIAS DE ÁGUAS PLUVIAIS - RUA 16"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="municipio" className="text-xs">Município</Label>
              <Input
                id="municipio"
                value={reportData.municipio}
                onChange={(e) => setReportData(prev => ({ ...prev, municipio: e.target.value }))}
                placeholder="Ex: Orlândia/SP"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="data" className="text-xs">Data</Label>
              <Input
                id="data"
                value={reportData.data}
                onChange={(e) => setReportData(prev => ({ ...prev, data: e.target.value }))}
                placeholder="nov/21"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="percentualFisico" className="text-xs">% Físico Concluído</Label>
              <Input
                id="percentualFisico"
                value={reportData.percentualFisico}
                onChange={(e) => setReportData(prev => ({ ...prev, percentualFisico: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="evolucaoSemanal" className="text-xs">Evolução Semanal</Label>
              <Input
                id="evolucaoSemanal"
                value={reportData.evolucaoSemanal}
                onChange={(e) => setReportData(prev => ({ ...prev, evolucaoSemanal: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
        );

      case 'servico':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cliente" className="text-xs">Cliente</Label>
              <Input
                id="cliente"
                value={reportData.cliente}
                onChange={(e) => setReportData(prev => ({ ...prev, cliente: e.target.value }))}
                placeholder="Nome do cliente"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="clienteRazaoSocial" className="text-xs">Razão Social</Label>
              <Input
                id="clienteRazaoSocial"
                value={reportData.clienteRazaoSocial}
                onChange={(e) => setReportData(prev => ({ ...prev, clienteRazaoSocial: e.target.value }))}
                placeholder="Razão social"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="responsavel" className="text-xs">Responsável</Label>
              <Input
                id="responsavel"
                value={reportData.responsavel}
                onChange={(e) => setReportData(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="objetivo" className="text-xs">Objetivo</Label>
              <Input
                id="objetivo"
                value={reportData.objetivo}
                onChange={(e) => setReportData(prev => ({ ...prev, objetivo: e.target.value }))}
                placeholder="Objetivo do serviço"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="localizacaoGps" className="text-xs">Localização GPS</Label>
              <Input
                id="localizacaoGps"
                value={reportData.localizacaoGps}
                onChange={(e) => setReportData(prev => ({ ...prev, localizacaoGps: e.target.value }))}
                placeholder="-23.5505, -46.6333"
                className="text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="servicoRealizado" className="text-xs">Serviço Realizado</Label>
              <Input
                id="servicoRealizado"
                value={reportData.servicoRealizado}
                onChange={(e) => setReportData(prev => ({ ...prev, servicoRealizado: e.target.value }))}
                placeholder="Descrição do serviço realizado"
                className="text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="observacoes" className="text-xs">Observações</Label>
              <Textarea
                id="observacoes"
                value={reportData.observacoes}
                onChange={(e) => setReportData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações gerais..."
                className="text-sm h-16"
              />
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="tituloInspecao" className="text-xs">Título da Inspeção</Label>
              <Input
                id="tituloInspecao"
                value={reportData.tituloInspecao}
                onChange={(e) => setReportData(prev => ({ ...prev, tituloInspecao: e.target.value }))}
                placeholder="Checklist de Inspeção Visual"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="pontuacao" className="text-xs">Pontuação</Label>
              <Input
                id="pontuacao"
                value={reportData.pontuacao}
                onChange={(e) => setReportData(prev => ({ ...prev, pontuacao: e.target.value }))}
                placeholder="100%"
                className="text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="diagnostico" className="text-xs">Diagnóstico</Label>
              <Textarea
                id="diagnostico"
                value={reportData.diagnostico}
                onChange={(e) => setReportData(prev => ({ ...prev, diagnostico: e.target.value }))}
                placeholder="Descrição dos problemas encontrados..."
                className="text-sm h-16"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="solucoesAplicadas" className="text-xs">Soluções Aplicadas</Label>
              <Textarea
                id="solucoesAplicadas"
                value={reportData.solucoesAplicadas}
                onChange={(e) => setReportData(prev => ({ ...prev, solucoesAplicadas: e.target.value }))}
                placeholder="Descrição das soluções aplicadas..."
                className="text-sm h-16"
              />
            </div>
          </div>
        );

      case 'simples':
        return (
          <div className="text-sm text-muted-foreground">
            Layout simples - apenas fotos com legendas.
          </div>
        );
    }
  };

  return (
    <div className="print-container fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header - Hide on print */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Fotográfico</h1>
            <p className="text-sm text-muted-foreground">{allResults.length} fotos • {totalPages} página(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Template Selector + Edit Form - Hide on print */}
      <div className="print:hidden p-4 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          {/* Template selector */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold text-muted-foreground">Modelo do Relatório</Label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(TEMPLATE_CONFIG) as ReportTemplate[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setTemplate(key)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    template === key 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">{TEMPLATE_CONFIG[key].name}</div>
                  <div className="text-xs text-muted-foreground">{TEMPLATE_CONFIG[key].description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template-specific fields */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Dados do Relatório</h3>
            {renderFormFields()}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1">
        <div ref={reportRef} className={`print-report p-6 max-w-5xl mx-auto bg-white text-black template-${template}`}>
          
          {pages.map((pagePhotos, pageIndex) => (
            <div key={pageIndex} className="report-page">
              {renderHeader(pageIndex)}

              <div className="photo-grid" style={{ 
                gridTemplateColumns: template === 'simples' ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)'
              }}>
                {pagePhotos.map((result, idx) => {
                  const globalIndex = pageIndex * config.photosPerPage + idx;
                  return renderPhotoItem(result, globalIndex);
                })}
              </div>

              {pageIndex === pages.length - 1 && renderFooter(pageIndex)}

              {pageIndex < pages.length - 1 && <div className="page-break"></div>}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Print Styles */}
      <style>{`
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .photo-cell {
          display: flex;
          flex-direction: column;
        }
        
        .photo-wrapper {
          position: relative;
          aspect-ratio: 4/3;
          border: 1px solid #000;
          overflow: hidden;
          background: #f5f5f5;
        }
        
        .photo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .photo-metadata-overlay {
          position: absolute;
          bottom: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          font-size: 8px;
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 1px;
          max-width: 60%;
        }
        
        .photo-metadata-overlay span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .photo-caption {
          border: 1px solid #000;
          border-top: none;
          padding: 6px 8px;
          font-size: 10px;
          background: white;
          min-height: 36px;
        }
        
        .page-footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #ccc;
        }
        
        .page-break {
          page-break-after: always;
          margin-bottom: 24px;
        }
        
        .report-page {
          margin-bottom: 24px;
        }

        /* Template-specific colors for servico */
        .template-servico .photo-caption {
          border-color: #D97706;
        }
        
        /* Template-specific colors for checklist */
        .template-checklist .photo-caption {
          border-color: #059669;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 10mm 10mm 15mm 10mm;
          }
          
          body > *:not(#root),
          .print\\:hidden,
          nav, header, footer, aside,
          button, .button,
          [data-radix-scroll-area-scrollbar] {
            display: none !important;
            visibility: hidden !important;
          }
          
          html, body, #root {
            background: white !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .fixed, .absolute, .relative, .sticky {
            position: static !important;
          }
          
          #root, .print-container, .print-report {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          
          [data-radix-scroll-area-viewport],
          [data-radix-scroll-area-root] {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
          }
          
          .report-page {
            page-break-after: always;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .report-page:last-child {
            page-break-after: avoid;
          }
          
          .page-break {
            display: none !important;
          }
          
          .report-page h1 {
            font-size: 14px !important;
            margin-bottom: 12px !important;
            color: black !important;
          }
          
          .report-page table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 12px !important;
          }
          
          .report-page td {
            border: 1px solid black !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: black !important;
            background: white !important;
          }
          
          .report-page td.font-bold {
            font-weight: bold !important;
          }
          
          .report-page h2 {
            font-size: 11px !important;
            margin-bottom: 8px !important;
            color: black !important;
          }
          
          .photo-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          
          .photo-cell {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .photo-wrapper {
            height: 140px !important;
            aspect-ratio: auto !important;
            border: 1px solid black !important;
          }
          
          .template-servico .photo-wrapper,
          .template-checklist .photo-wrapper {
            height: 160px !important;
          }
          
          .photo-image {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          
          .photo-metadata-overlay {
            font-size: 6px !important;
            padding: 2px 4px !important;
            background: rgba(0, 0, 0, 0.75) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .photo-caption {
            border: 1px solid black !important;
            border-top: none !important;
            padding: 4px 6px !important;
            font-size: 8px !important;
            min-height: 28px !important;
            color: black !important;
            background: white !important;
          }
          
          .page-footer {
            font-size: 9px !important;
            color: #666 !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
          }

          /* Print color sections */
          .template-servico [style*="background-color: rgb(254, 243, 199)"],
          .template-servico [style*="backgroundColor"] {
            background-color: #FEF3C7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .template-checklist [style*="background-color: rgb(209, 250, 229)"],
          .template-checklist [style*="backgroundColor"] {
            background-color: #D1FAE5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DetailedReport;