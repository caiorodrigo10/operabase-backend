/**
 * Sistema de Prompt Engineering para AI Dev Agent
 * Prompts otimizados para interpretar comandos e gerar ações no builder
 */

import { BUILDER_COMPONENTS, COLOR_MAP, SIZE_MAP } from './builder-knowledge';

export interface BuilderAction {
  action: 'update' | 'add' | 'remove';
  target: string; // nodeId ou 'new' para novos elementos
  component?: string; // nome do componente para ações 'add'
  props: Record<string, any>;
  reasoning: string; // explicação da ação
  parentTarget?: string; // para ações 'add', onde inserir o elemento
}

// System prompt principal para o AI Dev Agent
export const SYSTEM_PROMPT = `
Você é um AI Dev Agent especializado em editar landing pages usando Craft.js.
Sua função é interpretar comandos em linguagem natural e retornar ações JSON precisas.

## COMPONENTES DISPONÍVEIS:
${JSON.stringify(BUILDER_COMPONENTS, null, 2)}

## MAPEAMENTO DE CORES:
${JSON.stringify(COLOR_MAP, null, 2)}

## MAPEAMENTO DE TAMANHOS:
${JSON.stringify(SIZE_MAP, null, 2)}

## INSTRUÇÕES:
1. Analise o prompt do usuário e identifique:
   - Qual elemento modificar (por tipo, posição ou contexto)
   - Que alteração fazer (cor, texto, tamanho, posição, etc.)
   - Valores específicos mencionados

2. Para modificações em elementos existentes:
   - Use action: "update"
   - Identifique o target pelo tipo de componente mencionado
   - Se não houver especificação clara, assume o primeiro elemento do tipo

3. Para adição de novos elementos:
   - Use action: "add"
   - target: "new"
   - Defina o component apropriado
   - Especifique parentTarget onde inserir (geralmente "ROOT")

4. Para remoção:
   - Use action: "remove"
   - Identifique o target específico

5. SEMPRE retorne APENAS um JSON válido, sem texto adicional antes ou depois:
{
  "action": "update|add|remove",
  "target": "nodeId ou 'new'",
  "component": "Container|Text|CraftButton|etc (apenas para add)",
  "props": { /* propriedades a alterar/definir */ },
  "reasoning": "Explicação clara da alteração",
  "parentTarget": "ROOT ou nodeId (apenas para add)"
}

IMPORTANTE: Retorne SOMENTE o JSON, sem explicações adicionais.

## EXEMPLOS DE INTERPRETAÇÃO:

PROMPT: "Mude o texto do título para azul"
RESPOSTA:
{
  "action": "update",
  "target": "text_element",
  "props": {
    "color": { "r": 59, "g": 130, "b": 246, "a": 1 }
  },
  "reasoning": "Alterando cor do texto para azul"
}

PROMPT: "Adicione um botão verde com texto 'Comprar Agora'"
RESPOSTA:
{
  "action": "add",
  "target": "new",
  "component": "CraftButton",
  "props": {
    "text": "Comprar Agora",
    "background": { "r": 34, "g": 197, "b": 94, "a": 1 },
    "color": { "r": 255, "g": 255, "b": 255, "a": 1 },
    "size": "medium",
    "buttonStyle": "full"
  },
  "reasoning": "Adicionando botão verde com call-to-action",
  "parentTarget": "ROOT"
}

PROMPT: "Centralize o container principal"
RESPOSTA:
{
  "action": "update",
  "target": "main_container",
  "props": {
    "justifyContent": "center",
    "alignItems": "center"
  },
  "reasoning": "Centralizando alinhamento do container principal"
}

PROMPT: "Remova o vídeo"
RESPOSTA:
{
  "action": "remove",
  "target": "video_element",
  "props": {},
  "reasoning": "Removendo elemento de vídeo da página"
}

## REGRAS IMPORTANTES:
- Se a cor mencionada não estiver no mapeamento, use a mais próxima
- Para textos, sempre preserve o conteúdo existente a menos que especificado
- Para botões novos, sempre defina text, background e color
- Para containers, considere flexDirection baseado no contexto
- Se o comando for ambíguo, faça a interpretação mais lógica
- NUNCA retorne explicações extras, apenas o JSON da ação

## CONTEXTO DA PÁGINA:
A página atual contém elementos como containers, textos, botões e possivelmente vídeos.
Quando não especificado claramente, assuma que se refere ao primeiro elemento do tipo mencionado.
`;

// Função para gerar prompt específico com contexto da página
export function generateContextualPrompt(userPrompt: string, currentPageJSON: any): string {
  // Extrair informações da página atual
  const pageElements = analyzePageStructure(currentPageJSON);
  
  return `
${SYSTEM_PROMPT}

## ESTADO ATUAL DA PÁGINA:
${JSON.stringify(pageElements, null, 2)}

## COMANDO DO USUÁRIO:
"${userPrompt}"

Analise o comando e retorne APENAS o JSON da ação a ser executada.
`;
}

// Análise da estrutura da página para contexto
function analyzePageStructure(pageJSON: any): any {
  if (!pageJSON || typeof pageJSON !== 'object') {
    return { elements: [], structure: 'empty' };
  }

  const elements: any[] = [];
  const nodeIds = Object.keys(pageJSON);

  nodeIds.forEach(nodeId => {
    const node = pageJSON[nodeId];
    if (node && node.type) {
      elements.push({
        id: nodeId,
        type: node.type,
        props: node.props || {},
        hasChildren: node.nodes && node.nodes.length > 0
      });
    }
  });

  return {
    totalElements: elements.length,
    elementTypes: elements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    elements: elements.map(el => ({
      id: el.id,
      type: el.type,
      key_props: extractKeyProps(el.type, el.props)
    }))
  };
}

// Extrair props principais para contexto
function extractKeyProps(componentType: string, props: any): any {
  const keyProps: any = {};

  switch (componentType) {
    case 'Text':
      if (props.text) keyProps.text = props.text.substring(0, 50) + (props.text.length > 50 ? '...' : '');
      if (props.fontSize) keyProps.fontSize = props.fontSize;
      if (props.color) keyProps.color = props.color;
      break;
    
    case 'CraftButton':
      if (props.text) keyProps.text = props.text;
      if (props.size) keyProps.size = props.size;
      if (props.background) keyProps.background = props.background;
      break;
    
    case 'Container':
      if (props.background) keyProps.background = props.background;
      if (props.flexDirection) keyProps.flexDirection = props.flexDirection;
      if (props.width) keyProps.width = props.width;
      break;
    
    case 'Video':
      if (props.videoId) keyProps.videoId = props.videoId;
      if (props.width) keyProps.width = props.width;
      break;
    
    default:
      // Para outros componentes, pegar as 3 primeiras props
      const propKeys = Object.keys(props).slice(0, 3);
      propKeys.forEach(key => {
        keyProps[key] = props[key];
      });
  }

  return keyProps;
}

// Validação da ação gerada
export function validateBuilderAction(action: any): { valid: boolean; error?: string } {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'Ação deve ser um objeto' };
  }

  if (!['update', 'add', 'remove'].includes(action.action)) {
    return { valid: false, error: 'Ação deve ser update, add ou remove' };
  }

  if (!action.target || typeof action.target !== 'string') {
    return { valid: false, error: 'Target é obrigatório' };
  }

  if (action.action === 'add' && !action.component) {
    return { valid: false, error: 'Component é obrigatório para ação add' };
  }

  if (action.action === 'add' && !BUILDER_COMPONENTS[action.component]) {
    return { valid: false, error: `Componente ${action.component} não existe` };
  }

  if (!action.props || typeof action.props !== 'object') {
    return { valid: false, error: 'Props é obrigatório' };
  }

  if (!action.reasoning || typeof action.reasoning !== 'string') {
    return { valid: false, error: 'Reasoning é obrigatório' };
  }

  return { valid: true };
}