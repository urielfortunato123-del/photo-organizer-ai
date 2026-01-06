/**
 * CATÁLOGO COMPLETO DE FRENTES DE SERVIÇO
 * 
 * Este arquivo contém padrões de reconhecimento para diversos tipos de obras e serviços
 * de engenharia civil, rodoviária, infraestrutura e outros setores.
 * 
 * Cada categoria possui:
 * - id: identificador único
 * - nome: nome de exibição
 * - variacoes: array de variações textuais (para OCR)
 * - regex: padrão regex para captura
 * - categoria: categoria principal
 * - subcategoria: subcategoria (opcional)
 */

export interface FrenteServico {
  id: string;
  nome: string;
  variacoes: string[];
  regex: RegExp;
  categoria: string;
  subcategoria?: string;
  descricao?: string;
}

export interface CategoriaFrenteServico {
  id: string;
  nome: string;
  descricao: string;
  frentes: FrenteServico[];
}

// ============================================================================
// OBRAS DE ARTE ESPECIAIS (OAE)
// ============================================================================
export const OAE_FRENTES: FrenteServico[] = [
  {
    id: 'PONTE',
    nome: 'Ponte',
    variacoes: ['ponte', 'pont', 'bridge'],
    regex: /\bPONTE[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Travessia',
    descricao: 'Estrutura para transposição de obstáculos como rios, vales'
  },
  {
    id: 'VIADUTO',
    nome: 'Viaduto',
    variacoes: ['viaduto', 'viad', 'viaduct'],
    regex: /\bVIADUTO[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Travessia',
    descricao: 'Estrutura elevada para transposição de vias ou vales secos'
  },
  {
    id: 'PASSARELA',
    nome: 'Passarela',
    variacoes: ['passarela', 'pasarela', 'passagem', 'footbridge'],
    regex: /\bPASSARELA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Pedestres',
    descricao: 'Passagem elevada para pedestres'
  },
  {
    id: 'TUNEL',
    nome: 'Túnel',
    variacoes: ['túnel', 'tunel', 'tunnel'],
    regex: /\bT[UÚ]NEL[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Subterrâneo',
    descricao: 'Passagem subterrânea escavada'
  },
  {
    id: 'GALERIA',
    nome: 'Galeria',
    variacoes: ['galeria', 'gallery', 'box culvert'],
    regex: /\bGALERIA[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Drenagem',
    descricao: 'Estrutura tipo caixa para passagem de água ou veículos'
  },
  {
    id: 'BUEIRO',
    nome: 'Bueiro',
    variacoes: ['bueiro', 'boca de lobo', 'culvert'],
    regex: /\bBUEIRO[\s\-_]*(CELULAR|TUBULAR)?[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Drenagem',
    descricao: 'Estrutura para passagem de água sob rodovia'
  },
  {
    id: 'OAE',
    nome: 'OAE (Genérico)',
    variacoes: ['oae', 'obra de arte especial'],
    regex: /\bOAE[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'OAE',
    descricao: 'Obra de Arte Especial não especificada'
  },
  {
    id: 'ELEVADO',
    nome: 'Elevado',
    variacoes: ['elevado', 'elevated'],
    regex: /\bELEVADO[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Travessia',
    descricao: 'Via elevada urbana'
  },
  {
    id: 'TRINCHEIRA',
    nome: 'Trincheira',
    variacoes: ['trincheira', 'trench'],
    regex: /\bTRINCHEIRA[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Subterrâneo',
    descricao: 'Passagem rebaixada em relação ao nível do solo'
  },
  {
    id: 'MERGULHAO',
    nome: 'Mergulhão',
    variacoes: ['mergulhão', 'mergulhao', 'underpass'],
    regex: /\bMERGULH[AÃ]O[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'OAE',
    subcategoria: 'Subterrâneo',
    descricao: 'Passagem subterrânea para veículos'
  },
];

// ============================================================================
// OBRAS DE CONTENÇÃO
// ============================================================================
export const CONTENCAO_FRENTES: FrenteServico[] = [
  {
    id: 'CORTINA_ATIRANTADA',
    nome: 'Cortina Atirantada',
    variacoes: ['cortina atirantada', 'muro atirantado', 'anchored wall'],
    regex: /\bCORTINA[\s\-_]*ATIRANTADA\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Atirantada',
    descricao: 'Estrutura de contenção com tirantes ancorados no solo'
  },
  {
    id: 'CORTINA',
    nome: 'Cortina',
    variacoes: ['cortina', 'cortina de estacas', 'sheet pile'],
    regex: /\bCORTINA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    descricao: 'Estrutura de contenção vertical'
  },
  {
    id: 'MURO_ARRIMO',
    nome: 'Muro de Arrimo',
    variacoes: ['muro de arrimo', 'muro arrimo', 'retaining wall', 'muro de contenção'],
    regex: /\bMURO[\s\-_]*(DE[\s\-_]*)?(ARRIMO|CONTEN[CÇ][AÃ]O)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Gravidade',
    descricao: 'Muro para contenção de solo por gravidade'
  },
  {
    id: 'GABIAO',
    nome: 'Gabião',
    variacoes: ['gabião', 'gabiao', 'muro de gabião', 'gabion'],
    regex: /\bGABI[AÃ]O[\s\-_]*(CAIXA|COLCH[AÃ]O|MANTA)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Flexível',
    descricao: 'Estrutura flexível de contenção com pedras em gaiolas'
  },
  {
    id: 'SOLO_GRAMPEADO',
    nome: 'Solo Grampeado',
    variacoes: ['solo grampeado', 'grampeamento', 'soil nailing'],
    regex: /\bSOLO[\s\-_]*GRAMPEADO\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Reforçado',
    descricao: 'Técnica de reforço do solo com grampos de aço'
  },
  {
    id: 'TERRA_ARMADA',
    nome: 'Terra Armada',
    variacoes: ['terra armada', 'muro de terra armada', 'reinforced earth'],
    regex: /\bTERRA[\s\-_]*ARMADA\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Reforçado',
    descricao: 'Solo reforçado com fitas ou tiras metálicas'
  },
  {
    id: 'ESTACA_PRANCHA',
    nome: 'Estaca Prancha',
    variacoes: ['estaca prancha', 'estaca-prancha', 'sheet pile'],
    regex: /\bESTACA[\s\-_]*PRANCHA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Metálica',
    descricao: 'Perfis metálicos cravados para contenção'
  },
  {
    id: 'TIRANTE',
    nome: 'Tirante',
    variacoes: ['tirante', 'anchor', 'tie-back'],
    regex: /\bTIRANTE[\s\-_]*(T?\d+)?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Ancoragem',
    descricao: 'Elemento de ancoragem para estruturas de contenção'
  },
  {
    id: 'MURO_GRAVIDADE',
    nome: 'Muro de Gravidade',
    variacoes: ['muro de gravidade', 'gravity wall'],
    regex: /\bMURO[\s\-_]*(DE[\s\-_]*)?GRAVIDADE[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Gravidade',
    descricao: 'Muro que resiste ao empuxo pelo peso próprio'
  },
  {
    id: 'MURO_FLEXAO',
    nome: 'Muro de Flexão',
    variacoes: ['muro de flexão', 'cantilever wall', 'muro em L'],
    regex: /\bMURO[\s\-_]*(DE[\s\-_]*)?(FLEX[AÃ]O|EM[\s\-_]*L)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Flexão',
    descricao: 'Muro em balanço, tipo L ou T invertido'
  },
  {
    id: 'TALUDE',
    nome: 'Talude',
    variacoes: ['talude', 'slope', 'encosta'],
    regex: /\bTALUDE[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Natural',
    descricao: 'Superfície inclinada de maciço de terra ou rocha'
  },
  {
    id: 'ENROCAMENTO',
    nome: 'Enrocamento',
    variacoes: ['enrocamento', 'rip-rap', 'riprap'],
    regex: /\bENROCAMENTO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Contenção',
    subcategoria: 'Proteção',
    descricao: 'Proteção de taludes com blocos de rocha'
  },
];

// ============================================================================
// INFRAESTRUTURA RODOVIÁRIA
// ============================================================================
export const RODOVIARIA_FRENTES: FrenteServico[] = [
  {
    id: 'BSO',
    nome: 'BSO - Base de Serviço Operacional',
    variacoes: ['bso', 'base de serviço', 'base operacional'],
    regex: /\bBSO[\s\-_]*(\d{1,2})\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Operação',
    descricao: 'Base de apoio às operações rodoviárias'
  },
  {
    id: 'PORTICO',
    nome: 'Pórtico',
    variacoes: ['pórtico', 'portico', 'gantry'],
    regex: /\bP[OÓ]RTICO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Sinalização',
    descricao: 'Estrutura para suporte de sinalização ou equipamentos'
  },
  {
    id: 'FREE_FLOW',
    nome: 'Free Flow',
    variacoes: ['free flow', 'freeflow', 'pedágio free flow', 'cobrança automática'],
    regex: /\bFREE[\s\-_]?FLOW[\s\-_]*(P[\-\s]*\d+|[A-Z]?\d+)?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Pedágio',
    descricao: 'Sistema de pedágio automático sem cancelas'
  },
  {
    id: 'PRACA_PEDAGIO',
    nome: 'Praça de Pedágio',
    variacoes: ['praça de pedágio', 'praca de pedagio', 'toll plaza', 'cabine de pedágio'],
    regex: /\bPRA[CÇ]A[\s\-_]*(DE[\s\-_]*)?(PED[AÁ]GIO)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Pedágio',
    descricao: 'Local de cobrança de pedágio'
  },
  {
    id: 'SAU',
    nome: 'SAU - Serviço de Atendimento ao Usuário',
    variacoes: ['sau', 'serviço atendimento usuário', 'ponto de atendimento'],
    regex: /\bSAU[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Operação',
    descricao: 'Ponto de atendimento ao usuário da rodovia'
  },
  {
    id: 'PMV',
    nome: 'PMV - Painel de Mensagem Variável',
    variacoes: ['pmv', 'painel mensagem variável', 'vms', 'variable message sign'],
    regex: /\bPMV[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Sinalização',
    descricao: 'Painel eletrônico de mensagens'
  },
  {
    id: 'CCO',
    nome: 'CCO - Centro de Controle Operacional',
    variacoes: ['cco', 'centro de controle', 'sala de controle'],
    regex: /\bCCO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Operação',
    descricao: 'Centro de monitoramento e controle da rodovia'
  },
  {
    id: 'RETORNO',
    nome: 'Retorno',
    variacoes: ['retorno', 'alça de retorno', 'u-turn'],
    regex: /\bRETORNO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Geometria',
    descricao: 'Dispositivo para mudança de sentido'
  },
  {
    id: 'INTERSECAO',
    nome: 'Interseção',
    variacoes: ['interseção', 'intersecao', 'cruzamento', 'entroncamento'],
    regex: /\b(INTERSE[CÇ][AÃ]O|CRUZAMENTO|ENTRONCAMENTO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Geometria',
    descricao: 'Ponto de encontro de vias'
  },
  {
    id: 'ROTATORIA',
    nome: 'Rotatória',
    variacoes: ['rotatória', 'rotatoria', 'roundabout', 'giratória'],
    regex: /\bROTAT[OÓ]RIA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Geometria',
    descricao: 'Interseção com ilha central circular'
  },
  {
    id: 'ACESSO',
    nome: 'Acesso',
    variacoes: ['acesso', 'alça de acesso', 'ramp'],
    regex: /\bACESSO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Geometria',
    descricao: 'Rampa de entrada ou saída da rodovia'
  },
  {
    id: 'TREVO',
    nome: 'Trevo',
    variacoes: ['trevo', 'interchange', 'cloverleaf'],
    regex: /\bTREVO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Geometria',
    descricao: 'Interseção em desnível com alças'
  },
  {
    id: 'POSTO_POLICIAL',
    nome: 'Posto Policial',
    variacoes: ['posto policial', 'posto prf', 'posto pme', 'base policial'],
    regex: /\bPOSTO[\s\-_]*(POLICIAL|PRF|PME|PM)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Segurança',
    descricao: 'Base policial rodoviária'
  },
  {
    id: 'POSTO_PESAGEM',
    nome: 'Posto de Pesagem',
    variacoes: ['posto de pesagem', 'balança', 'weigh station'],
    regex: /\b(POSTO[\s\-_]*(DE[\s\-_]*)?PESAGEM|BALAN[CÇ]A)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Fiscalização',
    descricao: 'Local de pesagem de veículos de carga'
  },
  {
    id: 'AREA_DESCANSO',
    nome: 'Área de Descanso',
    variacoes: ['área de descanso', 'area de descanso', 'rest area', 'parada'],
    regex: /\b[AÁ]REA[\s\-_]*(DE[\s\-_]*)?DESCANSO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Rodoviária',
    subcategoria: 'Apoio',
    descricao: 'Local para descanso de motoristas'
  },
];

// ============================================================================
// PAVIMENTAÇÃO
// ============================================================================
export const PAVIMENTACAO_FRENTES: FrenteServico[] = [
  {
    id: 'PAVIMENTACAO',
    nome: 'Pavimentação',
    variacoes: ['pavimentação', 'pavimentacao', 'paving'],
    regex: /\bPAVIMENTA[CÇ][AÃ]O[\s\-_]*([A-Z0-9\-]+)?\b/gi,
    categoria: 'Pavimentação',
    descricao: 'Serviço de pavimentação'
  },
  {
    id: 'RECAPEAMENTO',
    nome: 'Recapeamento',
    variacoes: ['recapeamento', 'recape', 'resurfacing', 'overlay'],
    regex: /\bRECAP(EAMENTO|E)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Restauração',
    descricao: 'Aplicação de nova camada asfáltica'
  },
  {
    id: 'FRESAGEM',
    nome: 'Fresagem',
    variacoes: ['fresagem', 'fresa', 'milling'],
    regex: /\bFRESA(GEM)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Restauração',
    descricao: 'Remoção de camada do pavimento existente'
  },
  {
    id: 'CBUQ',
    nome: 'CBUQ - Concreto Betuminoso',
    variacoes: ['cbuq', 'concreto betuminoso', 'asfalto', 'hot mix asphalt'],
    regex: /\bCBUQ[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Revestimento',
    descricao: 'Concreto Betuminoso Usinado a Quente'
  },
  {
    id: 'MICRO_REVESTIMENTO',
    nome: 'Micro Revestimento',
    variacoes: ['micro revestimento', 'microsurfacing', 'microrrevestimento'],
    regex: /\bMICRO[\s\-_]*(REVESTIMENTO)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Tratamento',
    descricao: 'Tratamento superficial fino'
  },
  {
    id: 'LAMA_ASFALTICA',
    nome: 'Lama Asfáltica',
    variacoes: ['lama asfáltica', 'lama asfaltica', 'slurry seal'],
    regex: /\bLAMA[\s\-_]*ASF[AÁ]LTICA?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Tratamento',
    descricao: 'Tratamento superficial preventivo'
  },
  {
    id: 'TAPA_BURACO',
    nome: 'Tapa-Buraco',
    variacoes: ['tapa-buraco', 'tapa buraco', 'remendo', 'patching'],
    regex: /\bTAPA[\s\-_]*BURACO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Manutenção',
    descricao: 'Reparo localizado do pavimento'
  },
  {
    id: 'IMPRIMACAO',
    nome: 'Imprimação',
    variacoes: ['imprimação', 'imprimacao', 'prime coat'],
    regex: /\bIMPRIMA[CÇ][AÃ]O[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Camada',
    descricao: 'Aplicação de ligante sobre base'
  },
  {
    id: 'PINTURA_LIGACAO',
    nome: 'Pintura de Ligação',
    variacoes: ['pintura de ligação', 'tack coat'],
    regex: /\bPINTURA[\s\-_]*(DE[\s\-_]*)?LIGA[CÇ][AÃ]O[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Pavimentação',
    subcategoria: 'Camada',
    descricao: 'Pintura para aderência entre camadas'
  },
];

// ============================================================================
// TERRAPLENAGEM
// ============================================================================
export const TERRAPLENAGEM_FRENTES: FrenteServico[] = [
  {
    id: 'TERRAPLENAGEM',
    nome: 'Terraplenagem',
    variacoes: ['terraplenagem', 'earthwork', 'movimentação de terra'],
    regex: /\bTERRAPLENAGEM[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    descricao: 'Movimentação de terra'
  },
  {
    id: 'ATERRO',
    nome: 'Aterro',
    variacoes: ['aterro', 'fill', 'embankment'],
    regex: /\bATERRO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    subcategoria: 'Movimento',
    descricao: 'Colocação e compactação de material'
  },
  {
    id: 'CORTE',
    nome: 'Corte',
    variacoes: ['corte', 'escavação', 'cut', 'excavation'],
    regex: /\b(CORTE|ESCAVA[CÇ][AÃ]O)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    subcategoria: 'Movimento',
    descricao: 'Remoção de material do terreno'
  },
  {
    id: 'BOTA_FORA',
    nome: 'Bota-Fora',
    variacoes: ['bota-fora', 'bota fora', 'área de descarte', 'spoil area'],
    regex: /\bBOTA[\s\-_]*FORA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    subcategoria: 'Descarte',
    descricao: 'Área de deposição de material excedente'
  },
  {
    id: 'JAZIDA',
    nome: 'Jazida',
    variacoes: ['jazida', 'caixa de empréstimo', 'borrow pit'],
    regex: /\b(JAZIDA|CAIXA[\s\-_]*(DE[\s\-_]*)?EMPR[EÉ]STIMO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    subcategoria: 'Fonte',
    descricao: 'Área de extração de material'
  },
  {
    id: 'REGULARIZACAO',
    nome: 'Regularização do Subleito',
    variacoes: ['regularização', 'subleito', 'subgrade'],
    regex: /\b(REGULARIZA[CÇ][AÃ]O|SUBLEITO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Terraplenagem',
    subcategoria: 'Preparo',
    descricao: 'Preparo do subleito para pavimentação'
  },
];

// ============================================================================
// DRENAGEM
// ============================================================================
export const DRENAGEM_FRENTES: FrenteServico[] = [
  {
    id: 'DRENAGEM',
    nome: 'Drenagem',
    variacoes: ['drenagem', 'drainage'],
    regex: /\bDRENAGEM[\s\-_]*(SUPERFICIAL|PROFUNDA)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    descricao: 'Sistema de drenagem'
  },
  {
    id: 'SARJETA',
    nome: 'Sarjeta',
    variacoes: ['sarjeta', 'gutter', 'canaleta'],
    regex: /\bSARJETA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Superficial',
    descricao: 'Canal para escoamento superficial'
  },
  {
    id: 'MEIO_FIO',
    nome: 'Meio-Fio',
    variacoes: ['meio-fio', 'meio fio', 'guia', 'curb'],
    regex: /\b(MEIO[\s\-_]*FIO|GUIA)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Superficial',
    descricao: 'Delimitação do leito carroçável'
  },
  {
    id: 'VALETA',
    nome: 'Valeta',
    variacoes: ['valeta', 'vala', 'ditch'],
    regex: /\bVALETA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Superficial',
    descricao: 'Canal para drenagem lateral'
  },
  {
    id: 'DESCIDA_AGUA',
    nome: 'Descida d\'Água',
    variacoes: ['descida d\'água', 'descida de água', 'descida agua', 'downspout'],
    regex: /\bDESCIDA[\s\-_]*(D[E\'][\s\-_]*)?[AÁ]GUA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Superficial',
    descricao: 'Dispositivo para condução de água em taludes'
  },
  {
    id: 'CAIXA_COLETA',
    nome: 'Caixa de Coleta',
    variacoes: ['caixa de coleta', 'boca de lobo', 'inlet', 'catch basin'],
    regex: /\b(CAIXA[\s\-_]*(DE[\s\-_]*)?COLETA|BOCA[\s\-_]*(DE[\s\-_]*)?LOBO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Captação',
    descricao: 'Dispositivo de captação de água'
  },
  {
    id: 'POCO_VISITA',
    nome: 'Poço de Visita',
    variacoes: ['poço de visita', 'pv', 'manhole'],
    regex: /\b(PO[CÇ]O[\s\-_]*(DE[\s\-_]*)?VISITA|PV)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Inspeção',
    descricao: 'Estrutura para inspeção e manutenção'
  },
  {
    id: 'DRENO',
    nome: 'Dreno',
    variacoes: ['dreno', 'dreno profundo', 'subdrain'],
    regex: /\bDRENO[\s\-_]*(PROFUNDO)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Profunda',
    descricao: 'Sistema de drenagem subterrânea'
  },
  {
    id: 'DISSIPADOR',
    nome: 'Dissipador de Energia',
    variacoes: ['dissipador', 'dissipador de energia', 'energy dissipator'],
    regex: /\bDISSIPADOR[\s\-_]*(DE[\s\-_]*)?ENERGIA?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Drenagem',
    subcategoria: 'Proteção',
    descricao: 'Estrutura para redução de velocidade da água'
  },
];

// ============================================================================
// SINALIZAÇÃO
// ============================================================================
export const SINALIZACAO_FRENTES: FrenteServico[] = [
  {
    id: 'SINALIZACAO_HORIZONTAL',
    nome: 'Sinalização Horizontal',
    variacoes: ['sinalização horizontal', 'pintura de faixa', 'road marking'],
    regex: /\bSINALIZA[CÇ][AÃ]O[\s\-_]*HORIZONTAL[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Horizontal',
    descricao: 'Pintura de faixas e símbolos no pavimento'
  },
  {
    id: 'SINALIZACAO_VERTICAL',
    nome: 'Sinalização Vertical',
    variacoes: ['sinalização vertical', 'placa', 'traffic sign'],
    regex: /\bSINALIZA[CÇ][AÃ]O[\s\-_]*VERTICAL[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Vertical',
    descricao: 'Placas de sinalização'
  },
  {
    id: 'DEFENSA',
    nome: 'Defensa Metálica',
    variacoes: ['defensa', 'defensa metálica', 'guard rail', 'guardrail', 'barreira'],
    regex: /\b(DEFENSA|GUARD[\s\-_]*RAIL|BARREIRA[\s\-_]*MET[AÁ]LICA)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Segurança',
    descricao: 'Barreira metálica de proteção'
  },
  {
    id: 'BARREIRA_CONCRETO',
    nome: 'Barreira de Concreto',
    variacoes: ['barreira de concreto', 'new jersey', 'concrete barrier'],
    regex: /\b(BARREIRA[\s\-_]*(DE[\s\-_]*)?CONCRETO|NEW[\s\-_]*JERSEY)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Segurança',
    descricao: 'Barreira rígida de concreto'
  },
  {
    id: 'TACHA',
    nome: 'Tacha Refletiva',
    variacoes: ['tacha', 'olho de gato', 'road stud', 'cat eye'],
    regex: /\bTACHA[\s\-_]*(REFLETIVA)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Horizontal',
    descricao: 'Dispositivo refletivo no pavimento'
  },
  {
    id: 'SEMAFORO',
    nome: 'Semáforo',
    variacoes: ['semáforo', 'semaforo', 'traffic light'],
    regex: /\bSEM[AÁ]FORO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Sinalização',
    subcategoria: 'Luminosa',
    descricao: 'Dispositivo de controle de tráfego'
  },
];

// ============================================================================
// INFRAESTRUTURA URBANA E SANEAMENTO
// ============================================================================
export const SANEAMENTO_FRENTES: FrenteServico[] = [
  {
    id: 'REDE_AGUA',
    nome: 'Rede de Água',
    variacoes: ['rede de água', 'adutora', 'water main', 'abastecimento'],
    regex: /\b(REDE[\s\-_]*(DE[\s\-_]*)?[AÁ]GUA|ADUTORA|ABASTECIMENTO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Água',
    descricao: 'Sistema de distribuição de água'
  },
  {
    id: 'REDE_ESGOTO',
    nome: 'Rede de Esgoto',
    variacoes: ['rede de esgoto', 'coletor', 'sewer', 'esgotamento'],
    regex: /\b(REDE[\s\-_]*(DE[\s\-_]*)?ESGOTO|COLETOR|ESGOTAMENTO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Esgoto',
    descricao: 'Sistema de coleta de esgoto'
  },
  {
    id: 'ETE',
    nome: 'ETE - Estação de Tratamento',
    variacoes: ['ete', 'estação de tratamento de esgoto', 'sewage treatment'],
    regex: /\bETE[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Tratamento',
    descricao: 'Estação de tratamento de esgoto'
  },
  {
    id: 'ETA',
    nome: 'ETA - Estação de Tratamento de Água',
    variacoes: ['eta', 'estação de tratamento de água', 'water treatment'],
    regex: /\bETA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Tratamento',
    descricao: 'Estação de tratamento de água'
  },
  {
    id: 'RESERVATORIO',
    nome: 'Reservatório',
    variacoes: ['reservatório', 'reservatorio', 'caixa d\'água', 'tank'],
    regex: /\b(RESERVAT[OÓ]RIO|CAIXA[\s\-_]*(D[E\'][\s\-_]*)?[AÁ]GUA)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Armazenamento',
    descricao: 'Estrutura de armazenamento de água'
  },
  {
    id: 'ELEVATORIA',
    nome: 'Elevatória',
    variacoes: ['elevatória', 'estação elevatória', 'pump station', 'eeab', 'eeat'],
    regex: /\b(ELEVAT[OÓ]RIA|EEA[BT])[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Saneamento',
    subcategoria: 'Bombeamento',
    descricao: 'Estação elevatória de água ou esgoto'
  },
];

// ============================================================================
// INFRAESTRUTURA ELÉTRICA E TELECOM
// ============================================================================
export const ELETRICA_FRENTES: FrenteServico[] = [
  {
    id: 'REDE_ELETRICA',
    nome: 'Rede Elétrica',
    variacoes: ['rede elétrica', 'linha de transmissão', 'power line'],
    regex: /\bREDE[\s\-_]*EL[EÉ]TRICA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Elétrica',
    descricao: 'Sistema de distribuição de energia'
  },
  {
    id: 'SUBESTACAO',
    nome: 'Subestação',
    variacoes: ['subestação', 'se', 'substation'],
    regex: /\b(SUBESTA[CÇ][AÃ]O|SE[\s\-_]*)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Elétrica',
    subcategoria: 'Transformação',
    descricao: 'Subestação de energia elétrica'
  },
  {
    id: 'ILUMINACAO',
    nome: 'Iluminação',
    variacoes: ['iluminação', 'iluminação pública', 'lighting'],
    regex: /\bILUMINA[CÇ][AÃ]O[\s\-_]*(P[UÚ]BLICA)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Elétrica',
    subcategoria: 'Iluminação',
    descricao: 'Sistema de iluminação'
  },
  {
    id: 'POSTE',
    nome: 'Poste',
    variacoes: ['poste', 'pole'],
    regex: /\bPOSTE[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Elétrica',
    subcategoria: 'Estrutura',
    descricao: 'Estrutura de suporte de cabos'
  },
  {
    id: 'REDE_TELECOM',
    nome: 'Rede de Telecomunicações',
    variacoes: ['rede de telecom', 'fibra óptica', 'telecom', 'comunicações'],
    regex: /\b(REDE[\s\-_]*(DE[\s\-_]*)?(TELECOM|COMUNICA[CÇ][OÕ]ES)|FIBRA[\s\-_]*[OÓ]PTICA)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Elétrica',
    subcategoria: 'Telecom',
    descricao: 'Infraestrutura de telecomunicações'
  },
];

// ============================================================================
// EDIFICAÇÕES
// ============================================================================
export const EDIFICACOES_FRENTES: FrenteServico[] = [
  {
    id: 'FUNDACAO',
    nome: 'Fundação',
    variacoes: ['fundação', 'fundacao', 'foundation', 'estaca', 'sapata'],
    regex: /\b(FUNDA[CÇ][AÃ]O|ESTACA|SAPATA|TUBUL[AÃ]O|BLOCO)[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Infraestrutura',
    descricao: 'Elementos de fundação'
  },
  {
    id: 'ESTRUTURA',
    nome: 'Estrutura',
    variacoes: ['estrutura', 'pilar', 'viga', 'laje', 'structure'],
    regex: /\bESTRUTURA[\s\-_]*(MET[AÁ]LICA|CONCRETO)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Estrutura',
    descricao: 'Elementos estruturais'
  },
  {
    id: 'ALVENARIA',
    nome: 'Alvenaria',
    variacoes: ['alvenaria', 'parede', 'masonry'],
    regex: /\bALVENARIA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Vedação',
    descricao: 'Vedação em alvenaria'
  },
  {
    id: 'COBERTURA',
    nome: 'Cobertura',
    variacoes: ['cobertura', 'telhado', 'roof'],
    regex: /\bCOBERTURA[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Cobertura',
    descricao: 'Sistema de cobertura'
  },
  {
    id: 'REVESTIMENTO',
    nome: 'Revestimento',
    variacoes: ['revestimento', 'reboco', 'acabamento', 'finishing'],
    regex: /\bREVESTIMENTO[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Acabamento',
    descricao: 'Revestimentos e acabamentos'
  },
  {
    id: 'INSTALACOES',
    nome: 'Instalações',
    variacoes: ['instalações', 'hidráulica', 'elétrica', 'installations'],
    regex: /\bINSTALA[CÇ][OÕ]ES[\s\-_]*(HIDR[AÁ]ULICA|EL[EÉ]TRICA)?[\s\-_]*(\d{1,2})?\b/gi,
    categoria: 'Edificação',
    subcategoria: 'Instalações',
    descricao: 'Instalações prediais'
  },
];

// ============================================================================
// CATEGORIAS CONSOLIDADAS
// ============================================================================
export const CATEGORIAS: CategoriaFrenteServico[] = [
  {
    id: 'OAE',
    nome: 'Obras de Arte Especiais',
    descricao: 'Pontes, viadutos, túneis, passarelas e outras estruturas especiais',
    frentes: OAE_FRENTES
  },
  {
    id: 'CONTENCAO',
    nome: 'Obras de Contenção',
    descricao: 'Muros, cortinas, taludes e sistemas de estabilização',
    frentes: CONTENCAO_FRENTES
  },
  {
    id: 'RODOVIARIA',
    nome: 'Infraestrutura Rodoviária',
    descricao: 'Praças de pedágio, pórticos, BSOs e dispositivos viários',
    frentes: RODOVIARIA_FRENTES
  },
  {
    id: 'PAVIMENTACAO',
    nome: 'Pavimentação',
    descricao: 'Serviços de pavimentação e restauração',
    frentes: PAVIMENTACAO_FRENTES
  },
  {
    id: 'TERRAPLENAGEM',
    nome: 'Terraplenagem',
    descricao: 'Movimentação de terra, cortes e aterros',
    frentes: TERRAPLENAGEM_FRENTES
  },
  {
    id: 'DRENAGEM',
    nome: 'Drenagem',
    descricao: 'Sistemas de drenagem superficial e profunda',
    frentes: DRENAGEM_FRENTES
  },
  {
    id: 'SINALIZACAO',
    nome: 'Sinalização',
    descricao: 'Sinalização horizontal, vertical e dispositivos de segurança',
    frentes: SINALIZACAO_FRENTES
  },
  {
    id: 'SANEAMENTO',
    nome: 'Saneamento',
    descricao: 'Água, esgoto e tratamento',
    frentes: SANEAMENTO_FRENTES
  },
  {
    id: 'ELETRICA',
    nome: 'Elétrica e Telecomunicações',
    descricao: 'Redes elétricas, iluminação e telecom',
    frentes: ELETRICA_FRENTES
  },
  {
    id: 'EDIFICACAO',
    nome: 'Edificações',
    descricao: 'Construção de edificações e reformas',
    frentes: EDIFICACOES_FRENTES
  },
];

// ============================================================================
// TODAS AS FRENTES (para busca rápida)
// ============================================================================
export const TODAS_FRENTES: FrenteServico[] = [
  ...OAE_FRENTES,
  ...CONTENCAO_FRENTES,
  ...RODOVIARIA_FRENTES,
  ...PAVIMENTACAO_FRENTES,
  ...TERRAPLENAGEM_FRENTES,
  ...DRENAGEM_FRENTES,
  ...SINALIZACAO_FRENTES,
  ...SANEAMENTO_FRENTES,
  ...ELETRICA_FRENTES,
  ...EDIFICACOES_FRENTES,
];

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Busca uma frente de serviço pelo ID
 */
export function getFrenteById(id: string): FrenteServico | undefined {
  return TODAS_FRENTES.find(f => f.id === id);
}

/**
 * Busca frentes de serviço por categoria
 */
export function getFrentesByCategoria(categoriaId: string): FrenteServico[] {
  return TODAS_FRENTES.filter(f => f.categoria === categoriaId);
}

/**
 * Tenta identificar uma frente de serviço a partir de texto
 */
export function identificarFrenteServico(texto: string): FrenteServico | null {
  const normalizado = texto.toUpperCase();
  
  for (const frente of TODAS_FRENTES) {
    frente.regex.lastIndex = 0;
    if (frente.regex.test(normalizado)) {
      frente.regex.lastIndex = 0;
      return frente;
    }
  }
  
  return null;
}

/**
 * Retorna todas as variações de texto para busca
 */
export function getTodasVariacoes(): string[] {
  const variacoes: string[] = [];
  for (const frente of TODAS_FRENTES) {
    variacoes.push(...frente.variacoes);
  }
  return variacoes;
}
