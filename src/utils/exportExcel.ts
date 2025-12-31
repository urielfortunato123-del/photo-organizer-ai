import { ProcessingResult } from '@/services/api';

export function exportToCSV(results: ProcessingResult[], filename: string = 'resultados_obraphoto.csv'): void {
  // Headers
  const headers = [
    'Arquivo',
    'Status',
    'Frente de Serviço',
    'Disciplina',
    'Serviço',
    'Data',
    'Método',
    'Confiança (%)',
    'Caminho Destino',
    'Análise Técnica'
  ];

  // Convert results to CSV rows
  const rows = results.map(r => [
    r.filename || '',
    r.status || '',
    r.portico || '',
    r.disciplina || '',
    r.service || '',
    r.data_detectada || '',
    r.method === 'heuristica' ? 'Manual' : r.method === 'ia_forcada' ? 'IA' : r.method || '',
    r.confidence ? Math.round(r.confidence * 100).toString() : '0',
    r.dest || '',
    (r.tecnico || '').replace(/"/g, '""') // Escape quotes
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcelXML(results: ProcessingResult[], filename: string = 'resultados_obraphoto.xls'): void {
  // Excel XML format for better compatibility
  const headers = [
    'Arquivo',
    'Status',
    'Frente de Serviço',
    'Disciplina',
    'Serviço',
    'Data',
    'Método',
    'Confiança (%)',
    'Caminho Destino',
    'Análise Técnica'
  ];

  const escapeXml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const headerRow = headers.map(h => 
    `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join('');

  const dataRows = results.map(r => {
    const cells = [
      r.filename || '',
      r.status || '',
      r.portico || '',
      r.disciplina || '',
      r.service || '',
      r.data_detectada || '',
      r.method === 'heuristica' ? 'Manual' : r.method === 'ia_forcada' ? 'IA' : r.method || '',
      r.confidence ? Math.round(r.confidence * 100).toString() : '0',
      r.dest || '',
      r.tecnico || ''
    ];
    
    return `<Row>${cells.map(cell => 
      `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
    ).join('')}</Row>`;
  }).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#4A90A4" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Resultados">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateSummaryReport(results: ProcessingResult[]): string {
  const total = results.length;
  const success = results.filter(r => r.status === 'Sucesso').length;
  const errors = results.filter(r => r.status.includes('Erro')).length;
  
  // Group by discipline
  const byDiscipline: Record<string, number> = {};
  results.forEach(r => {
    const disc = r.disciplina || 'NAO_IDENTIFICADO';
    byDiscipline[disc] = (byDiscipline[disc] || 0) + 1;
  });

  // Group by portico
  const byPortico: Record<string, number> = {};
  results.forEach(r => {
    const port = r.portico || 'NAO_IDENTIFICADO';
    byPortico[port] = (byPortico[port] || 0) + 1;
  });

  // Average confidence
  const confidences = results.filter(r => r.confidence).map(r => r.confidence!);
  const avgConfidence = confidences.length > 0 
    ? (confidences.reduce((a, b) => a + b, 0) / confidences.length * 100).toFixed(1)
    : '0';

  let report = `RELATÓRIO DE PROCESSAMENTO - ObraPhoto AI
==========================================
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}

RESUMO GERAL
------------
Total de fotos: ${total}
Processadas com sucesso: ${success} (${(success/total*100).toFixed(1)}%)
Erros: ${errors} (${(errors/total*100).toFixed(1)}%)
Confiança média: ${avgConfidence}%

FOTOS POR DISCIPLINA
--------------------
`;

  Object.entries(byDiscipline)
    .sort((a, b) => b[1] - a[1])
    .forEach(([disc, count]) => {
      report += `${disc}: ${count} foto(s)\n`;
    });

  report += `
FOTOS POR FRENTE DE SERVIÇO
---------------------------
`;

  Object.entries(byPortico)
    .sort((a, b) => b[1] - a[1])
    .forEach(([port, count]) => {
      report += `${port}: ${count} foto(s)\n`;
    });

  return report;
}
