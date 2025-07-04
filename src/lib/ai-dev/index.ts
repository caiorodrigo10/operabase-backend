/**
 * AI Dev Agent - Fase 1: Knowledge Base
 * Exportação principal de todas as funcionalidades da knowledge base
 */

// Knowledge Base
export {
  BUILDER_COMPONENTS,
  COLOR_MAP,
  SIZE_MAP,
  parseColor,
  parseSize,
  findComponentByNaturalLanguage,
  type ComponentDefinition,
  type ComponentProp
} from './builder-knowledge';

// Prompt Engineering
export {
  SYSTEM_PROMPT,
  generateContextualPrompt,
  validateBuilderAction
} from './ai-dev-prompt';

// Types
export type {
  RGBAColor,
  BuilderAction,
  AIProcessResult,
  PageContext,
  AIDevState,
  AIDevConfig,
  CraftNode,
  CraftJSON,
  OpenAIResponse,
  ActionLog
} from './types';

// AI Service
export { AIDevService, aiDevService } from './ai-dev-service';

// Builder Transformer
export { BuilderTransformer, builderTransformer } from './builder-transformer';

// Utilities
export {
  findNodeByType,
  findAllNodesByType,
  findNodeByTextContent,
  findParentNode,
  generateNodeId,
  nodeExists,
  resolveActionTarget,
  findBestParentForNewElement,
  normalizeColorProps,
  normalizeSizeProps,
  validatePropsForComponent,
  hexToRGBA,
  rgbaToCSS,
  cleanProps,
  mergeProps,
  extractPromptContext
} from './utils';

// Configurações padrão
export const DEFAULT_AI_DEV_CONFIG = {
  maxHistorySize: 50,
  enableValidation: true,
  debugMode: process.env.NODE_ENV === 'development'
} as const;

// Constantes úteis
export const AI_DEV_CONSTANTS = {
  // Componentes mais comuns para sugestões
  COMMON_COMPONENTS: ['Text', 'CraftButton', 'Container', 'LandingCard'],
  
  // Cores mais utilizadas
  POPULAR_COLORS: ['blue', 'green', 'red', 'white', 'black'],
  
  // Ações mais frequentes
  COMMON_ACTIONS: ['update', 'add', 'remove'],
  
  // Props mais modificadas
  FREQUENT_PROPS: ['color', 'text', 'background', 'padding', 'margin', 'fontSize'],
  
  // Timeout para operações AI
  AI_TIMEOUT: 30000, // 30 segundos
  
  // Prefixos para IDs de novos elementos
  NODE_ID_PREFIXES: {
    Text: 'text',
    CraftButton: 'btn',
    Container: 'container',
    Video: 'video',
    LandingCard: 'card',
    HeroSection: 'hero',
    VideoComponent: 'video_comp'
  }
} as const;

/**
 * Status da Fase 2: ✅ COMPLETA
 * 
 * Funcionalidades implementadas:
 * Fase 1:
 * - Knowledge base completa de todos os componentes
 * - Sistema de mapeamento de linguagem natural
 * - Prompt engineering otimizado para GPT
 * - Utilitários para manipulação de JSON do Craft.js
 * - Validação de ações e propriedades
 * - Tipos TypeScript robustos
 * 
 * Fase 2:
 * - AIDevService: Processamento de comandos com OpenAI
 * - BuilderTransformer: Engine de transformação JSON
 * - Integração completa prompt → ação → JSON
 * - Validação e tratamento de erros
 * - Suporte a múltiplos comandos sequenciais
 * 
 * Próxima etapa: Fase 3 - Integração com Editor
 */