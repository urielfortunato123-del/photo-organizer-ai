import { ProcessingResult } from '@/services/api';

// Mapeamento de frentes para categorias
function getCategoryFromPortico(portico: string): string {
  if (!portico) return 'OUTROS';
  const upper = portico.toUpperCase();
  
  if (upper.includes('PONTE') || upper.includes('VIADUTO') || upper.includes('PASSARELA') || 
      upper.includes('TUNEL') || upper.includes('GALERIA') || upper.includes('OAE') ||
      upper.includes('BUEIRO')) return 'OAE';
  
  if (upper.includes('CORTINA') || upper.includes('MURO') || upper.includes('GABIAO') ||
      upper.includes('TALUDE') || upper.includes('TIRANTE') || upper.includes('SOLO_GRAMPEADO') ||
      upper.includes('TERRA_ARMADA')) return 'CONTENCAO';
  
  if (upper.includes('BSO') || upper.includes('PORTICO') || upper.includes('FREE_FLOW') ||
      upper.includes('PRACA') || upper.includes('PMV') || upper.includes('CCO') ||
      upper.includes('SAU') || upper.includes('RETORNO') || upper.includes('ROTATORIA') ||
      upper.includes('TREVO') || upper.includes('ACESSO')) return 'RODOVIARIA';
  
  if (upper.includes('PAVIMENT') || upper.includes('RECAPE') || upper.includes('FRESAG') ||
      upper.includes('CBUQ') || upper.includes('MICRO') || upper.includes('TAPA_BURACO')) return 'PAVIMENTACAO';
  
  if (upper.includes('TERRAPL') || upper.includes('ATERRO') || upper.includes('CORTE') ||
      upper.includes('BOTA_FORA') || upper.includes('JAZIDA')) return 'TERRAPLENAGEM';
  
  if (upper.includes('DRENAG') || upper.includes('SARJETA') || upper.includes('VALETA') ||
      upper.includes('DESCIDA') || upper.includes('CAIXA_COLETA') || upper.includes('POCO_VISITA') ||
      upper.includes('DRENO') || upper.includes('DISSIPADOR')) return 'DRENAGEM';
  
  if (upper.includes('SINALIZ') || upper.includes('DEFENSA') || upper.includes('BARREIRA') ||
      upper.includes('TACHA') || upper.includes('SEMAFORO')) return 'SINALIZACAO';
  
  if (upper.includes('REDE_AGUA') || upper.includes('REDE_ESGOTO') || upper.includes('ETE') ||
      upper.includes('ETA') || upper.includes('RESERVATORIO') || upper.includes('ELEVATORIA') ||
      upper.includes('ADUTORA')) return 'SANEAMENTO';
  
  if (upper.includes('ELETRIC') || upper.includes('SUBESTACAO') || upper.includes('ILUMINAC') ||
      upper.includes('POSTE') || upper.includes('TELECOM') || upper.includes('FIBRA')) return 'ELETRICA';
  
  if (upper.includes('FUNDAC') || upper.includes('ESTRUTURA') || upper.includes('ALVENARIA') ||
      upper.includes('COBERTURA') || upper.includes('REVESTIM') || upper.includes('INSTALAC') ||
      upper.includes('ESTACA') || upper.includes('SAPATA')) return 'EDIFICACAO';
  
  return 'OUTROS';
}

const CATEGORY_NAMES: Record<string, string> = {
  OAE: 'Obras de Arte Especiais',
  CONTENCAO: 'Obras de Contenção',
  RODOVIARIA: 'Infraestrutura Rodoviária',
  PAVIMENTACAO: 'Pavimentação',
  TERRAPLENAGEM: 'Terraplenagem',
  DRENAGEM: 'Drenagem',
  SINALIZACAO: 'Sinalização',
  SANEAMENTO: 'Saneamento',
  ELETRICA: 'Elétrica e Telecom',
  EDIFICACAO: 'Edificações',
  OUTROS: 'Outros',
};

export function exportToCSV(results: ProcessingResult[], filename: string = 'resultados_obraphoto.csv'): void {
  const headers = [
    'Arquivo',
    'Status',
    'Categoria',
    'Frente de Serviço',
    'Disciplina',
    'Serviço',
    'Data',
    'Rodovia',
    'KM',
    'Latitude',
    'Longitude',
    'Método',
    'Confiança (%)',
    'Caminho Destino',
    'Análise Técnica'
  ];

  const rows = results.map(r => {
    const category = getCategoryFromPortico(r.portico || '');
    return [
      r.filename || '',
      r.status || '',
      CATEGORY_NAMES[category] || category,
      r.portico || '',
      r.disciplina || '',
      r.service || '',
      r.data_detectada || '',
      r.rodovia || '',
      r.km_inicio || '',
      r.gps_lat?.toString() || '',
      r.gps_lon?.toString() || '',
      r.method === 'heuristica' ? 'Manual' : r.method === 'ia_forcada' ? 'IA' : r.method || '',
      r.confidence ? Math.round(r.confidence * 100).toString() : '0',
      r.dest || '',
      (r.tecnico || '').replace(/"/g, '""')
    ];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
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
  const escapeXml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Agrupa por categoria
  const groupedResults: Record<string, ProcessingResult[]> = {};
  results.forEach(r => {
    const category = getCategoryFromPortico(r.portico || '');
    if (!groupedResults[category]) {
      groupedResults[category] = [];
    }
    groupedResults[category].push(r);
  });

  const headers = [
    'Arquivo',
    'Status',
    'Frente de Serviço',
    'Disciplina',
    'Serviço',
    'Data',
    'Rodovia',
    'KM',
    'Latitude',
    'Longitude',
    'Método',
    'Confiança (%)',
    'Caminho Destino',
    'Análise Técnica'
  ];

  const headerRow = headers.map(h => 
    `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join('');

  // Gera uma aba por categoria
  const worksheets = Object.entries(groupedResults)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, categoryResults]) => {
      const categoryName = CATEGORY_NAMES[category] || category;
      
      const dataRows = categoryResults.map(r => {
        const cells = [
          r.filename || '',
          r.status || '',
          r.portico || '',
          r.disciplina || '',
          r.service || '',
          r.data_detectada || '',
          r.rodovia || '',
          r.km_inicio || '',
          r.gps_lat?.toString() || '',
          r.gps_lon?.toString() || '',
          r.method === 'heuristica' ? 'Manual' : r.method === 'ia_forcada' ? 'IA' : r.method || '',
          r.confidence ? Math.round(r.confidence * 100).toString() : '0',
          r.dest || '',
          r.tecnico || ''
        ];
        
        return `<Row>${cells.map(cell => 
          `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
        ).join('')}</Row>`;
      }).join('\n');

      return `<Worksheet ss:Name="${escapeXml(categoryName.substring(0, 31))}">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>`;
    }).join('\n');

  // Aba de resumo
  const summaryRows = Object.entries(groupedResults)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, categoryResults]) => {
      const categoryName = CATEGORY_NAMES[category] || category;
      return `<Row>
        <Cell><Data ss:Type="String">${escapeXml(categoryName)}</Data></Cell>
        <Cell><Data ss:Type="Number">${categoryResults.length}</Data></Cell>
        <Cell><Data ss:Type="Number">${(categoryResults.length / results.length * 100).toFixed(1)}</Data></Cell>
      </Row>`;
    }).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#4A90A4" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CategoryHeader">
      <Font ss:Bold="1" ss:Size="14"/>
      <Interior ss:Color="#E8F4F8" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Resumo">
    <Table>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Categoria</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Quantidade</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Percentual (%)</Data></Cell>
      </Row>
      ${summaryRows}
      <Row>
        <Cell ss:StyleID="CategoryHeader"><Data ss:Type="String">TOTAL</Data></Cell>
        <Cell ss:StyleID="CategoryHeader"><Data ss:Type="Number">${results.length}</Data></Cell>
        <Cell ss:StyleID="CategoryHeader"><Data ss:Type="Number">100</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
  ${worksheets}
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

  // Group by category
  const byCategory: Record<string, number> = {};
  results.forEach(r => {
    const category = getCategoryFromPortico(r.portico || '');
    const categoryName = CATEGORY_NAMES[category] || category;
    byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;
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

  // GPS stats
  const withGps = results.filter(r => r.gps_lat && r.gps_lon).length;

  let report = `RELATÓRIO DE PROCESSAMENTO - ObraPhoto AI
==========================================
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}

RESUMO GERAL
------------
Total de fotos: ${total}
Processadas com sucesso: ${success} (${(success/total*100).toFixed(1)}%)
Erros: ${errors} (${(errors/total*100).toFixed(1)}%)
Confiança média: ${avgConfidence}%
Fotos com GPS: ${withGps} (${(withGps/total*100).toFixed(1)}%)

FOTOS POR CATEGORIA
-------------------
`;

  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      report += `${cat}: ${count} foto(s) (${(count/total*100).toFixed(1)}%)\n`;
    });

  report += `
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
