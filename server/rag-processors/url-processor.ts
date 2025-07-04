import https from 'https';
import http from 'http';
import * as cheerio from 'cheerio';
import { createGunzip } from 'zlib';
import { ProcessedChunk } from './pdf-processor';

export class URLProcessor {
  private readonly MAX_CHUNK_SIZE = 400;
  private readonly CHUNK_OVERLAP = 50;

  async extractContent(url: string): Promise<string> {
    try {
      console.log(`🌐 Extraindo conteúdo da URL: ${url}`);
      
      // Validar URL
      new URL(url);
      
      // Buscar HTML usando Node.js nativo
      const html = await this.fetchHTML(url);
      
      // Processar HTML com Cheerio
      const cleanedContent = this.extractTextFromHTML(html, url);
      
      console.log(`✅ Conteúdo extraído: ${cleanedContent.length} caracteres`);
      return cleanedContent;

    } catch (error) {
      console.error('❌ Erro ao extrair conteúdo da URL:', error);
      throw new Error(`Falha na extração da URL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async fetchHTML(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      };

      const req = protocol.request(options, (res) => {
        let data = '';

        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return this.fetchHTML(redirectUrl).then(resolve).catch(reject);
        }

        if (res.statusCode && res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        // Set encoding to utf8 for text responses
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private extractTextFromHTML(html: string, url: string): string {
    const $ = cheerio.load(html);

    // Remover elementos desnecessários
    $('script, style, nav, header, footer, aside, .navigation, .menu, .sidebar, .advertisement, .ads, .social, .share, .comments').remove();
    
    // Remover elementos por id/class comuns
    $('#header, #footer, #navigation, #sidebar, #menu, .header, .footer, .nav, .menu, .sidebar, .ad, .advertisement').remove();

    let content = '';
    
    // Tentar extrair de elementos semânticos primeiro
    const articleContent = $('article, main, .content, .post, .entry, [role="main"]').first();
    
    if (articleContent.length > 0) {
      content = articleContent.text();
    } else {
      // Fallback: extrair do body
      content = $('body').text();
    }

    // Limpar e formatar texto
    return this.cleanExtractedText(content, url);
  }

  private cleanExtractedText(text: string, url: string): string {
    return text
      // Normalizar espaços em branco
      .replace(/\s+/g, ' ')
      // Remover múltiplas quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      // Remover caracteres especiais problemáticos
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remover padrões comuns de navegação
      .replace(/\b(Menu|Navigation|Skip to|Copyright|All rights reserved)\b/gi, '')
      // Remover URLs soltas
      .replace(/https?:\/\/[^\s]+/g, '')
      // Limpar espaços
      .trim();
  }

  async chunkContent(content: string, documentId: number, sourceUrl?: string): Promise<ProcessedChunk[]> {
    try {
      console.log(`🔪 Dividindo conteúdo URL em chunks para documento ${documentId}`);
      
      const chunks: ProcessedChunk[] = [];
      
      // Dividir por seções/parágrafos
      const sections = this.splitIntoSections(content);
      
      let currentChunk = '';
      let currentTokens = 0;
      let chunkIndex = 0;
      let startOffset = 0;

      for (const section of sections) {
        const sectionTokens = this.countTokens(section);
        
        // Se a seção é muito grande, divida-a
        if (sectionTokens > this.MAX_CHUNK_SIZE) {
          // Salvar chunk atual se não estiver vazio
          if (currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk, chunkIndex++, startOffset, startOffset + currentChunk.length, sourceUrl));
            startOffset += currentChunk.length;
          }
          
          // Dividir seção grande
          const subChunks = this.splitLargeSection(section);
          for (const subChunk of subChunks) {
            chunks.push(this.createChunk(subChunk, chunkIndex++, startOffset, startOffset + subChunk.length, sourceUrl));
            startOffset += subChunk.length;
          }
          
          currentChunk = '';
          currentTokens = 0;
          continue;
        }
        
        // Verificar se adicionar esta seção excederia o limite
        if (currentTokens + sectionTokens > this.MAX_CHUNK_SIZE && currentChunk.trim()) {
          // Salvar chunk atual
          chunks.push(this.createChunk(currentChunk, chunkIndex++, startOffset, startOffset + currentChunk.length, sourceUrl));
          
          // Criar overlap
          const overlapText = this.createOverlap(currentChunk);
          startOffset += currentChunk.length - overlapText.length;
          currentChunk = overlapText + '\n\n' + section;
          currentTokens = this.countTokens(currentChunk);
        } else {
          // Adicionar seção ao chunk atual
          if (currentChunk.trim()) {
            currentChunk += '\n\n' + section;
          } else {
            currentChunk = section;
          }
          currentTokens += sectionTokens;
        }
      }
      
      // Salvar último chunk
      if (currentChunk.trim()) {
        chunks.push(this.createChunk(currentChunk, chunkIndex, startOffset, startOffset + currentChunk.length, sourceUrl));
      }

      console.log(`✅ Criados ${chunks.length} chunks para URL ${documentId}`);
      return chunks;
    } catch (error) {
      console.error('❌ Erro ao criar chunks da URL:', error);
      throw new Error(`Falha na criação de chunks: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private splitIntoSections(content: string): string[] {
    // Dividir por quebras de linha duplas (parágrafos)
    return content
      .split(/\n\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 20); // Filtrar seções muito pequenas
  }

  private splitLargeSection(section: string): string[] {
    const sentences = section.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
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
    
    return chunks.length > 0 ? chunks : [section];
  }

  private createOverlap(chunk: string): string {
    const words = chunk.split(' ');
    const overlapWords = Math.min(this.CHUNK_OVERLAP, Math.floor(words.length * 0.15));
    return words.slice(-overlapWords).join(' ');
  }

  private createChunk(content: string, index: number, startOffset: number, endOffset: number, sourceUrl?: string): ProcessedChunk {
    return {
      content: content.trim(),
      chunkIndex: index,
      tokenCount: this.countTokens(content),
      metadata: {
        startOffset,
        endOffset,
        type: 'section',
        ...(sourceUrl && { sourceUrl })
      }
    };
  }

  private countTokens(text: string): number {
    // Usar o mesmo método do EmbeddingService (1 token ≈ 4 caracteres)
    return Math.ceil(text.length / 4);
  }
}