interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Dividir o texto em linhas para processar
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Títulos
      if (trimmedLine.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold mb-4 text-gray-900">
            {trimmedLine.substring(2)}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-xl font-semibold mb-3 text-gray-800 mt-6">
            {trimmedLine.substring(3)}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-lg font-medium mb-2 text-gray-700 mt-4">
            {trimmedLine.substring(4)}
          </h3>
        );
      }
      // Linhas em branco
      else if (trimmedLine === '') {
        elements.push(<div key={index} className="h-2"></div>);
      }
      // Listas
      else if (trimmedLine.startsWith('- ')) {
        const listContent = trimmedLine.substring(2);
        elements.push(
          <div key={index} className="flex items-start mb-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span className="text-gray-700">{processInlineFormatting(listContent)}</span>
          </div>
        );
      } else if (/^\d+\. /.test(trimmedLine)) {
        const listNumber = trimmedLine.match(/^(\d+)\. /)?.[1];
        const listContent = trimmedLine.replace(/^\d+\. /, '');
        elements.push(
          <div key={index} className="flex items-start mb-1">
            <span className="text-gray-500 mr-3 font-medium min-w-[20px]">{listNumber}.</span>
            <span className="text-gray-700">{processInlineFormatting(listContent)}</span>
          </div>
        );
      }
      // Texto normal
      else if (trimmedLine) {
        elements.push(
          <p key={index} className="text-gray-700 mb-2 leading-relaxed">
            {processInlineFormatting(trimmedLine)}
          </p>
        );
      }
    });

    return elements;
  };

  const processInlineFormatting = (text: string): JSX.Element => {
    // Processar formatação inline (negrito, itálico)
    let result = text;
    const parts: (string | JSX.Element)[] = [];
    let currentText = '';
    let i = 0;

    while (i < result.length) {
      if (result.substring(i, i + 2) === '**') {
        // Negrito
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const endIndex = result.indexOf('**', i + 2);
        if (endIndex !== -1) {
          const boldText = result.substring(i + 2, endIndex);
          parts.push(
            <strong key={`bold-${i}`} className="font-semibold text-gray-900">
              {boldText}
            </strong>
          );
          i = endIndex + 2;
        } else {
          currentText += result[i];
          i++;
        }
      } else if (result[i] === '*' && result[i + 1] !== '*') {
        // Itálico
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const endIndex = result.indexOf('*', i + 1);
        if (endIndex !== -1) {
          const italicText = result.substring(i + 1, endIndex);
          parts.push(
            <em key={`italic-${i}`} className="italic text-gray-800">
              {italicText}
            </em>
          );
          i = endIndex + 1;
        } else {
          currentText += result[i];
          i++;
        }
      } else {
        currentText += result[i];
        i++;
      }
    }

    if (currentText) {
      parts.push(currentText);
    }

    return (
      <>
        {parts.map((part, index) => 
          typeof part === 'string' ? part : part
        )}
      </>
    );
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderMarkdown(content)}
    </div>
  );
}