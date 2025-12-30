import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcessingResult } from '@/services/api';

interface StatisticsCardProps {
  results: ProcessingResult[];
  onExportCSV: () => void;
}

const COLORS = [
  'hsl(35, 100%, 50%)',   // Primary orange
  'hsl(142, 76%, 36%)',   // Success green
  'hsl(45, 93%, 47%)',    // Warning yellow
  'hsl(200, 80%, 50%)',   // Blue
  'hsl(280, 70%, 50%)',   // Purple
  'hsl(0, 72%, 51%)',     // Red
  'hsl(160, 60%, 45%)',   // Teal
  'hsl(320, 70%, 50%)',   // Pink
];

const StatisticsCard: React.FC<StatisticsCardProps> = ({ results, onExportCSV }) => {
  // Group by disciplina
  const disciplinaStats = results.reduce((acc, r) => {
    if (r.disciplina && r.status === 'Sucesso') {
      acc[r.disciplina] = (acc[r.disciplina] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const disciplinaData = Object.entries(disciplinaStats).map(([name, value]) => ({
    name,
    value,
  }));

  // Group by service
  const serviceStats = results.reduce((acc, r) => {
    if (r.service && r.status === 'Sucesso') {
      acc[r.service] = (acc[r.service] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const serviceData = Object.entries(serviceStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 services

  // Method stats
  const methodStats = {
    heuristica: results.filter(r => r.method === 'heuristica').length,
    ia: results.filter(r => r.method === 'ia_fallback' || r.method === 'ia_forcada').length,
  };

  const successRate = results.length > 0 
    ? Math.round((results.filter(r => r.status === 'Sucesso').length / results.length) * 100)
    : 0;

  const avgConfidence = results.length > 0
    ? Math.round(
        results
          .filter(r => r.confidence !== undefined)
          .reduce((sum, r) => sum + (r.confidence || 0), 0) / 
        results.filter(r => r.confidence !== undefined).length * 100
      )
    : 0;

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Estatísticas</h3>
            <p className="text-xs text-muted-foreground">{results.length} fotos processadas</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="w-4 h-4 mr-1" />
          Exportar CSV
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-success">{successRate}%</p>
          <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{avgConfidence}%</p>
          <p className="text-xs text-muted-foreground">Confiança Média</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{methodStats.heuristica}</p>
          <p className="text-xs text-muted-foreground">Heurística</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{methodStats.ia}</p>
          <p className="text-xs text-muted-foreground">IA</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Disciplina Chart */}
        {disciplinaData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Por Disciplina</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disciplinaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {disciplinaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220 18% 12%)', 
                      border: '1px solid hsl(220 15% 20%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Service Chart */}
        {serviceData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Top Serviços</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {serviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220 18% 12%)', 
                      border: '1px solid hsl(220 15% 20%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px' }}
                    formatter={(value) => (
                      <span className="text-foreground">
                        {value.length > 15 ? value.slice(0, 15) + '...' : value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsCard;
