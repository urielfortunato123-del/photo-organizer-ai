import React, { useRef, useState } from 'react';
import { ProcessingResult } from '@/services/api';
import { 
  FileText, Printer, XCircle, Camera
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
                  {/* Caption */}
                  <div className="border border-t-0 border-gray-300 p-2 bg-white">
                    <p className="text-xs text-gray-800">
                      <span className="font-semibold">Foto {String(idx + 1).padStart(2, '0')}:</span>{' '}
                      {caption.toUpperCase()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>Relatório gerado por ObraPhoto AI - {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </ScrollArea>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          /* Ensure root prints correctly */
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Hide everything except our report (inside #root) */
          #root > *:not(.print-container) {
            display: none !important;
          }

          /* Make sure the report container itself is shown */
          .print-container {
            display: block !important;
          }

          /* Reset container positioning */
          .print-container,
          .print-container * {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            background: white !important;
          }
          
          /* Make sure report content is visible */
          .print-report {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          
          .print-report * {
            visibility: visible !important;
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide non-print elements */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Photo grid for print */
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          
          .photo-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Fix ScrollArea for printing */
          [data-radix-scroll-area-viewport],
          [data-radix-scroll-area-root],
          [data-radix-scroll-area-scrollbar] {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
          }
          
          /* Fix fixed positioning */
          .fixed {
            position: static !important;
            overflow: visible !important;
          }
          
          /* Image sizing for print - maintain aspect ratio */
          .photo-item img {
            width: 100% !important;
            height: auto !important;
            max-height: 160px !important;
            object-fit: cover !important;
          }
          
          .aspect-\\[4\\/3\\] {
            aspect-ratio: 4/3 !important;
            height: auto !important;
            max-height: 160px !important;
          }
          
          /* Table styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          td {
            border: 1px solid #ccc !important;
            padding: 4px 8px !important;
            font-size: 10px !important;
          }
          
          /* Font sizes for print */
          .text-xs { font-size: 9px !important; }
          .text-sm { font-size: 10px !important; }
          
          /* Header logo */
          .print-report img:first-of-type {
            height: 50px !important;
            object-fit: contain !important;
          }
          
          /* Section spacing */
          .mb-4 { margin-bottom: 8px !important; }
          .mb-8 { margin-bottom: 12px !important; }
          .p-2 { padding: 4px !important; }
          .p-3 { padding: 6px !important; }
          .gap-4 { gap: 8px !important; }
        }
      `}</style>
    </div>
  );
};

export default DetailedReport;