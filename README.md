# 🏗️ ObraPhoto AI

> **Sistema Inteligente de Classificação e Organização de Fotos de Obra**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/obraphoto)
[![Platform](https://img.shields.io/badge/platform-Web-brightgreen.svg)]()
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple.svg)]()

---

## 📋 Visão Geral

O **ObraPhoto AI** é uma solução profissional desenvolvida para transformar a gestão documental fotográfica em obras de infraestrutura, construção civil e projetos industriais.

Utilizando **Inteligência Artificial de última geração**, o sistema automatiza o processo de classificação, organização e rastreabilidade de registros fotográficos — uma tarefa que tradicionalmente consome dezenas de horas mensais de equipes técnicas.

---

## 🎯 Problema que Resolve

| Cenário Atual | Com ObraPhoto AI |
|---------------|------------------|
| Fotos armazenadas sem padrão | Estrutura de pastas automatizada |
| Classificação manual demorada | Análise por IA em segundos |
| Dificuldade em localizar registros | Busca inteligente por disciplina/serviço |
| Inconsistência entre equipes | Padronização automática |
| Retrabalho na documentação | Exportação pronta para relatórios |
| Perda de metadados importantes | Extração automática de datas e informações |

---

## ⚡ Funcionalidades Principais

### 🤖 Análise Inteligente com IA
- **Reconhecimento visual avançado** de atividades de obra
- **OCR integrado** para leitura de placas, datas e identificações
- **Classificação automática** em +25 disciplinas técnicas
- **Nível de confiança** para cada classificação

### 📁 Organização Automática
- Estrutura hierárquica: `Empresa > Fotos > Frente > Disciplina > Serviço`
- Subpastas opcionais por **mês/ano** e **dia**
- Nomenclatura padronizada para compliance documental

### 📊 Exportação Profissional
- **Excel** com relatório completo de classificações
- **ZIP organizado** com estrutura de pastas pronta
- Relatórios de resumo por disciplina e frente de serviço

### ⚡ Performance Otimizada
- **Cache inteligente** evita reprocessamento de fotos duplicadas
- **Processamento em lote** para grandes volumes
- Resultados exibidos em **tempo real**
- Sistema de **retry automático** para falhas

### ✏️ Edição Flexível
- Correção manual de classificações diretamente na tabela
- Preview de fotos em modal dedicado
- Seleção em massa para operações bulk

---

## 🏗️ Disciplinas Suportadas

O sistema reconhece automaticamente as seguintes disciplinas de obra:

| Infraestrutura | Estrutural | Instalações |
|----------------|------------|-------------|
| Terraplenagem | Fundação | Hidráulica |
| Pavimentação | Estrutura | Elétrica |
| Drenagem | Contenção | Ar Condicionado |
| OAC/OAE | Alvenaria | Incêndio |
| Sinalização | Revestimento | - |
| Barreiras | Acabamento | - |

**+ Pórticos Free Flow, Paisagismo, Segurança, Demolição, Ensaios, Mobilização, e mais...**

---

## 🖥️ Interface do Sistema

### Tela Principal
```
┌─────────────────────────────────────────────────────────────┐
│  📤 UPLOAD     📊 RESULTADOS     🌳 ESTRUTURA     📈 STATS  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │         Arraste suas fotos aqui                     │   │
│   │              ou clique para selecionar              │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ⚙️ OPÇÕES DE PROCESSAMENTO                                │
│   ├── 🏢 Empresa/Cliente                                    │
│   ├── 📍 Frente de Serviço Padrão                          │
│   ├── 📅 Organizar por Data                                │
│   └── 🧠 Prioridade IA                                     │
│                                                             │
│   [         🚀 PROCESSAR COM IA         ]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tabela de Resultados
```
┌────┬────────┬────────────────┬─────────────┬─────────────────┬────────────┐
│ ✓  │ Status │ Arquivo        │ Disciplina  │ Serviço         │ Confiança  │
├────┼────────┼────────────────┼─────────────┼─────────────────┼────────────┤
│ ☑  │   ✓    │ IMG_0234.jpg   │ FUNDACAO    │ CONCRETAGEM     │    92%     │
│ ☑  │   ✓    │ IMG_0235.jpg   │ ESTRUTURA   │ ARMACAO         │    87%     │
│ ☐  │   ✓    │ IMG_0236.jpg   │ DRENAGEM    │ BUEIRO          │    78%     │
│ ☑  │   ⚠    │ IMG_0237.jpg   │ -           │ -               │    Retry   │
└────┴────────┴────────────────┴─────────────┴─────────────────┴────────────┘
```

---

## 📈 Métricas de Performance

| Indicador | Valor |
|-----------|-------|
| Tempo médio por foto | **3-5 segundos** |
| Taxa de acerto | **85-95%** (com OCR disponível) |
| Fotos por lote | Até **5 simultâneas** |
| Formatos suportados | JPG, JPEG, PNG, WEBP |
| Tamanho máximo | 20MB por foto |

---

## 🔧 Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** para design responsivo
- **Shadcn/UI** para componentes modernos
- Arquitetura de componentes modulares

### Backend
- **Edge Functions** serverless
- Processamento em nuvem escalável
- API RESTful otimizada

### Inteligência Artificial
- Modelos de visão computacional de última geração
- OCR nativo para extração de texto
- Prompt engineering especializado para construção civil

---

## 📦 Estrutura de Pastas Gerada

```
EMPRESA/
└── FOTOS/
    └── PORTICO_01/
        ├── FUNDACAO/
        │   └── CONCRETAGEM_BLOCO/
        │       └── 01_JANEIRO_2026/
        │           └── 15_01/
        │               ├── IMG_0234.jpg
        │               └── IMG_0235.jpg
        └── ESTRUTURA/
            └── ARMACAO/
                └── 01_JANEIRO_2026/
                    └── 16_01/
                        └── IMG_0240.jpg
```

---

## 📊 Relatórios Disponíveis

### Excel/CSV
- Arquivo completo
- Status de processamento
- Frente de serviço
- Disciplina
- Serviço específico
- Data detectada
- Método (IA/Manual)
- Confiança (%)
- Caminho de destino
- Análise técnica detalhada

### ZIP Organizado
- Estrutura de pastas pronta para servidor
- Fotos renomeadas e classificadas
- Compatível com sistemas de gestão documental

---

## 🔒 Segurança e Privacidade

- ✅ Processamento **client-side** para pré-visualização
- ✅ Fotos **não são armazenadas** permanentemente  
- ✅ Cache local com expiração configurável
- ✅ Comunicação criptografada (HTTPS)
- ✅ Conformidade com LGPD

---

## 💼 Casos de Uso

### 🏗️ Construtoras
- Documentação de avanço físico
- Compliance em licitações públicas
- Gestão de acervo técnico histórico

### 🛣️ Concessionárias de Rodovias
- Registro de manutenção viária
- Acompanhamento de obras especiais (OAE/OAC)
- Histórico de intervenções

### 📐 Consultorias de Engenharia
- Laudos e vistorias técnicas
- Perícias de engenharia
- Acompanhamento de obras terceirizadas

### 🏛️ Órgãos Públicos
- Fiscalização de contratos
- Documentação de empreendimentos
- Transparência e prestação de contas

---

## 🚀 Diferenciais Competitivos

| Característica | ObraPhoto AI | Soluções Tradicionais |
|----------------|--------------|----------------------|
| Classificação | Automática com IA | Manual |
| Tempo por foto | 3-5 segundos | 2-5 minutos |
| Padronização | 100% consistente | Varia por operador |
| Extração de data | Automática (OCR) | Manual |
| Escalabilidade | Ilimitada | Limitada por equipe |
| Curva de aprendizado | Minutos | Horas/Dias |

---

## 📞 Contato Comercial

Para **demonstração**, **licenciamento** ou informações sobre **planos empresariais**:

📧 **[Email a definir]**  
📱 **[Telefone a definir]**

---

## 🔄 Histórico de Versões

### v1.2.0 (Atual)
- Resultados em tempo real durante processamento
- Cache inteligente de imagens
- Processamento em lote otimizado
- Sistema de versões e changelog

### v1.1.0
- Análise de fotos com IA integrada
- Exportação para Excel e ZIP
- Edição de resultados inline
- Preview de fotos em modal

### v1.0.0
- Lançamento inicial
- Upload de múltiplas fotos
- Classificação por disciplina e serviço
- Estrutura de pastas automática

---

## 📄 Licença

Este software é **proprietário** e protegido por direitos autorais.  
Todos os direitos reservados © 2026.

A reprodução, distribuição ou modificação sem autorização expressa é proibida.

---

<div align="center">

### 🏗️ **ObraPhoto AI**
*Transformando fotos em documentação inteligente*

---

**Desenvolvido com ❤️ para o setor de construção civil**

</div>
