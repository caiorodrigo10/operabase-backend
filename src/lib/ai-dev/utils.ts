/**
 * Utilitários para o AI Dev Agent
 * Funções auxiliares para mapeamento e transformação de elementos
 */

import { CraftJSON, CraftNode, BuilderAction, RGBAColor } from './types';
import { BUILDER_COMPONENTS, parseColor, parseSize } from './builder-knowledge';

/**
 * Encontra um nó no JSON do Craft.js por tipo de componente
 */
export function findNodeByType(craftJSON: CraftJSON, componentType: string): string | null {
  for (const [nodeId, node] of Object.entries(craftJSON)) {
    if (node.type === componentType) {
      return nodeId;
    }
  }
  return null;
}

/**
 * Encontra todos os nós de um tipo específico
 */
export function findAllNodesByType(craftJSON: CraftJSON, componentType: string): string[] {
  const nodeIds: string[] = [];
  for (const [nodeId, node] of Object.entries(craftJSON)) {
    if (node.type === componentType) {
      nodeIds.push(nodeId);
    }
  }
  return nodeIds;
}

/**
 * Encontra um nó por conteúdo de texto (para componentes Text)
 */
export function findNodeByTextContent(craftJSON: CraftJSON, searchText: string): string | null {
  const normalizedSearch = searchText.toLowerCase().trim();
  
  for (const [nodeId, node] of Object.entries(craftJSON)) {
    if (node.type === 'Text' && node.props?.text) {
      const nodeText = node.props.text.toLowerCase().trim();
      if (nodeText.includes(normalizedSearch)) {
        return nodeId;
      }
    }
  }
  return null;
}

/**
 * Encontra nó pai de um elemento
 */
export function findParentNode(craftJSON: CraftJSON, targetNodeId: string): string | null {
  for (const [nodeId, node] of Object.entries(craftJSON)) {
    if (node.nodes && node.nodes.includes(targetNodeId)) {
      return nodeId;
    }
  }
  return null;
}

/**
 * Gera um ID único para novos nós
 */
export function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida se um nó existe no JSON
 */
export function nodeExists(craftJSON: CraftJSON, nodeId: string): boolean {
  return nodeId in craftJSON;
}

/**
 * Resolve o target de uma ação baseado no contexto
 */
export function resolveActionTarget(
  craftJSON: CraftJSON, 
  action: BuilderAction,
  userPrompt: string
): string | null {
  // Se o target é específico e existe, usar ele
  if (action.target !== 'new' && nodeExists(craftJSON, action.target)) {
    return action.target;
  }

  // Para ações de update, tentar encontrar por tipo de componente
  if (action.action === 'update' && action.component) {
    // Primeiro tentar por conteúdo de texto se mencionado
    const textMatches = userPrompt.match(/"([^"]+)"/g);
    if (textMatches && action.component === 'Text') {
      for (const match of textMatches) {
        const cleanText = match.replace(/"/g, '');
        const nodeId = findNodeByTextContent(craftJSON, cleanText);
        if (nodeId) return nodeId;
      }
    }

    // Depois tentar por tipo
    return findNodeByType(craftJSON, action.component);
  }

  // Para adições, o target será gerado na aplicação
  if (action.action === 'add') {
    return 'new';
  }

  return null;
}

/**
 * Determina o melhor parent para um novo elemento
 */
export function findBestParentForNewElement(
  craftJSON: CraftJSON,
  componentType: string
): string {
  // Para a maioria dos componentes, usar ROOT como padrão
  if (nodeExists(craftJSON, 'ROOT')) {
    return 'ROOT';
  }

  // Se não há ROOT, usar o primeiro Container disponível
  const containerNode = findNodeByType(craftJSON, 'Container');
  if (containerNode) {
    return containerNode;
  }

  // Fallback para qualquer nó que possa ter filhos
  for (const [nodeId, node] of Object.entries(craftJSON)) {
    if (node.nodes && Array.isArray(node.nodes)) {
      return nodeId;
    }
  }

  // Se nada for encontrado, criar estrutura básica será necessário
  return 'ROOT';
}

/**
 * Normaliza propriedades de cor
 */
export function normalizeColorProps(props: any): any {
  const normalized = { ...props };

  // Procurar por propriedades que podem ser cores
  const colorProps = ['color', 'background', 'backgroundColor', 'textColor', 'borderColor'];
  
  for (const prop of colorProps) {
    if (normalized[prop]) {
      // Se já é um objeto RGBA, converter para string CSS
      if (typeof normalized[prop] === 'object' && normalized[prop].r !== undefined) {
        const { r, g, b, a } = normalized[prop];
        if (a !== undefined && a !== 1) {
          normalized[prop] = `rgba(${r}, ${g}, ${b}, ${a})`;
        } else {
          normalized[prop] = `rgb(${r}, ${g}, ${b})`;
        }
      }
      // Se é string, tentar parsear e converter de volta
      else if (typeof normalized[prop] === 'string') {
        const parsedColor = parseColor(normalized[prop]);
        if (parsedColor) {
          const { r, g, b, a } = parsedColor;
          if (a !== undefined && a !== 1) {
            normalized[prop] = `rgba(${r}, ${g}, ${b}, ${a})`;
          } else {
            normalized[prop] = `rgb(${r}, ${g}, ${b})`;
          }
        }
      }
    }
  }

  // Mapear propriedades específicas para componentes
  if (normalized.text && !normalized.children) {
    normalized.children = normalized.text;
    delete normalized.text;
  }

  return normalized;
}

/**
 * Normaliza propriedades de tamanho
 */
export function normalizeSizeProps(props: any): any {
  const normalized = { ...props };

  // Procurar por propriedades que podem ser tamanhos
  const sizeProps = ['size', 'fontSize', 'width', 'height'];
  
  for (const prop of sizeProps) {
    if (normalized[prop] && typeof normalized[prop] === 'string') {
      const parsedSize = parseSize(normalized[prop]);
      if (parsedSize) {
        normalized[prop] = parsedSize;
      }
    }
  }

  return normalized;
}

/**
 * Valida propriedades contra o schema do componente
 */
export function validatePropsForComponent(componentType: string, props: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const componentDef = BUILDER_COMPONENTS[componentType];

  if (!componentDef) {
    return { valid: false, errors: [`Componente ${componentType} não encontrado`] };
  }

  // Validar props obrigatórias (se houver)
  for (const [propName, propDef] of Object.entries(componentDef.props)) {
    if (props[propName] !== undefined) {
      // Validar tipo
      const value = props[propName];
      switch (propDef.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${propName} deve ser string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${propName} deve ser número`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${propName} deve ser boolean`);
          }
          break;
        case 'color':
          if (!isValidRGBAColor(value)) {
            errors.push(`${propName} deve ser cor RGBA válida`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${propName} deve ser array`);
          }
          break;
        case 'select':
          if (propDef.options && !propDef.options.includes(value)) {
            errors.push(`${propName} deve ser um dos valores: ${propDef.options.join(', ')}`);
          }
          break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica se um valor é uma cor RGBA válida
 */
function isValidRGBAColor(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number' &&
    typeof value.a === 'number' &&
    value.r >= 0 && value.r <= 255 &&
    value.g >= 0 && value.g <= 255 &&
    value.b >= 0 && value.b <= 255 &&
    value.a >= 0 && value.a <= 1
  );
}

/**
 * Converte cor hexadecimal para RGBA
 */
export function hexToRGBA(hex: string, alpha: number = 1): RGBAColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: alpha
  };
}

/**
 * Converte RGBA para string CSS
 */
export function rgbaToCSS(rgba: RGBAColor): string {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

/**
 * Limpa propriedades inválidas ou vazias
 */
export function cleanProps(props: any): any {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Merge de propriedades preservando estruturas aninhadas
 */
export function mergeProps(existingProps: any, newProps: any): any {
  const merged = { ...existingProps };

  for (const [key, value] of Object.entries(newProps)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Para objetos aninhados (como cores), fazer merge profundo
      merged[key] = { ...merged[key], ...value };
    } else {
      // Para valores primitivos e arrays, substituir
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Extrai informações contextuais de um prompt
 */
export function extractPromptContext(prompt: string): {
  colors: string[];
  sizes: string[];
  components: string[];
  actions: string[];
  textContent: string[];
} {
  const lowercasePrompt = prompt.toLowerCase();

  // Extrair cores mencionadas
  const colors = Object.keys(parseColor('') ? {} : {}).filter(color => 
    lowercasePrompt.includes(color)
  );

  // Extrair tamanhos mencionados
  const sizes = Object.keys(parseSize('') ? {} : {}).filter(size => 
    lowercasePrompt.includes(size)
  );

  // Extrair componentes mencionados
  const components: string[] = [];
  for (const [componentName, def] of Object.entries(BUILDER_COMPONENTS)) {
    if (def.naturalLanguage.some(term => lowercasePrompt.includes(term))) {
      components.push(componentName);
    }
  }

  // Extrair ações mencionadas
  const actionWords = ['adicionar', 'criar', 'mudar', 'alterar', 'remover', 'deletar', 'centralizar', 'alinhar'];
  const actions = actionWords.filter(action => lowercasePrompt.includes(action));

  // Extrair conteúdo de texto entre aspas
  const textMatches = prompt.match(/"([^"]+)"/g) || [];
  const textContent = textMatches.map(match => match.replace(/"/g, ''));

  return { colors, sizes, components, actions, textContent };
}