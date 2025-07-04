export interface ToolItem {
  id: string;
  icon: string;
  label: string;
}

export interface EditorState {
  selectedTool: string | null;
  canvasContent: any;
}

export interface CanvasProps {
  content?: any;
}

export interface SidebarProps {
  selectedTool?: string;
  onToolSelect?: (toolId: string) => void;
}