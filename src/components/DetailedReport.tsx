import React, { useRef, useState } from 'react';
import { ProcessingResult } from '@/services/api';
import { 
  FileText, Printer, XCircle, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const DetailedReport: React.FC<DetailedReportProps> = ({
  results,
  fileUrls,
  empresa = 'EMPRESA',
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Report metadata matching the template
  const [reportData, setReportData] = useState({
    etapa: '',
    municipio: '',
    data: new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
    percentualFisico: '0,00%',
    evolucaoSemanal: '0,00%',
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'Relatório Fotográfico';
    window.print();
    document.title = originalTitle;
  };

  // Use all results regardless of status
  const allResults = results;
  
  // Group photos into pages of 6 (3 rows x 2 columns)
  const photosPerPage = 6;
  const pages = chunkArray(allResults, photosPerPage);
  const totalPages = pages.length;

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

      {/* Edit Form - Hide on print */}
      <div className="print:hidden p-4 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Dados do Relatório</h3>
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
        </div>
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1">
        <div ref={reportRef} className="print-report p-6 max-w-5xl mx-auto bg-white text-black">
          
          {/* Each page */}
          {pages.map((pagePhotos, pageIndex) => (
            <div key={pageIndex} className="report-page">
              {/* Page Title */}
              <div className="text-center mb-4">
                <h1 className="text-base font-bold text-black uppercase underline">
                  RELATÓRIO DE FOTOGRÁFICO
                </h1>
              </div>

              {/* Header Table */}
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

              {/* FOTOS Section Header */}
              <div className="text-center mb-3">
                <h2 className="text-sm font-bold text-black uppercase">FOTOS</h2>
              </div>

              {/* Photo Grid - 3 rows x 2 columns per page */}
              <div className="photo-grid">
                {pagePhotos.map((result, idx) => {
                  const globalIndex = pageIndex * photosPerPage + idx;
                  const imageUrl = fileUrls.get(result.filename);
                  const caption = result.service 
                    ? `${result.service}${result.portico ? ` - ${result.portico}` : ''}`
                    : result.tecnico?.substring(0, 80) || result.disciplina || 'REGISTRO FOTOGRÁFICO';
                  
                  // Format GPS metadata for overlay
                  const photoDate = result.exif_date || result.data_detectada || '';
                  const hasGps = result.gps_lat && result.gps_lon;
                  
                  return (
                    <div key={`${result.filename}-${idx}`} className="photo-cell">
                      {/* Photo with metadata overlay */}
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
                        
                        {/* Metadata overlay (bottom right) */}
                        {(photoDate || hasGps) && (
                          <div className="photo-metadata-overlay">
                            {photoDate && <span>{photoDate}</span>}
                            {hasGps && <span>{result.gps_lat?.toFixed(5)}, {result.gps_lon?.toFixed(5)}</span>}
                          </div>
                        )}
                      </div>
                      
                      {/* Caption */}
                      <div className="photo-caption">
                        <span className="font-bold">FOTO {globalIndex + 1}</span> - {caption.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Page number footer */}
              <div className="page-footer">
                Página {pageIndex + 1}
              </div>

              {/* Page break after each page except last */}
              {pageIndex < pages.length - 1 && <div className="page-break"></div>}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Print Styles */}
      <style>{`
        /* Screen styles */
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
        
        @media print {
          @page {
            size: A4;
            margin: 10mm 10mm 15mm 10mm;
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
          html, body, #root {
            background: white !important;
            background-color: white !important;
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
          
          /* ScrollArea fix */
          [data-radix-scroll-area-viewport],
          [data-radix-scroll-area-root] {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
          }
          
          /* Report page styling */
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
          
          /* Title */
          .report-page h1 {
            font-size: 14px !important;
            margin-bottom: 12px !important;
            color: black !important;
          }
          
          /* Header table */
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
          
          /* FOTOS header */
          .report-page h2 {
            font-size: 11px !important;
            margin-bottom: 8px !important;
            color: black !important;
          }
          
          /* Photo grid */
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
        }
      `}</style>
    </div>
  );
};

export default DetailedReport;