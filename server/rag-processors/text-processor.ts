import { ProcessedChunk } from './pdf-processor';

export class TextProcessor {
  private readonly MAX_CHUNK_SIZE = 400;
  private readonly CHUNK_OVERLAP = 50;

  async processText(content: string, documentId: number): Promise<ProcessedChunk[]> {
    try {
      console.log(`📝 Processando texto para documento ${documentId}`);
      
      const cleanedContent = this.cleanText(content);
      return await this.chunkContent(cleanedContent, documentId);
    } catch (error) {
      console.error('❌ Erro ao processar texto:', error);
      throw new Error(`Falha no processamento de texto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Normalizar espaços em branco
      .replace(/\s+/g, ' ')
      // Remover múltiplas quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      // Remover caracteres especiais problemáticos
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalizar quebras de linha
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Limpar espaços
      .trim();
  }

  private async chunkContent(content: string, documentId: number): Promise<ProcessedChunk[]> {
    try {
      console.log(`🔪 Dividindo texto em chunks para documento ${documentId}`);
      
      const chunks: ProcessedChunk[] = [];
      const paragraphs = this.splitIntoParagraphs(content);
      
      let currentChunk = '';
      let currentTokens = 0;
      let chunkIndex = 0;
      let startOffset = 0;

      for (const paragraph of paragraphs) {
        const paragraphTokens = this.countTokens(paragraph);
        
        // Se o parágrafo é muito grande, divida-o
        if (paragraphTokens > this.MAX_CHUNK_SIZE) {
          // Salvar chunk atual se não estiver vazio
          if (currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk, chunkIndex++, startOffset, startOffset + currentChunk.length));
            startOffset += currentChunk.length;
          }
          
          // Dividir parágrafo grande
          const subChunks = this.splitLargeParagraph(paragraph);
          for (const subChunk of subChunks) {
            chunks.push(this.createChunk(subChunk, chunkIndex++, startOffset, startOffset + subChunk.length));
            startOffset += subChunk.length;
          }
          
          currentChunk = '';
          currentTokens = 0;
          continue;
        }
        
        // Verificar se adicionar este parágrafo excederia o limite
        if (currentTokens + paragraphTokens > this.MAX_CHUNK_SIZE && currentChunk.trim()) {
          // Salvar chunk atual
          chunks.push(this.createChunk(currentChunk, chunkIndex++, startOffset, startOffset + currentChunk.length));
          
          // Criar overlap
          const overlapText = this.createOverlap(currentChunk);
          startOffset += currentChunk.length - overlapText.length;
          currentChunk = overlapText + '\n\n' + paragraph;
          currentTokens = this.countTokens(currentChunk);
        } else {
          // Adicionar parágrafo ao chunk atual
          if (currentChunk.trim()) {
            currentChunk += '\n\n' + paragraph;
          } else {
            currentChunk = paragraph;
          }
          currentTokens += paragraphTokens;
        }
      }
      
      // Salvar último chunk
      if (currentChunk.trim()) {
        chunks.push(this.createChunk(currentChunk, chunkIndex, startOffset, startOffset + currentChunk.length));
      }

      console.log(`✅ Criados ${chunks.length} chunks para texto ${documentId}`);
      return chunks;
    } catch (error) {
      console.error('❌ Erro ao criar chunks do texto:', error);
      throw new Error(`Falha na criação de chunks: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private splitIntoParagraphs(content: string): string[] {
    return content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 10); // Filtrar parágrafos muito pequenos
  }

  private splitLargeParagraph(paragraph: string): string[] {
    const sentences = paragraph.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const testChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
      
      if (this.countTokens(testChunk) > this.MAX_CHUNK_SIZE && currentChunk) {
        chunks.push(currentChunk + '.');
        currentChunk = sentence;
      } else {
        currentChunk = testChunk;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks.length > 0 ? chunks : [paragraph];
  }

  private createOverlap(chunk: string): string {
    const words = chunk.split(' ');
    const overlapWords = Math.min(this.CHUNK_OVERLAP, Math.floor(words.length * 0.2));
    return words.slice(-overlapWords).join(' ');
  }

  private createChunk(content: string, index: number, startOffset: number, endOffset: number): ProcessedChunk {
    return {
      content: content.trim(),
      chunkIndex: index,
      tokenCount: this.countTokens(content),
      metadata: {
        startOffset,
        endOffset,
        type: 'paragraph'
      }
    };
  }

  private countTokens(text: string): number {
    // Usar o mesmo método do EmbeddingService (1 token ≈ 4 caracteres)
    return Math.ceil(text.length / 4);
  }
}