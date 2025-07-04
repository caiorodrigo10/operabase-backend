/**
 * Knowledge Base do Landing Page Builder
 * Mapeamento completo de todos os componentes, props e funcionalidades
 */

export interface ComponentProp {
  type: 'string' | 'number' | 'color' | 'array' | 'boolean' | 'select';
  example?: any;
  options?: string[];
  description?: string;
}

export interface ComponentDefinition {
  description: string;
  props: Record<string, ComponentProp>;
  naturalLanguage: string[];
  examples: string[];
}

export const BUILDER_COMPONENTS: Record<string, ComponentDefinition> = {
  Container: {
    description: "Layout container with flex properties, padding, margin and background",
    props: {
      width: { 
        type: 'string', 
        example: '100%', 
        description: 'Width of container (px, %, auto)' 
      },
      height: { 
        type: 'string', 
        example: 'auto', 
        description: 'Height of container (px, %, auto)' 
      },
      background: { 
        type: 'color', 
        example: { r: 255, g: 255, b: 255, a: 1 },
        description: 'Background color in RGBA format' 
      },
      padding: { 
        type: 'array', 
        example: ['20', '20', '20', '20'],
        description: 'Padding [top, right, bottom, left] in pixels' 
      },
      margin: { 
        type: 'array', 
        example: ['0', '0', '0', '0'],
        description: 'Margin [top, right, bottom, left] in pixels' 
      },
      flexDirection: { 
        type: 'select', 
        options: ['row', 'column'],
        example: 'column',
        description: 'Direction of flex layout' 
      },
      justifyContent: { 
        type: 'select', 
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
        example: 'flex-start',
        description: 'Horizontal alignment of children' 
      },
      alignItems: { 
        type: 'select', 
        options: ['flex-start', 'center', 'flex-end', 'stretch'],
        example: 'flex-start',
        description: 'Vertical alignment of children' 
      }
    },
    naturalLanguage: [
      'container', 'section', 'div', 'layout', 'wrapper', 'box', 'area'
    ],
    examples: [
      'Criar um container com fundo azul',
      'Adicionar uma seção centralizada',
      'Fazer um wrapper com padding de 40px'
    ]
  },

  Text: {
    description: "Text element with formatting options",
    props: {
      text: { 
        type: 'string', 
        example: 'Sample text',
        description: 'The text content to display' 
      },
      fontSize: { 
        type: 'string', 
        example: '16',
        description: 'Font size in pixels' 
      },
      color: { 
        type: 'color', 
        example: { r: 0, g: 0, b: 0, a: 1 },
        description: 'Text color in RGBA format' 
      },
      textAlign: { 
        type: 'select', 
        options: ['left', 'center', 'right', 'justify'],
        example: 'left',
        description: 'Text alignment' 
      },
      fontWeight: { 
        type: 'select', 
        options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
        example: 'normal',
        description: 'Font weight' 
      },
      lineHeight: { 
        type: 'string', 
        example: '1.5',
        description: 'Line height multiplier' 
      }
    },
    naturalLanguage: [
      'text', 'title', 'heading', 'paragraph', 'label', 'caption', 'subtitle'
    ],
    examples: [
      'Mudar o texto para azul',
      'Criar um título centralizado',
      'Adicionar um parágrafo em negrito'
    ]
  },

  Button: {
    description: "Customizable button with styles and colors",
    props: {
      children: { 
        type: 'string', 
        example: 'Click me',
        description: 'Button text content' 
      },
      size: { 
        type: 'select', 
        options: ['sm', 'default', 'lg'],
        example: 'default',
        description: 'Button size' 
      },
      variant: { 
        type: 'select', 
        options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        example: 'default',
        description: 'Button style variant' 
      },
      textColor: { 
        type: 'string', 
        example: '#ffffff',
        description: 'Button text color in hex format' 
      },
      backgroundColor: { 
        type: 'string', 
        example: '#3b82f6',
        description: 'Button background color in hex format' 
      }
    },
    naturalLanguage: [
      'button', 'btn', 'botão', 'link', 'action', 'call-to-action', 'cta'
    ],
    examples: [
      'Criar um botão verde',
      'Adicionar botão de call-to-action',
      'Fazer um botão outline vermelho'
    ]
  },

  Video: {
    description: "Video component with YouTube integration",
    props: {
      videoId: { 
        type: 'string', 
        example: 'dQw4w9WgXcQ',
        description: 'YouTube video ID' 
      },
      width: { 
        type: 'string', 
        example: '100%',
        description: 'Video width' 
      },
      height: { 
        type: 'string', 
        example: '315',
        description: 'Video height in pixels' 
      }
    },
    naturalLanguage: [
      'video', 'vídeo', 'youtube', 'player', 'media'
    ],
    examples: [
      'Adicionar um vídeo do YouTube',
      'Inserir player de vídeo',
      'Colocar vídeo responsivo'
    ]
  },

  LandingCard: {
    description: "Custom card component with shadow and rounded corners",
    props: {
      background: { 
        type: 'color', 
        example: { r: 255, g: 255, b: 255, a: 1 },
        description: 'Card background color in RGBA format' 
      },
      padding: { 
        type: 'number', 
        example: 20,
        description: 'Card padding in pixels' 
      }
    },
    naturalLanguage: [
      'card', 'cartão', 'box', 'panel', 'widget'
    ],
    examples: [
      'Criar um card com sombra',
      'Adicionar cartão de conteúdo',
      'Fazer um panel destacado'
    ]
  },

  HeroSection: {
    description: "Hero section with title, subtitle and call-to-action",
    props: {
      title: { 
        type: 'string', 
        example: 'Welcome to our product',
        description: 'Main hero title' 
      },
      subtitle: { 
        type: 'string', 
        example: 'Discover amazing features',
        description: 'Hero subtitle or description' 
      },
      buttonText: { 
        type: 'string', 
        example: 'Get Started',
        description: 'Call-to-action button text' 
      },
      background: { 
        type: 'color', 
        example: { r: 59, g: 130, b: 246, a: 1 },
        description: 'Hero background color in RGBA format' 
      }
    },
    naturalLanguage: [
      'hero', 'banner', 'header', 'intro', 'welcome', 'cover'
    ],
    examples: [
      'Criar seção hero azul',
      'Adicionar banner de boas-vindas',
      'Fazer header com call-to-action'
    ]
  },

  VideoComponent: {
    description: "Advanced video component with multiple sources",
    props: {
      src: { 
        type: 'string', 
        example: 'https://example.com/video.mp4',
        description: 'Video source URL' 
      },
      width: { 
        type: 'string', 
        example: '100%',
        description: 'Video width' 
      },
      height: { 
        type: 'string', 
        example: '400',
        description: 'Video height in pixels' 
      },
      autoplay: { 
        type: 'boolean', 
        example: false,
        description: 'Auto-play video on load' 
      },
      controls: { 
        type: 'boolean', 
        example: true,
        description: 'Show video controls' 
      }
    },
    naturalLanguage: [
      'video', 'vídeo', 'player', 'media', 'stream'
    ],
    examples: [
      'Adicionar vídeo com controles',
      'Inserir player de vídeo customizado',
      'Criar vídeo auto-play'
    ]
  }
};

// Mapeamento de cores comuns para linguagem natural
export const COLOR_MAP: Record<string, { r: number; g: number; b: number; a: number }> = {
  'azul': { r: 59, g: 130, b: 246, a: 1 },
  'blue': { r: 59, g: 130, b: 246, a: 1 },
  'vermelho': { r: 239, g: 68, b: 68, a: 1 },
  'red': { r: 239, g: 68, b: 68, a: 1 },
  'verde': { r: 34, g: 197, b: 94, a: 1 },
  'green': { r: 34, g: 197, b: 94, a: 1 },
  'amarelo': { r: 251, g: 191, b: 36, a: 1 },
  'yellow': { r: 251, g: 191, b: 36, a: 1 },
  'roxo': { r: 147, g: 51, b: 234, a: 1 },
  'purple': { r: 147, g: 51, b: 234, a: 1 },
  'rosa': { r: 236, g: 72, b: 153, a: 1 },
  'pink': { r: 236, g: 72, b: 153, a: 1 },
  'preto': { r: 0, g: 0, b: 0, a: 1 },
  'black': { r: 0, g: 0, b: 0, a: 1 },
  'branco': { r: 255, g: 255, b: 255, a: 1 },
  'white': { r: 255, g: 255, b: 255, a: 1 },
  'cinza': { r: 107, g: 114, b: 128, a: 1 },
  'gray': { r: 107, g: 114, b: 128, a: 1 },
  'grey': { r: 107, g: 114, b: 128, a: 1 }
};

// Mapeamento de tamanhos comuns
export const SIZE_MAP: Record<string, string> = {
  'pequeno': 'small',
  'small': 'small',
  'médio': 'medium',
  'medio': 'medium',
  'medium': 'medium',
  'grande': 'large',
  'large': 'large'
};

// Funções auxiliares para parsing
export function parseColor(colorInput: string): { r: number; g: number; b: number; a: number } | null {
  const normalizedInput = colorInput.toLowerCase().trim();
  return COLOR_MAP[normalizedInput] || null;
}

export function parseSize(sizeInput: string): string | null {
  const normalizedInput = sizeInput.toLowerCase().trim();
  return SIZE_MAP[normalizedInput] || null;
}

export function findComponentByNaturalLanguage(input: string): string | null {
  const normalizedInput = input.toLowerCase().trim();
  
  for (const [componentName, definition] of Object.entries(BUILDER_COMPONENTS)) {
    if (definition.naturalLanguage.some(term => normalizedInput.includes(term))) {
      return componentName;
    }
  }
  
  return null;
}