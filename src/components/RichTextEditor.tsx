import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [editorHtml, setEditorHtml] = useState(value || "");

  // Configuração simplificada da toolbar
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'blockquote'
  ];

  // Lidar com mudanças - conversão simples HTML para markdown
  const handleChange = (content: string) => {
    setEditorHtml(content);
    
    // Conversão básica HTML para markdown para compatibilidade
    const markdown = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n');
      })
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/g, () => `${counter++}. $1\n`);
      })
      .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    onChange(markdown);
  };

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={editorHtml}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{
          height: '400px',
          marginBottom: '42px'
        }}
      />
      
      <style>{`
        .ql-toolbar {
          border-top: 1px solid #ccc;
          border-left: 1px solid #ccc;
          border-right: 1px solid #ccc;
          border-radius: 8px 8px 0 0;
          background: #f9fafb;
        }
        
        .ql-container {
          border-bottom: 1px solid #ccc;
          border-left: 1px solid #ccc;
          border-right: 1px solid #ccc;
          border-radius: 0 0 8px 8px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .ql-editor {
          line-height: 1.6;
          font-size: 14px;
          color: #374151;
        }
        
        .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        
        .ql-editor h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 1rem 0;
        }
        
        .ql-editor h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0.75rem 0;
        }
        
        .ql-editor h3 {
          font-size: 1.125rem;
          font-weight: 500;
          color: #374151;
          margin: 0.5rem 0;
        }
        
        .ql-editor strong {
          font-weight: 600;
          color: #111827;
        }
        
        .ql-editor em {
          color: #374151;
        }
        
        .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
          background: #f8fafc;
        }
        
        .ql-editor ul, .ql-editor ol {
          padding-left: 1.5rem;
        }
        
        .ql-editor li {
          margin: 0.25rem 0;
        }
        
        .ql-editor p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}