import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Construction,
  Layers,
  Route,
  Square,
  Mountain,
  Droplets,
  Signpost,
  Waves,
  Zap,
  Building,
  BarChart3,
  TrendingUp,
  Camera
} from 'lucide-react';
import { ProcessingResult } from '@/services/api';

interface CategoryDashboardProps {
  results: ProcessingResult[];
}

// Mapeamento de ícones por categoria
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  OAE: Construction,
  CONTENCAO: Layers,
  RODOVIARIA: Route,
  PAVIMENTACAO: Square,
  TERRAPLENAGEM: Mountain,
  DRENAGEM: Droplets,
  SINALIZACAO: Signpost,
  SANEAMENTO: Waves,
  ELETRICA: Zap,
  EDIFICACAO: Building,
};

// Cores por categoria
const CATEGORY_COLORS: Record<string, string> = {
  OAE: '#ef4444',
  CONTENCAO: '#f97316',
  RODOVIARIA: '#eab308',
  PAVIMENTACAO: '#84cc16',
  TERRAPLENAGEM: '#22c55e',
  DRENAGEM: '#06b6d4',
  SINALIZACAO: '#3b82f6',
  SANEAMENTO: '#8b5cf6',
  ELETRICA: '#a855f7',
  EDIFICACAO: '#ec4899',
};

// Nomes das categorias
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

// Mapeamento de frentes para categorias
function getCategoryFromPortico(portico: string): string {
  if (!portico) return 'OUTROS';
  const upper = portico.toUpperCase();
  
  // OAE
  if (upper.includes('PONTE') || upper.includes('VIADUTO') || upper.includes('PASSARELA') || 
      upper.includes('TUNEL') || upper.includes('GALERIA') || upper.includes('OAE') ||
      upper.includes('BUEIRO')) return 'OAE';
  
  // Contenção
  if (upper.includes('CORTINA') || upper.includes('MURO') || upper.includes('GABIAO') ||
      upper.includes('TALUDE') || upper.includes('TIRANTE') || upper.includes('SOLO_GRAMPEADO') ||
      upper.includes('TERRA_ARMADA')) return 'CONTENCAO';
  
  // Rodoviária
  if (upper.includes('BSO') || upper.includes('PORTICO') || upper.includes('FREE_FLOW') ||
      upper.includes('PRACA') || upper.includes('PMV') || upper.includes('CCO') ||
      upper.includes('SAU') || upper.includes('RETORNO') || upper.includes('ROTATORIA') ||
      upper.includes('TREVO') || upper.includes('ACESSO')) return 'RODOVIARIA';
  
  // Pavimentação
  if (upper.includes('PAVIMENT') || upper.includes('RECAPE') || upper.includes('FRESAG') ||
      upper.includes('CBUQ') || upper.includes('MICRO') || upper.includes('TAPA_BURACO')) return 'PAVIMENTACAO';
  
  // Terraplenagem
  if (upper.includes('TERRAPL') || upper.includes('ATERRO') || upper.includes('CORTE') ||
      upper.includes('BOTA_FORA') || upper.includes('JAZIDA')) return 'TERRAPLENAGEM';
  
  // Drenagem
  if (upper.includes('DRENAG') || upper.includes('SARJETA') || upper.includes('VALETA') ||
      upper.includes('DESCIDA') || upper.includes('CAIXA_COLETA') || upper.includes('POCO_VISITA') ||
      upper.includes('DRENO') || upper.includes('DISSIPADOR')) return 'DRENAGEM';
  
  // Sinalização
  if (upper.includes('SINALIZ') || upper.includes('DEFENSA') || upper.includes('BARREIRA') ||
      upper.includes('TACHA') || upper.includes('SEMAFORO')) return 'SINALIZACAO';
  
  // Saneamento
  if (upper.includes('REDE_AGUA') || upper.includes('REDE_ESGOTO') || upper.includes('ETE') ||
      upper.includes('ETA') || upper.includes('RESERVATORIO') || upper.includes('ELEVATORIA') ||
      upper.includes('ADUTORA')) return 'SANEAMENTO';
  
  // Elétrica
  if (upper.includes('ELETRIC') || upper.includes('SUBESTACAO') || upper.includes('ILUMINAC') ||
      upper.includes('POSTE') || upper.includes('TELECOM') || upper.includes('FIBRA')) return 'ELETRICA';
  
  // Edificação
  if (upper.includes('FUNDAC') || upper.includes('ESTRUTURA') || upper.includes('ALVENARIA') ||
      upper.includes('COBERTURA') || upper.includes('REVESTIM') || upper.includes('INSTALAC') ||
      upper.includes('ESTACA') || upper.includes('SAPATA')) return 'EDIFICACAO';
  
  return 'OUTROS';
}

export function CategoryDashboard({ results }: CategoryDashboardProps) {
  const stats = useMemo(() => {
    const categoryStats: Record<string, { count: number; frentes: Record<string, number> }> = {};
    const frenteStats: Record<string, number> = {};
    let totalSuccess = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    results.forEach(r => {
      const portico = r.portico || 'NAO_IDENTIFICADO';
      const category = getCategoryFromPortico(portico);
      
      // Contagem por categoria
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, frentes: {} };
      }
      categoryStats[category].count++;
      
      // Contagem por frente dentro da categoria
      if (!categoryStats[category].frentes[portico]) {
        categoryStats[category].frentes[portico] = 0;
      }
      categoryStats[category].frentes[portico]++;
      
      // Contagem geral de frentes
      frenteStats[portico] = (frenteStats[portico] || 0) + 1;
      
      // Sucesso
      if (r.status === 'Sucesso') totalSuccess++;
      
      // Confiança
      if (r.confidence) {
        totalConfidence += r.confidence;
        confidenceCount++;
      }
    });
    
    // Ordena categorias por contagem
    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].count - a[1].count);
    
    // Top frentes
    const topFrentes = Object.entries(frenteStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      total: results.length,
      success: totalSuccess,
      successRate: results.length > 0 ? (totalSuccess / results.length * 100) : 0,
      avgConfidence: confidenceCount > 0 ? (totalConfidence / confidenceCount * 100) : 0,
      categories: sortedCategories,
      topFrentes,
      categoryStats
    };
  }, [results]);

  if (results.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Camera className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhuma foto processada</p>
          <p className="text-sm">Adicione fotos para ver as estatísticas por categoria</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Fotos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Camera className="h-8 w-8 text-primary opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confiança Média</p>
                <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{stats.categories.length}</p>
              </div>
              <Layers className="h-8 w-8 text-purple-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição por Categoria
          </CardTitle>
          <CardDescription>
            Quantidade de fotos por tipo de obra/serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.categories.map(([category, data]) => {
              const Icon = CATEGORY_ICONS[category] || Construction;
              const color = CATEGORY_COLORS[category] || '#6b7280';
              const name = CATEGORY_NAMES[category] || category;
              const percentage = (data.count / stats.total * 100);
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div>
                        <span className="font-medium">{name}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(data.frentes)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([frente, count]) => (
                              <Badge 
                                key={frente} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {frente}: {count}
                              </Badge>
                            ))}
                          {Object.keys(data.frentes).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(data.frentes).length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{data.count}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    style={{ 
                      // @ts-ignore
                      '--progress-background': color 
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top frentes de serviço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 10 Frentes de Serviço
          </CardTitle>
          <CardDescription>
            Frentes com maior número de registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topFrentes.map(([frente, count], index) => {
              const category = getCategoryFromPortico(frente);
              const color = CATEGORY_COLORS[category] || '#6b7280';
              
              return (
                <div 
                  key={frente}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-lg font-bold"
                      style={{ color }}
                    >
                      #{index + 1}
                    </span>
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <p className="font-medium text-sm truncate" title={frente}>
                    {frente}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {count} foto{count > 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
