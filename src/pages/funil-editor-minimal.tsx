import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Save, Type, Square, MousePointer, Plus, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

interface Element {
  id: string;
  type: 'text' | 'button' | 'container';
  content: string;
  styles: {
    fontSize?: number;
    fontWeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    padding?: number;
    margin?: number;
  };
  children?: Element[];
}

const defaultElements: Element[] = [
  {
    id: '1',
    type: 'text',
    content: 'Bem-vindo ao Editor de Funis',
    styles: {
      fontSize: 32,
      fontWeight: 700,
      textAlign: 'center',
      color: '#1f2937'
    }
  },
  {
    id: '2',
    type: 'text',
    content: 'Clique nos elementos para editá-los ou use os botões laterais para adicionar novos componentes.',
    styles: {
      fontSize: 16,
      textAlign: 'center',
      color: '#6b7280',
      margin: 20
    }
  },
  {
    id: '3',
    type: 'button',
    content: 'Call to Action',
    styles: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      padding: 12,
      margin: 20
    }
  }
];

export default function FunilEditorMinimal() {
  const [elements, setElements] = useState<Element[]>(defaultElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedElement = elements.find(el => el.id === selectedId);

  const addElement = (type: Element['type']) => {
    const newElement: Element = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Novo texto' : type === 'button' ? 'Novo botão' : 'Container',
      styles: {
        fontSize: type === 'text' ? 16 : undefined,
        backgroundColor: type === 'button' ? '#3b82f6' : type === 'container' ? '#f8fafc' : undefined,
        color: type === 'button' ? '#ffffff' : '#1f2937',
        padding: 12
      }
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateElementStyles = (id: string, styleUpdates: Partial<Element['styles']>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, styles: { ...el.styles, ...styleUpdates } } : el
    ));
  };

  const renderElement = (element: Element) => {
    const isSelected = selectedId === element.id;
    const isEditing = editingId === element.id;

    const baseStyles = {
      ...element.styles,
      cursor: 'pointer',
      border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
      borderRadius: '4px',
      position: 'relative' as const,
      minHeight: element.type === 'container' ? '100px' : 'auto'
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedId(element.id);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(element.id);
    };

    if (element.type === 'text') {
      return (
        <div
          key={element.id}
          style={baseStyles}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <Input
              value={element.content}
              onChange={(e) => updateElement(element.id, { content: e.target.value })}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
              autoFocus
              style={{
                fontSize: `${element.styles.fontSize}px`,
                fontWeight: element.styles.fontWeight,
                textAlign: element.styles.textAlign,
                color: element.styles.color
              }}
            />
          ) : (
            <div
              style={{
                fontSize: `${element.styles.fontSize}px`,
                fontWeight: element.styles.fontWeight,
                textAlign: element.styles.textAlign,
                color: element.styles.color,
                padding: `${element.styles.padding || 8}px`,
                margin: `${element.styles.margin || 0}px`
              }}
            >
              {element.content}
            </div>
          )}
        </div>
      );
    }

    if (element.type === 'button') {
      return (
        <div key={element.id} style={{ margin: `${element.styles.margin || 0}px` }}>
          {isEditing ? (
            <Input
              value={element.content}
              onChange={(e) => updateElement(element.id, { content: e.target.value })}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
              autoFocus
            />
          ) : (
            <button
              style={{
                backgroundColor: element.styles.backgroundColor,
                color: element.styles.color,
                padding: `${element.styles.padding || 12}px 24px`,
                border: isSelected ? '2px solid #3b82f6' : 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 500
              }}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
            >
              {element.content}
            </button>
          )}
        </div>
      );
    }

    if (element.type === 'container') {
      return (
        <div
          key={element.id}
          style={baseStyles}
          onClick={handleClick}
        >
          <div
            style={{
              backgroundColor: element.styles.backgroundColor,
              padding: `${element.styles.padding || 20}px`,
              margin: `${element.styles.margin || 0}px`,
              minHeight: '100px',
              borderRadius: '4px'
            }}
          >
            {isEditing ? (
              <Input
                value={element.content}
                onChange={(e) => updateElement(element.id, { content: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                autoFocus
              />
            ) : (
              <div>{element.content}</div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const handleSave = () => {
    console.log('Salvando página...', elements);
    // Aqui você implementaria a lógica de salvamento
  };

  const handlePreview = () => {
    console.log('Visualizando página...');
    // Aqui você implementaria a lógica de preview
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/funis">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Funis
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Editor de Funil</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Toolbox */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Elementos</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addElement('text')}
            >
              <Type className="w-4 h-4 mr-2" />
              Adicionar Texto
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addElement('button')}
            >
              <MousePointer className="w-4 h-4 mr-2" />
              Adicionar Botão
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => addElement('container')}
            >
              <Square className="w-4 h-4 mr-2" />
              Adicionar Container
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto" onClick={() => setSelectedId(null)}>
          <div className="bg-white rounded-lg shadow-sm min-h-full p-8">
            {elements.map(renderElement)}
          </div>
        </div>
        
        {/* Settings Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Propriedades</h3>
          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elemento: {selectedElement.type}
                </label>
                <p className="text-sm text-gray-500">
                  ID: {selectedElement.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo
                </label>
                <Textarea
                  value={selectedElement.content}
                  onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                  rows={3}
                />
              </div>

              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamanho da Fonte
                    </label>
                    <Input
                      type="number"
                      value={selectedElement.styles.fontSize || 16}
                      onChange={(e) => updateElementStyles(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alinhamento
                    </label>
                    <select
                      value={selectedElement.styles.textAlign || 'left'}
                      onChange={(e) => updateElementStyles(selectedElement.id, { textAlign: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor do Texto
                </label>
                <Input
                  type="color"
                  value={selectedElement.styles.color || '#000000'}
                  onChange={(e) => updateElementStyles(selectedElement.id, { color: e.target.value })}
                />
              </div>

              {(selectedElement.type === 'button' || selectedElement.type === 'container') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor de Fundo
                  </label>
                  <Input
                    type="color"
                    value={selectedElement.styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateElementStyles(selectedElement.id, { backgroundColor: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Espaçamento Interno
                </label>
                <Input
                  type="number"
                  value={selectedElement.styles.padding || 0}
                  onChange={(e) => updateElementStyles(selectedElement.id, { padding: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margem
                </label>
                <Input
                  type="number"
                  value={selectedElement.styles.margin || 0}
                  onChange={(e) => updateElementStyles(selectedElement.id, { margin: parseInt(e.target.value) })}
                />
              </div>

              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => deleteElement(selectedElement.id)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Elemento
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Clique em um elemento para editar suas propriedades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}