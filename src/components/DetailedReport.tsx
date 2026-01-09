import React, { useRef, useState } from 'react';
import { ProcessingResult } from '@/services/api';
import { 
  FileText, Printer, XCircle, Camera, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoObraphoto from '@/assets/logo-obraphoto.png';

interface DetailedReportProps {
  results: ProcessingResult[];
  fileUrls: Map<string, string>;
  empresa?: string;
  onClose: () => void;
}

const DetailedReport: React.FC<DetailedReportProps> = ({
  results,
  fileUrls,
  empresa = 'EMPRESA',
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Report metadata
  const [reportData, setReportData] = useState({
    titulo: 'RELATÓRIO DE ACOMPANHAMENTO DE OBRA',
    subtitulo: '',
    de: '',
    para: '',
    numeroRelatorio: '001/' + new Date().getFullYear(),
    data: new Date().toLocaleDateString('pt-BR'),
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'Relatório Fotográfico';
    window.print();
    document.title = originalTitle;
  };

  // Use all results regardless of status
  const allResults = results;

  return (
    <div className="print-container fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header - Hide on print */}
      <div className="print:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Fotográfico</h1>
            <p className="text-sm text-muted-foreground">{allResults.length} fotos</p>
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

      {/* Edit Form - Hide on print */}
      <div className="print:hidden p-4 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Dados do Relatório</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="titulo" className="text-xs">Título do Relatório</Label>
              <Input
                id="titulo"
                value={reportData.titulo}
                onChange={(e) => setReportData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="RELATÓRIO DE ACOMPANHAMENTO DE OBRA"
                className="text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Label htmlFor="subtitulo" className="text-xs">Subtítulo / Local</Label>
              <Input
                id="subtitulo"
                value={reportData.subtitulo}
                onChange={(e) => setReportData(prev => ({ ...prev, subtitulo: e.target.value }))}
                placeholder="Ex: CENTRO DE INICIAÇÃO AO ESPORTE (SALVADOR-BA)"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="de" className="text-xs">De:</Label>
              <Input
                id="de"
                value={reportData.de}
                onChange={(e) => setReportData(prev => ({ ...prev, de: e.target.value }))}
                placeholder="Engº Nome"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="para" className="text-xs">Para:</Label>
              <Input
                id="para"
                value={reportData.para}
                onChange={(e) => setReportData(prev => ({ ...prev, para: e.target.value }))}
                placeholder="Engº Nome"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="numero" className="text-xs">Nº Relatório</Label>
                <Input
                  id="numero"
                  value={reportData.numeroRelatorio}
                  onChange={(e) => setReportData(prev => ({ ...prev, numeroRelatorio: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="data" className="text-xs">Data</Label>
                <Input
                  id="data"
                  value={reportData.data}
                  onChange={(e) => setReportData(prev => ({ ...prev, data: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1">
        <div ref={reportRef} className="print-report p-6 max-w-5xl mx-auto bg-white text-black">
          
          {/* Logo Header */}
          <div className="flex justify-center mb-4 pb-4 border-b-2 border-red-600">
            <img 
              src={logoObraphoto} 
              alt="Logo" 
              className="h-16 object-contain"
            />
          </div>

          {/* Report Title */}
          <div className="text-center mb-4 p-3 bg-gray-100 border border-gray-300">
            <h1 className="text-sm font-bold text-gray-800 uppercase">
              {reportData.titulo}
              {reportData.subtitulo && (
                <span className="block mt-1">{reportData.subtitulo}</span>
              )}
            </h1>
          </div>

          {/* Metadata Table */}
          <table className="w-full mb-4 border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-50 font-semibold w-20">De:</td>
                <td className="border border-gray-300 p-2">{reportData.de || empresa}</td>
                <td className="border border-gray-300 p-2 bg-gray-50 font-semibold w-20">Para:</td>
                <td className="border border-gray-300 p-2">{reportData.para || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-50 font-semibold">Nº Relatório:</td>
                <td className="border border-gray-300 p-2">{reportData.numeroRelatorio}</td>
                <td className="border border-gray-300 p-2 bg-gray-50 font-semibold">Data:</td>
                <td className="border border-gray-300 p-2">{reportData.data}</td>
              </tr>
            </tbody>
          </table>

          {/* Photo Report Section Header */}
          <div className="text-center mb-4 p-2 bg-gray-200 border border-gray-300">
            <h2 className="text-sm font-bold text-gray-800 uppercase">RELATÓRIO FOTOGRÁFICO</h2>
          </div>

          {/* Photo Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-4">
            {allResults.map((result, idx) => {
              const imageUrl = fileUrls.get(result.filename);
              const caption = result.service 
                ? `${result.service}${result.portico ? ` - ${result.portico}` : ''}`
                : result.tecnico?.substring(0, 50) || result.disciplina || 'REGISTRO';
              
              return (
                <div key={`${result.filename}-${idx}`} className="photo-item">
                  {/* Photo */}
                  <div className="border border-gray-300 aspect-[4/3] bg-gray-100 overflow-hidden">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {/* Caption with location link */}
                  <div className="border border-t-0 border-gray-300 p-2 bg-white">
                    <p className="text-xs text-gray-800">
                      <span className="font-semibold">Foto {String(idx + 1).padStart(2, '0')}:</span>{' '}
                      {caption.toUpperCase()}
                    </p>
                  </div>
                  
                  {/* AI Analysis Speech Bubble */}
                  {result.tecnico && (
                    <div className="ai-bubble mt-2 relative">
                      <div className="ai-bubble-arrow"></div>
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-2">
                        <p className="text-[10px] text-gray-600 flex items-center gap-1 mb-1">
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span className="font-semibold text-blue-600">Análise da IA</span>
                        </p>
                        <p className="text-[9px] text-gray-700 leading-relaxed italic">
                          "{result.tecnico}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer - simplified for print */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>ObraPhoto AI - {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </ScrollArea>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
            
            @bottom-center {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 9px;
              color: #666;
            }
          }
          
          /* Remove browser header/footer (URL, date, page numbers) */
          @page :first {
            margin-top: 15mm;
          }
          
          /* Hide URL in header - some browsers respect this */
          html {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide all UI elements */
          body > *:not(#root),
          .print\\:hidden,
          nav, header, footer, aside,
          button, .button,
          [data-radix-scroll-area-scrollbar] {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Force white background everywhere */
          html, body, #root, * {
            background: white !important;
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Reset all positioning */
          .fixed, .absolute, .relative, .sticky {
            position: static !important;
          }
          
          /* Make everything visible and properly sized */
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
          
          /* Report content styling */
          .print-report {
            background: white !important;
            color: black !important;
          }
          
          /* ScrollArea fix */
          [data-radix-scroll-area-viewport],
          [data-radix-scroll-area-root] {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
          }
          
          /* Grid layout for photos */
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          
          /* Photo items */
          .photo-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .photo-item img {
            width: 100% !important;
            height: auto !important;
            min-height: 200px !important;
            max-height: 280px !important;
            object-fit: cover !important;
          }
          
          .aspect-\\[4\\/3\\] {
            aspect-ratio: 4/3 !important;
            height: auto !important;
            min-height: 200px !important;
            max-height: 280px !important;
          }
          
          /* Tables */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          td, th {
            border: 1px solid #333 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
            color: black !important;
            background: white !important;
          }
          
          .bg-gray-50, .bg-gray-100, .bg-gray-200 {
            background: #f5f5f5 !important;
          }
          
          /* Logo */
          .print-report img:first-of-type {
            height: 60px !important;
            object-fit: contain !important;
          }
          
          /* Typography for print */
          .text-xs { font-size: 10px !important; }
          .text-sm { font-size: 11px !important; }
          .font-bold { font-weight: bold !important; }
          .font-semibold { font-weight: 600 !important; }
          
          /* Borders and colors */
          .border, .border-gray-300 {
            border-color: #333 !important;
          }
          
          .border-red-600 {
            border-color: #dc2626 !important;
          }
          
          /* Spacing adjustments */
          .mb-4 { margin-bottom: 10px !important; }
          .mb-8 { margin-bottom: 16px !important; }
          .mt-8 { margin-top: 16px !important; }
          .p-2 { padding: 6px !important; }
          .p-3 { padding: 8px !important; }
          .gap-4 { gap: 12px !important; }
          
          /* Footer text */
          .text-gray-500 {
            color: #666 !important;
          }
          
          /* Ensure page breaks work */
          .print-report > * {
            break-inside: avoid;
          }
          
          /* Location links - keep visible and clickable in PDF */
          .print-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            font-size: 9px !important;
          }
          
          .print-link svg {
            width: 10px !important;
            height: 10px !important;
            color: #2563eb !important;
          }
          
          /* Show URL after link for PDF (optional - helps when printed on paper) */
          .print-link::after {
            content: none;
          }
          
          /* AI Analysis Speech Bubble */
          .ai-bubble {
            position: relative;
            margin-top: 6px !important;
          }
          
          .ai-bubble-arrow {
            position: absolute;
            top: -6px;
            left: 16px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid #d1d5db;
          }
          
          .ai-bubble-arrow::after {
            content: '';
            position: absolute;
            top: 1px;
            left: -5px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 5px solid #f3f4f6;
          }
          
          .ai-bubble .bg-gray-100 {
            background: #f3f4f6 !important;
          }
          
          .ai-bubble .text-blue-500 {
            color: #3b82f6 !important;
          }
          
          .ai-bubble .text-blue-600 {
            color: #2563eb !important;
          }
          
          .ai-bubble .text-gray-600 {
            color: #4b5563 !important;
          }
          
          .ai-bubble .text-gray-700 {
            color: #374151 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DetailedReport;