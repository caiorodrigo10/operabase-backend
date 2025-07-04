/**
 * Tipos e interfaces para o AI Dev Agent
 */

// Estrutura de cores RGBA
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Ação que o AI Dev pode executar
export interface BuilderAction {
  action: 'update' | 'add' | 'remove';
  target: string; // nodeId ou 'new' para novos elementos
  component?: string; // nome do componente para ações 'add'
  props: Record<string, any>;
  reasoning: string; // explicação da ação
  parentTarget?: string; // para ações 'add', onde inserir o elemento
}

// Resultado do processamento de um comando
export interface AIProcessResult {
  success: boolean;
  action?: BuilderAction;
  error?: string;
  timestamp: number;
}

// Contexto da página atual para o AI
export interface PageContext {
  totalElements: number;
  elementTypes: Record<string, number>;
  elements: Array<{
    id: string;
    type: string;
    key_props: Record<string, any>;
  }>;
}

// Estado do AI Dev Agent
export interface AIDevState {
  isProcessing: boolean;
  lastAction?: BuilderAction;
  lastError?: string;
  commandHistory: Array<{
    command: string;
    result: AIProcessResult;
    timestamp: number;
  }>;
}

// Configuração do AI Dev Agent
export interface AIDevConfig {
  maxHistorySize: number;
  enableValidation: boolean;
  debugMode: boolean;
}

// Mapeamento de nós do Craft.js
export interface CraftNode {
  type: string;
  props: Record<string, any>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  custom?: Record<string, any>;
  hidden?: boolean;
  isCanvas?: boolean;
  displayName?: string;
  parent?: string;
}

// JSON serializado do Craft.js
export type CraftJSON = Record<string, CraftNode>;

// Resposta da API OpenAI
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

// Log de ação para debug
export interface ActionLog {
  id: string;
  timestamp: number;
  command: string;
  action: BuilderAction;
  success: boolean;
  error?: string;
  duration: number;
}