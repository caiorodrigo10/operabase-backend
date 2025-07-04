/**
 * Builder Transformer - Fase 2: Engine de Transformação JSON
 * Aplica ações do AI no JSON do Craft.js de forma segura
 */

import { BuilderAction, CraftJSON, CraftNode } from './types';
import { 
  generateNodeId, 
  nodeExists, 
  findBestParentForNewElement,
  resolveActionTarget,
  normalizeColorProps,
  normalizeSizeProps,
  validatePropsForComponent,
  mergeProps,
  cleanProps
} from './utils';
import { AI_DEV_CONSTANTS } from './index';

export class BuilderTransformer {
  /**
   * Aplica uma ação no JSON do Craft.js
   */
  applyAction(currentJSON: CraftJSON, action: BuilderAction, userPrompt: string = ''): CraftJSON {
    // Criar cópia profunda do JSON para não mutar o original
    const newJSON = this.deepClone(currentJSON);

    try {
      switch (action.action) {
        case 'update':
          return this.handleUpdateAction(newJSON, action, userPrompt);
        
        case 'add':
          return this.handleAddAction(newJSON, action);
        
        case 'remove':
          return this.handleRemoveAction(newJSON, action, userPrompt);
        
        default:
          throw new Error(`Ação não suportada: ${action.action}`);
      }
    } catch (error) {
      console.error('Erro ao aplicar ação:', error);
      // Retornar JSON original em caso de erro
      return currentJSON;
    }
  }

  /**
   * Manipula ação de atualização
   */
  private handleUpdateAction(json: CraftJSON, action: BuilderAction, userPrompt: string): CraftJSON {
    // Resolver target real
    const targetId = resolveActionTarget(json, action, userPrompt);
    
    if (!targetId || !nodeExists(json, targetId)) {
      throw new Error(`Target não encontrado para atualização: ${action.target}`);
    }

    const targetNode = json[targetId];
    
    // Normalizar props
    let normalizedProps = cleanProps(action.props);
    normalizedProps = normalizeColorProps(normalizedProps);
    normalizedProps = normalizeSizeProps(normalizedProps);

    // Validar props se possível
    if (targetNode.type) {
      const validation = validatePropsForComponent(targetNode.type, normalizedProps);
      if (!validation.valid) {
        console.warn('Props inválidas detectadas:', validation.errors);
        // Continuar mesmo assim, removendo props inválidas
        normalizedProps = this.filterValidProps(normalizedProps, targetNode.type);
      }
    }

    // Aplicar merge das propriedades
    const currentProps = targetNode.props || {};
    const mergedProps = mergeProps(currentProps, normalizedProps);

    // Atualizar o nó
    json[targetId] = {
      ...targetNode,
      props: mergedProps
    };

    return json;
  }

  /**
   * Manipula ação de adição
   */
  private handleAddAction(json: CraftJSON, action: BuilderAction): CraftJSON {
    if (!action.component) {
      throw new Error('Componente é obrigatório para ação add');
    }

    // Gerar ID único para o novo nó
    const prefix = AI_DEV_CONSTANTS.NODE_ID_PREFIXES[action.component as keyof typeof AI_DEV_CONSTANTS.NODE_ID_PREFIXES] || 'element';
    const newNodeId = generateNodeId(prefix);

    // Determinar parent
    const parentId = action.parentTarget || findBestParentForNewElement(json, action.component);
    
    if (!nodeExists(json, parentId)) {
      throw new Error(`Parent não encontrado: ${parentId}`);
    }

    // Normalizar props do novo elemento
    let normalizedProps = cleanProps(action.props);
    normalizedProps = normalizeColorProps(normalizedProps);
    normalizedProps = normalizeSizeProps(normalizedProps);

    // Validar props
    const validation = validatePropsForComponent(action.component, normalizedProps);
    if (!validation.valid) {
      console.warn('Props inválidas para novo componente:', validation.errors);
      normalizedProps = this.filterValidProps(normalizedProps, action.component);
    }

    // Criar novo nó
    const newNode: CraftNode = {
      type: action.component,
      props: normalizedProps,
      nodes: [],
      parent: parentId,
      displayName: action.component,
      custom: {},
      hidden: false,
      isCanvas: this.isCanvasComponent(action.component)
    };

    console.log('🆕 Creating new node:', {
      nodeId: newNodeId,
      component: action.component,
      parentId,
      props: normalizedProps,
      node: newNode
    });

    // Adicionar nó ao JSON
    json[newNodeId] = newNode;

    // Adicionar referência no parent
    const parentNode = json[parentId];
    console.log('👨‍👧‍👦 Parent node before update:', parentNode);
    
    if (parentNode.nodes) {
      parentNode.nodes.push(newNodeId);
    } else {
      parentNode.nodes = [newNodeId];
    }
    
    console.log('👨‍👧‍👦 Parent node after update:', parentNode);
    console.log('📊 Complete JSON after add:', json);

    return json;
  }

  /**
   * Manipula ação de remoção
   */
  private handleRemoveAction(json: CraftJSON, action: BuilderAction, userPrompt: string): CraftJSON {
    // Resolver target real
    const targetId = resolveActionTarget(json, action, userPrompt);
    
    if (!targetId || !nodeExists(json, targetId)) {
      throw new Error(`Target não encontrado para remoção: ${action.target}`);
    }

    // Não permitir remoção do ROOT
    if (targetId === 'ROOT') {
      throw new Error('Não é possível remover o elemento ROOT');
    }

    // Remover referências nos parents
    this.removeNodeReferences(json, targetId);

    // Remover nós filhos recursivamente
    this.removeNodeAndChildren(json, targetId);

    return json;
  }

  /**
   * Remove referências do nó em todos os parents
   */
  private removeNodeReferences(json: CraftJSON, nodeId: string): void {
    for (const [parentId, parentNode] of Object.entries(json)) {
      if (parentNode.nodes && parentNode.nodes.includes(nodeId)) {
        parentNode.nodes = parentNode.nodes.filter(id => id !== nodeId);
      }
    }
  }

  /**
   * Remove nó e todos os seus filhos recursivamente
   */
  private removeNodeAndChildren(json: CraftJSON, nodeId: string): void {
    const node = json[nodeId];
    if (!node) return;

    // Remover filhos primeiro
    if (node.nodes) {
      for (const childId of node.nodes) {
        this.removeNodeAndChildren(json, childId);
      }
    }

    // Remover o próprio nó
    delete json[nodeId];
  }

  /**
   * Verifica se um componente é canvas (pode ter filhos)
   */
  private isCanvasComponent(componentType: string): boolean {
    return ['Container', 'LandingCard', 'HeroSection'].includes(componentType);
  }

  /**
   * Filtra props válidas baseado no componente
   */
  private filterValidProps(props: any, componentType: string): any {
    // Por simplicidade, retornar todas as props
    // Em produção, implementar filtragem baseada na knowledge base
    return props;
  }

  /**
   * Cria cópia profunda de um objeto
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const copy: any = {};
      Object.keys(obj).forEach(key => {
        copy[key] = this.deepClone((obj as any)[key]);
      });
      return copy;
    }
    return obj;
  }

  /**
   * Valida integridade do JSON após transformação
   */
  validateJSON(json: CraftJSON): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verificar se ROOT existe
    if (!json.ROOT) {
      errors.push('Elemento ROOT não encontrado');
    }

    // Verificar referências órfãs
    const allNodeIds = Object.keys(json);
    
    for (const [nodeId, node] of Object.entries(json)) {
      // Verificar se filhos existem
      if (node.nodes) {
        for (const childId of node.nodes) {
          if (!allNodeIds.includes(childId)) {
            errors.push(`Referência órfã encontrada: ${nodeId} → ${childId}`);
          }
        }
      }

      // Verificar se parent existe (exceto ROOT)
      if (nodeId !== 'ROOT' && node.parent && !allNodeIds.includes(node.parent)) {
        errors.push(`Parent não encontrado para ${nodeId}: ${node.parent}`);
      }

      // Verificar se tipo é válido
      if (!node.type) {
        errors.push(`Nó sem tipo: ${nodeId}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Aplica múltiplas ações em sequência
   */
  applyMultipleActions(
    currentJSON: CraftJSON, 
    actions: BuilderAction[], 
    userPrompts: string[] = []
  ): { success: boolean; finalJSON: CraftJSON; errors: string[] } {
    let workingJSON = currentJSON;
    const errors: string[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const prompt = userPrompts[i] || '';

      try {
        workingJSON = this.applyAction(workingJSON, action, prompt);
        
        // Validar após cada ação
        const validation = this.validateJSON(workingJSON);
        if (!validation.valid) {
          errors.push(`Ação ${i}: ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Ação ${i}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        break; // Parar na primeira falha
      }
    }

    return {
      success: errors.length === 0,
      finalJSON: workingJSON,
      errors
    };
  }

  /**
   * Cria backup do estado antes da transformação
   */
  createBackup(json: CraftJSON): string {
    return JSON.stringify(json);
  }

  /**
   * Restaura backup
   */
  restoreBackup(backup: string): CraftJSON {
    return JSON.parse(backup);
  }
}

// Instância singleton do transformer
export const builderTransformer = new BuilderTransformer();