import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Widget {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'container' | 'spacer' | 'video' | 'title';
  content: any;
  style: any;
}

export interface TitleWidget extends Widget {
  type: 'title';
  content: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    color: string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    lineHeight: number;
    letterSpacing: number;
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecoration: 'none' | 'underline' | 'line-through';
    backgroundColor: string;
    fontStyle: 'normal' | 'italic';
    textShadow: string;
  };
}

export interface Column {
  id: string;
  type: 'column';
  width: number; // percentage 0-100
  widgets: Widget[];
  minHeight: string;
}

export interface Block {
  id: string;
  type: 'block';
  columns: Column[];
  style: {
    backgroundColor: string;
    padding: string;
    margin: string;
  };
}

export interface GlobalSettings {
  gridWidth: number;
  layoutStyle: 'full-width' | 'boxed';
}

export interface PageData {
  id: string;
  blocks: Block[];
  selectedElement: {
    type: 'block' | 'column' | 'widget' | null;
    id: string | null;
  };
}

// JSON Structure for Editor2 Pages
export interface Editor2PageJSON {
  id: string;
  version: string;
  metadata: {
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  layout: {
    type: 'grid' | 'flex';
    columns: number;
    gap: number;
  };
  globalSettings: GlobalSettings;
  blocks: Block[];
}

interface EditorState {
  // Page structure
  currentPage: PageData;
  
  // Global settings
  globalSettings: GlobalSettings;
  
  // UI state
  isResizing: boolean;
  resizingColumnId: string | null;
  hoveredElement: {
    type: 'block' | 'column' | 'widget' | null;
    id: string | null;
  };
  
  // Actions
  initializeDefaultPage: () => void;
  addBlock: (afterBlockId?: string) => void;
  addColumn: (blockId: string) => void;
  setColumnCount: (blockId: string, targetCount: number) => void;
  selectElement: (type: 'block' | 'column' | 'widget' | null, id: string | null) => void;
  deselectAll: () => void;
  setHoveredElement: (type: 'block' | 'column' | 'widget' | null, id: string | null) => void;
  updateColumnWidth: (columnId: string, width: number) => void;
  updateColumnWidths: (blockId: string, columnId: string, newWidth: number) => void;
  startResize: (columnId: string) => void;
  stopResize: () => void;
  removeColumn: (blockId: string, columnId: string) => void;
  removeBlock: (blockId: string) => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  
  // Widget Management Actions
  addWidget: (blockId: string, columnId: string, widgetType: Widget['type']) => void;
  updateWidget: (blockId: string, columnId: string, widgetId: string, widget: Widget) => void;
  removeWidget: (blockId: string, columnId: string, widgetId: string) => void;
  
  // JSON Management Actions
  serializeToJSON: () => Editor2PageJSON;
  deserializeFromJSON: (json: Editor2PageJSON) => void;
  loadPageFromServer: () => Promise<boolean>;
  savePageToServer: () => Promise<boolean>;
  
  // Craft.js Integration
  craftjsQuery: any;
  craftjsActions: any;
  setCraftjsQuery: (query: any) => void;
  setCraftjsActions: (actions: any) => void;
}

export const useEditor2Store = create<EditorState>((set, get) => ({
  currentPage: {
    id: 'page-1',
    blocks: [],
    selectedElement: {
      type: null,
      id: null,
    },
  },
  
  globalSettings: {
    gridWidth: 1100,
    layoutStyle: 'full-width',
  },
  
  isResizing: false,
  resizingColumnId: null,
  hoveredElement: {
    type: null,
    id: null,
  },
  
  initializeDefaultPage: () => {
    const state = get();
    if (state.currentPage.blocks.length === 0) {
      const defaultBlock: Block = {
        id: `block-${nanoid()}`,
        type: 'block',
        columns: [
          {
            id: `column-${nanoid()}`,
            type: 'column',
            width: 100,
            widgets: [],
            minHeight: '200px',
          },
        ],
        style: {
          backgroundColor: '#ffffff',
          padding: '2rem',
          margin: '0',
        },
      };
      
      set({
        currentPage: {
          ...state.currentPage,
          blocks: [defaultBlock],
          selectedElement: {
            type: 'column',
            id: defaultBlock.columns[0].id,
          },
        },
      });
    }
  },
  
  addBlock: (afterBlockId?: string) => {
    const state = get();
    const newBlock: Block = {
      id: `block-${nanoid()}`,
      type: 'block',
      columns: [
        {
          id: `column-${nanoid()}`,
          type: 'column',
          width: 100,
          widgets: [],
          minHeight: '200px',
        },
      ],
      style: {
        backgroundColor: '#ffffff',
        padding: '2rem',
        margin: '0',
      },
    };
    
    let newBlocks = [...state.currentPage.blocks];
    
    if (afterBlockId) {
      const index = newBlocks.findIndex(block => block.id === afterBlockId);
      if (index !== -1) {
        newBlocks.splice(index + 1, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
    } else {
      newBlocks.push(newBlock);
    }
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: newBlocks,
        selectedElement: {
          type: 'column',
          id: newBlock.columns[0].id,
        },
      },
    });

    // Auto-save to localStorage when blocks are added
    const updatedState = get();
    const pageJson = updatedState.serializeToJSON();
    localStorage.setItem('editor2_page_state', JSON.stringify(pageJson, null, 2));
    console.log('🔄 Auto-saved new block to localStorage');
  },
  
  addColumn: (blockId: string) => {
    const state = get();
    const newColumn: Column = {
      id: `column-${nanoid()}`,
      type: 'column',
      width: 50, // Default to 50% when adding new column
      widgets: [],
      minHeight: '200px',
    };
    
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        // Distribute width evenly among all columns
        const totalColumns = block.columns.length + 1;
        const newWidth = Math.floor(100 / totalColumns);
        const remainder = 100 - (newWidth * totalColumns);
        
        const updatedColumns = block.columns.map((col, index) => ({
          ...col,
          width: index === 0 ? newWidth + remainder : newWidth,
        }));
        
        return {
          ...block,
          columns: [...updatedColumns, { ...newColumn, width: newWidth }],
        };
      }
      return block;
    });
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
        selectedElement: {
          type: 'column',
          id: newColumn.id,
        },
      },
    });
  },
  
  selectElement: (type, id) => {
    set(state => ({
      currentPage: {
        ...state.currentPage,
        selectedElement: { type, id },
      },
    }));
  },
  
  deselectAll: () => {
    set(state => ({
      currentPage: {
        ...state.currentPage,
        selectedElement: { type: null, id: null },
      },
    }));
  },
  
  setHoveredElement: (type, id) => {
    set({ hoveredElement: { type, id } });
  },
  
  updateColumnWidth: (columnId: string, width: number) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => ({
      ...block,
      columns: block.columns.map(col => 
        col.id === columnId ? { ...col, width } : col
      ),
    }));
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
      },
    });
  },
  
  startResize: (columnId: string) => {
    set({ isResizing: true, resizingColumnId: columnId });
  },
  
  stopResize: () => {
    set({ isResizing: false, resizingColumnId: null });
  },
  
  setColumnCount: (blockId: string, targetCount: number) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        const currentCount = block.columns.length;
        
        if (targetCount === currentCount) {
          return block; // No change needed
        }
        
        let updatedColumns = [...block.columns];
        
        if (targetCount > currentCount) {
          // Add columns
          for (let i = currentCount; i < targetCount; i++) {
            const newColumn: Column = {
              id: `column-${nanoid()}`,
              type: 'column',
              width: 50,
              widgets: [],
              minHeight: '200px',
            };
            updatedColumns.push(newColumn);
          }
        } else {
          // Remove columns from the end
          updatedColumns = updatedColumns.slice(0, targetCount);
        }
        
        // Redistribute width evenly among all columns
        if (updatedColumns.length > 0) {
          const newWidth = Math.floor(100 / updatedColumns.length);
          const remainder = 100 - (newWidth * updatedColumns.length);
          
          updatedColumns = updatedColumns.map((col, index) => ({
            ...col,
            width: index === 0 ? newWidth + remainder : newWidth,
          }));
        }
        
        return {
          ...block,
          columns: updatedColumns,
        };
      }
      return block;
    });
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
      },
    });
  },
  
  updateColumnWidths: (blockId: string, columnId: string, newWidth: number) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        const columnIndex = block.columns.findIndex(col => col.id === columnId);
        if (columnIndex === -1) return block;
        
        const updatedColumns = [...block.columns];
        const currentColumn = updatedColumns[columnIndex];
        const oldWidth = currentColumn.width;
        const widthDiff = newWidth - oldWidth;
        
        // Update current column width
        updatedColumns[columnIndex] = { ...currentColumn, width: newWidth };
        
        // Find the next column (to the right) to adjust
        const nextColumnIndex = columnIndex + 1;
        if (nextColumnIndex < updatedColumns.length) {
          const nextColumn = updatedColumns[nextColumnIndex];
          const newNextWidth = Math.max(10, nextColumn.width - widthDiff);
          updatedColumns[nextColumnIndex] = { ...nextColumn, width: newNextWidth };
        }
        
        return { ...block, columns: updatedColumns };
      }
      return block;
    });
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
      },
    });
  },
  
  removeColumn: (blockId: string, columnId: string) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        const updatedColumns = block.columns.filter(col => col.id !== columnId);
        
        // Redistribute width evenly among remaining columns
        if (updatedColumns.length > 0) {
          const newWidth = Math.floor(100 / updatedColumns.length);
          const remainder = 100 - (newWidth * updatedColumns.length);
          
          return {
            ...block,
            columns: updatedColumns.map((col, index) => ({
              ...col,
              width: index === 0 ? newWidth + remainder : newWidth,
            })),
          };
        }
        
        return { ...block, columns: updatedColumns };
      }
      return block;
    });
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
        selectedElement: { type: null, id: null },
      },
    });
  },
  
  removeBlock: (blockId: string) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.filter(block => block.id !== blockId);
    
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
        selectedElement: { type: null, id: null },
      },
    });
  },
  
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => {
    const state = get();
    set({
      globalSettings: {
        ...state.globalSettings,
        ...settings,
      },
    });
  },

  addWidget: (blockId: string, columnId: string, widgetType: Widget['type']) => {
    const state = get();
    let newWidget: Widget;

    // Create widget based on type with default values
    if (widgetType === 'title') {
      newWidget = {
        id: `widget-${nanoid()}`,
        type: 'title',
        content: {
          text: 'Título Principal',
          level: 1,
        },
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 32,
          fontWeight: 'bold',
          color: '#333333',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0,
          textTransform: 'none',
          textDecoration: 'none',
          backgroundColor: 'transparent',
        },
      } as TitleWidget;
    } else {
      // Default widget for other types
      newWidget = {
        id: `widget-${nanoid()}`,
        type: widgetType,
        content: {},
        style: {},
      };
    }

    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          columns: block.columns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                widgets: [...column.widgets, newWidget],
              };
            }
            return column;
          }),
        };
      }
      return block;
    });

    // Update state first
    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
        selectedElement: { type: 'widget', id: newWidget.id },
      },
    });

    // Auto-save to localStorage immediately after state update (like Craft.js pattern)
    setTimeout(() => {
      const currentState = get();
      const pageJson = currentState.serializeToJSON();
      localStorage.setItem('editor2_page_state', JSON.stringify(pageJson, null, 2));
      console.log('🔄 Auto-saved widget to localStorage:', newWidget.type, pageJson);
    }, 0);
  },

  updateWidget: (blockId: string, columnId: string, widgetId: string, widget: Widget) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          columns: block.columns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                widgets: column.widgets.map(w => 
                  w.id === widgetId ? widget : w
                ),
              };
            }
            return column;
          }),
        };
      }
      return block;
    });

    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
      },
    });
  },

  removeWidget: (blockId: string, columnId: string, widgetId: string) => {
    const state = get();
    const updatedBlocks = state.currentPage.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          columns: block.columns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                widgets: column.widgets.filter(w => w.id !== widgetId),
              };
            }
            return column;
          }),
        };
      }
      return block;
    });

    set({
      currentPage: {
        ...state.currentPage,
        blocks: updatedBlocks,
        selectedElement: { type: null, id: null },
      },
    });
  },

  // JSON Management Actions
  serializeToJSON: () => {
    const state = get();
    const pageJson: Editor2PageJSON = {
      id: state.currentPage.id,
      version: '1.0.0',
      metadata: {
        title: 'Página de Obrigado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      layout: {
        type: 'grid',
        columns: 3,
        gap: 20,
      },
      globalSettings: state.globalSettings,
      blocks: state.currentPage.blocks,
    };
    return pageJson;
  },

  deserializeFromJSON: (json: Editor2PageJSON) => {
    set(state => ({
      currentPage: {
        ...state.currentPage,
        id: json.id,
        blocks: json.blocks,
        selectedElement: { type: null, id: null },
      },
      globalSettings: json.globalSettings,
    }));
  },

  loadPageFromServer: async () => {
    try {
      const response = await fetch('/api/load-page-json/editor2');
      const result = await response.json();
      
      if (result.success && result.data) {
        const pageJson: Editor2PageJSON = JSON.parse(result.data);
        get().deserializeFromJSON(pageJson);
        console.log('📂 Editor2 page loaded from server');
        return true;
      } else {
        // Try localStorage fallback
        const savedState = localStorage.getItem('editor2_page_state');
        if (savedState) {
          const pageJson: Editor2PageJSON = JSON.parse(savedState);
          get().deserializeFromJSON(pageJson);
          console.log('📂 Editor2 page loaded from localStorage');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading Editor2 page:', error);
      return false;
    }
  },

  savePageToServer: async () => {
    try {
      const pageJson = get().serializeToJSON();
      const jsonString = JSON.stringify(pageJson, null, 2);
      
      // Save to localStorage first
      localStorage.setItem('editor2_page_state', jsonString);
      
      // Get auth token
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/save-page-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          pageId: 'editor2',
          jsonData: jsonString
        })
      });
      
      if (response.ok) {
        console.log('✅ Editor2 page saved to server');
        return true;
      } else {
        console.error('❌ Failed to save Editor2 page to server');
        return false;
      }
    } catch (error) {
      console.error('Error saving Editor2 page:', error);
      return false;
    }
  },

  // Craft.js Integration state
  craftjsQuery: null,
  craftjsActions: null,

  // Craft.js Integration functions
  setCraftjsQuery: (query: any) => {
    set({ craftjsQuery: query });
  },

  setCraftjsActions: (actions: any) => {
    set({ craftjsActions: actions });
  },
}));