// Sistema de alertas inteligentes para fotos de obra

export type AlertLevel = 'info' | 'warning' | 'error';

export interface PhotoAlert {
  id: string;
  level: AlertLevel;
  code: string;
  message: string;
  details?: string;
}

// Códigos de alerta
export const ALERT_CODES = {
  // Informações (azul)
  EXIF_EXTRACTED: 'EXIF_EXTRACTED',
  OCR_TEXT_FOUND: 'OCR_TEXT_FOUND',
  GPS_FOUND: 'GPS_FOUND',
  DATE_CONFIRMED: 'DATE_CONFIRMED',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
  
  // Avisos (amarelo)
  NO_PLATE: 'NO_PLATE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  DATE_MISMATCH: 'DATE_MISMATCH',
  PARTIAL_OCR: 'PARTIAL_OCR',
  WEAK_EVIDENCE: 'WEAK_EVIDENCE',
  NO_GPS: 'NO_GPS',
  INFERRED_LOCATION: 'INFERRED_LOCATION',
  
  // Erros (vermelho)
  NO_DATE: 'NO_DATE',
  UNREADABLE_TEXT: 'UNREADABLE_TEXT',
  CLASSIFICATION_FAILED: 'CLASSIFICATION_FAILED',
  DUPLICATE_PHOTO: 'DUPLICATE_PHOTO',
  KM_INCONSISTENT: 'KM_INCONSISTENT',
  INVALID_FORMAT: 'INVALID_FORMAT',
} as const;

// Mensagens de alerta em português
export const ALERT_MESSAGES: Record<string, { level: AlertLevel; message: string; details: string }> = {
  // Informações
  [ALERT_CODES.EXIF_EXTRACTED]: {
    level: 'info',
    message: 'Metadados EXIF extraídos',
    details: 'Data, hora e informações do dispositivo foram extraídos automaticamente da foto.'
  },
  [ALERT_CODES.OCR_TEXT_FOUND]: {
    level: 'info',
    message: 'Texto detectado na imagem',
    details: 'A IA identificou texto legível na foto, incluindo possíveis placas ou identificadores.'
  },
  [ALERT_CODES.GPS_FOUND]: {
    level: 'info',
    message: 'Localização GPS detectada',
    details: 'Coordenadas GPS foram extraídas dos metadados da foto.'
  },
  [ALERT_CODES.DATE_CONFIRMED]: {
    level: 'info',
    message: 'Data confirmada',
    details: 'A data foi confirmada por múltiplas fontes (EXIF + OCR).'
  },
  [ALERT_CODES.HIGH_CONFIDENCE]: {
    level: 'info',
    message: 'Alta confiança na classificação',
    details: 'A classificação foi feita com alta confiança (>85%).'
  },
  
  // Avisos
  [ALERT_CODES.NO_PLATE]: {
    level: 'warning',
    message: 'Foto sem placa de identificação',
    details: 'Não foi encontrada placa de obra ou identificação visual na foto. Recomenda-se verificar manualmente.'
  },
  [ALERT_CODES.LOW_CONFIDENCE]: {
    level: 'warning',
    message: 'Baixa confiança na classificação',
    details: 'A IA tem baixa confiança (<70%) na classificação. Recomenda-se revisão manual.'
  },
  [ALERT_CODES.DATE_MISMATCH]: {
    level: 'warning',
    message: 'Inconsistência de data',
    details: 'A data no EXIF não corresponde à data detectada na imagem.'
  },
  [ALERT_CODES.PARTIAL_OCR]: {
    level: 'warning',
    message: 'Texto parcialmente legível',
    details: 'Parte do texto na imagem não pôde ser lida com clareza.'
  },
  [ALERT_CODES.WEAK_EVIDENCE]: {
    level: 'warning',
    message: 'Evidência fraca para auditoria',
    details: 'A foto pode não atender aos requisitos de evidência para auditoria. Considere complementar.'
  },
  [ALERT_CODES.NO_GPS]: {
    level: 'warning',
    message: 'Sem localização GPS',
    details: 'A foto não contém informações de GPS. Localização inferida por contexto.'
  },
  [ALERT_CODES.INFERRED_LOCATION]: {
    level: 'warning',
    message: 'Localização inferida',
    details: 'A localização foi inferida por contexto visual, não confirmada por GPS ou texto.'
  },
  
  // Erros
  [ALERT_CODES.NO_DATE]: {
    level: 'error',
    message: 'Data não identificada',
    details: 'Não foi possível determinar a data da foto. Necessária entrada manual.'
  },
  [ALERT_CODES.UNREADABLE_TEXT]: {
    level: 'error',
    message: 'Texto ilegível',
    details: 'O texto na imagem está muito borrado, escuro ou danificado para leitura.'
  },
  [ALERT_CODES.CLASSIFICATION_FAILED]: {
    level: 'error',
    message: 'Falha na classificação',
    details: 'Não foi possível classificar a foto automaticamente. Necessária classificação manual.'
  },
  [ALERT_CODES.DUPLICATE_PHOTO]: {
    level: 'error',
    message: 'Foto duplicada detectada',
    details: 'Esta foto parece ser duplicada de outra já processada.'
  },
  [ALERT_CODES.KM_INCONSISTENT]: {
    level: 'error',
    message: 'KM inconsistente',
    details: 'O KM detectado não corresponde à frente de serviço ou está fora do trecho esperado.'
  },
  [ALERT_CODES.INVALID_FORMAT]: {
    level: 'error',
    message: 'Formato inválido',
    details: 'O arquivo não é uma imagem válida ou está corrompido.'
  },
};

// Função para criar um alerta
export function createAlert(code: keyof typeof ALERT_CODES, customDetails?: string): PhotoAlert {
  const alertInfo = ALERT_MESSAGES[code];
  
  return {
    id: `${code}_${Date.now()}`,
    level: alertInfo?.level || 'warning',
    code,
    message: alertInfo?.message || code,
    details: customDetails || alertInfo?.details || '',
  };
}

// Função para gerar alertas baseado nos resultados do processamento
export function generateAlerts(
  confidence: number | undefined,
  ocrText: string | undefined,
  hasExifDate: boolean,
  hasGps: boolean,
  portico: string | undefined,
  disciplina: string | undefined,
  detectedDate: string | undefined,
  exifDate: string | undefined,
  rodovia: string | undefined,
  km: string | undefined
): PhotoAlert[] {
  const alerts: PhotoAlert[] = [];
  
  // Informações positivas
  if (hasExifDate) {
    alerts.push(createAlert('EXIF_EXTRACTED'));
  }
  
  if (hasGps) {
    alerts.push(createAlert('GPS_FOUND'));
  }
  
  if (ocrText && ocrText.length > 10) {
    alerts.push(createAlert('OCR_TEXT_FOUND'));
  }
  
  if (confidence && confidence >= 0.85) {
    alerts.push(createAlert('HIGH_CONFIDENCE'));
  }
  
  if (hasExifDate && detectedDate && exifDate === detectedDate) {
    alerts.push(createAlert('DATE_CONFIRMED'));
  }
  
  // Avisos
  if (!rodovia && !portico) {
    alerts.push(createAlert('NO_PLATE'));
  }
  
  if (confidence && confidence < 0.7 && confidence >= 0.5) {
    alerts.push(createAlert('LOW_CONFIDENCE'));
  }
  
  if (hasExifDate && detectedDate && exifDate && exifDate !== detectedDate) {
    alerts.push(createAlert('DATE_MISMATCH', `EXIF: ${exifDate}, Detectado: ${detectedDate}`));
  }
  
  if (!hasGps) {
    alerts.push(createAlert('NO_GPS'));
  }
  
  if (portico === 'NAO_IDENTIFICADO' || disciplina === 'NAO_IDENTIFICADO') {
    alerts.push(createAlert('INFERRED_LOCATION'));
  }
  
  // Se tem poucos indicadores, evidência fraca
  const positiveIndicators = [hasExifDate, hasGps, ocrText && ocrText.length > 10, rodovia, km].filter(Boolean).length;
  if (positiveIndicators < 2) {
    alerts.push(createAlert('WEAK_EVIDENCE'));
  }
  
  // Erros
  if (!detectedDate && !hasExifDate) {
    alerts.push(createAlert('NO_DATE'));
  }
  
  if (confidence && confidence < 0.5) {
    alerts.push(createAlert('CLASSIFICATION_FAILED'));
  }
  
  return alerts;
}

// Ordenar alertas por prioridade (erros primeiro, depois avisos, depois informações)
export function sortAlertsByPriority(alerts: PhotoAlert[]): PhotoAlert[] {
  const priority: Record<AlertLevel, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  
  return [...alerts].sort((a, b) => priority[a.level] - priority[b.level]);
}

// Contar alertas por nível
export function countAlertsByLevel(alerts: PhotoAlert[]): Record<AlertLevel, number> {
  return alerts.reduce(
    (acc, alert) => {
      acc[alert.level]++;
      return acc;
    },
    { info: 0, warning: 0, error: 0 }
  );
}
