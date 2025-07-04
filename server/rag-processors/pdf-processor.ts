import fs from 'fs';
import path from 'path';

// Import pdf-parse using CommonJS require with proper ESM compatibility
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function getPdfParser() {
  try {
    return require('pdf-parse');
  } catch (error) {
    console.error('Error importing pdf-parse:', error);
    throw new Error('Failed to load PDF processing library');
  }
}

export interface ProcessedChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    pageNumber?: number;
    startOffset: number;
    endOffset: number;
    type: 'paragraph' | 'section' | 'text';
  };
}

export class PDFProcessor {
  private readonly MAX_CHUNK_SIZE = 400;
  private readonly CHUNK_OVERLAP = 50;

  async extractText(filePath: string): Promise<string> {
    try {
      console.log(`📄 Extraindo texto do PDF: ${filePath}`);
      
      // Initialize pdf-parse
      const pdfParseLib = getPdfParser();
      
      // Normalize and validate file path
      const normalizedPath = path.resolve(filePath);
      
      if (!fs.existsSync(normalizedPath)) {
        console.error(`❌ Arquivo PDF não encontrado: ${normalizedPath}`);
        throw new Error(`Arquivo PDF não encontrado: ${filePath}`);
      }

      // Check if it's actually a file
      const stats = fs.statSync(normalizedPath);
      if (!stats.isFile()) {
        throw new Error(`Caminho não é um arquivo: ${filePath}`);
      }

      const dataBuffer = fs.readFileSync(normalizedPath);
      const pdfData = await pdfParseLib(dataBuffer);
      
      console.log(`✅ PDF processado: ${pdfData.numpages} páginas, ${pdfData.text.length} caracteres`);
      
      return this.cleanText(pdfData.text);
    } catch (error) {
      console.error('❌ Erro ao extrair texto do PDF:', error);
      throw new Error(`Falha na extração do PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Remove múltiplas quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      // Remove espaços múltiplos
      .replace(/[ \t]{2,}/g, ' ')
      // Remove caracteres especiais problemáticos
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normaliza quebras de linha
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove espaços no início e fim
      .trim();
  }

  async chunkContent(content: string, documentId: number): Promise<ProcessedChunk[]> {
    try {
      console.log(`🔪 Dividindo conteúdo em chunks para documento ${documentId}`);
      
      const chunks: ProcessedChunk[] = [];
      const paragraphs = this.splitIntoParagraphs(content);
      
      let currentChunk = '';
      let currentTokens = 0;
      let chunkIndex = 0;
      let startOffset = 0;

      for (const paragraph of paragraphs) {
        const paragraphTokens = this.countTokens(paragraph);
        
        // Se o parágrafo sozinho é muito grande, divida-o
        if (paragraphTokens > this.MAX_CHUNK_SIZE) {
          // Salvar chunk atual se não estiver vazio
          if (currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk, chunkIndex++, startOffset, startOffset + currentChunk.length));
            startOffset += currentChunk.length;
          }
          
          // Dividir parágrafo grande
          const subChunks = this.splitLargeParagraph(paragraph, documentId);
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
          
          // Criar overlap se possível
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
      
      // Salvar último chunk se não estiver vazio
      if (currentChunk.trim()) {
        chunks.push(this.createChunk(currentChunk, chunkIndex, startOffset, startOffset + currentChunk.length));
      }

      console.log(`✅ Criados ${chunks.length} chunks para documento ${documentId}`);
      return chunks;
    } catch (error) {
      console.error('❌ Erro ao criar chunks:', error);
      throw new Error(`Falha na criação de chunks: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private splitIntoParagraphs(content: string): string[] {
    return content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  private splitLargeParagraph(paragraph: string, documentId: number): string[] {
    console.log(`📏 Dividindo parágrafo grande (${paragraph.length} chars) do documento ${documentId}`);
    
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
    
    return chunks;
  }

  private createOverlap(chunk: string): string {
    const words = chunk.split(' ');
    const overlapWords = Math.min(this.CHUNK_OVERLAP, Math.floor(words.length * 0.1));
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
        type: 'text'
      }
    };
  }

  private countTokens(text: string): number {
    // Aproximação baseada em palavras (1.3 tokens por palavra em média)
    return Math.ceil(text.split(' ').length * 1.3);
  }
}