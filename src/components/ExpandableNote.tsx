import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableNoteProps {
  content: string;
  maxHeight?: number;
  className?: string;
}

export default function ExpandableNote({ content, maxHeight = 150, className = "" }: ExpandableNoteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Converter markdown para HTML
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return "";
    
    // Primeiro, limpar caracteres de escape problemáticos
    let cleaned = markdown
      .replace(/\\n\\n/g, '\n\n')
      .replace(/\\n/g, '\n')
      .replace(/\\\//g, '/')
      .replace(/\\\*/g, '*');
    
    return cleaned
      // Títulos com espaçamento adequado
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; color: #374151; line-height: 1.4;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.5rem; font-weight: 700; margin: 2rem 0 1rem 0; color: #1f2937; line-height: 1.3;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.75rem; font-weight: 800; margin: 2rem 0 1.5rem 0; color: #111827; line-height: 1.2;">$1</h1>')
      
      // Negrito e itálico
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #111827;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #374151;">$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<span style="text-decoration: underline;">$1</span>')
      
      // Listas não ordenadas
      .replace(/^- (.*$)/gim, '<li style="margin: 0.5rem 0; line-height: 1.6;">$1</li>')
      
      // Listas ordenadas
      .replace(/^(\d+)\. (.*$)/gim, '<li style="margin: 0.5rem 0; line-height: 1.6;">$2</li>')
      
      // Citações
      .replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1.5rem 0; color: #6b7280; font-style: italic; background: #f8fafc; padding: 1rem;">$1</blockquote>')
      
      // Quebras de linha duplas para parágrafos
      .replace(/\n\n/g, '</p><p style="margin: 1rem 0; line-height: 1.6; color: #374151;">')
      .replace(/\n/g, '<br style="margin: 0.25rem 0;">')
      
      // Processar listas primeiro
      .replace(/(<li[^>]*>.*?<\/li>(\s*<br[^>]*>)*\s*)+/g, (match) => {
        const cleanMatch = match.replace(/<br[^>]*>/g, '');
        if (match.includes('1.') || /^\d+\./.test(match)) {
          return `<ol style="margin: 1.5rem 0; padding-left: 2rem; list-style-type: decimal; color: #374151;">${cleanMatch}</ol>`;
        } else {
          return `<ul style="margin: 1.5rem 0; padding-left: 2rem; list-style-type: disc; color: #374151;">${cleanMatch}</ul>`;
        }
      })
      
      // Envolver texto restante em parágrafos
      .replace(/^(?!<[hl]|<li|<ul|<ol|<blockquote|<p|<\/p)(.+)$/gim, '<p style="margin: 1rem 0; line-height: 1.6; color: #374151;">$1</p>')
      
      // Limpar formatação excessiva
      .replace(/<br[^>]*><br[^>]*>/g, '<br>')
      .replace(/<p[^>]*><\/p>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Verificar se precisa de expansão após renderização
  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      if (element.scrollHeight > maxHeight) {
        setNeedsExpansion(true);
      }
    }
  }, [content, maxHeight]);

  return (
    <div className="space-y-2">
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
          position: 'relative'
        }}
      >
        <div 
          className={`${className}`}
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          style={{
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        />
        
        {/* Gradiente de fade quando não expandido */}
        {needsExpansion && !isExpanded && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"
          />
        )}
      </div>
      
      {needsExpansion && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Ver mais
            </>
          )}
        </Button>
      )}
    </div>
  );
}