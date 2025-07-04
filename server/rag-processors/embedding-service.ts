import { OpenAI } from 'openai';

export interface EmbeddingChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  embedding: number[];
  metadata: Record<string, any>;
}

export class EmbeddingService {
  private openai: OpenAI;
  private readonly MODEL = 'text-embedding-3-small';
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly MAX_TOKENS_PER_CHUNK = 8000; // Safe limit below 8192

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }
    
    this.openai = new OpenAI({ apiKey });
    console.log('🤖 EmbeddingService inicializado com OpenAI');
  }

  async generateEmbeddings(chunks: any[]): Promise<EmbeddingChunk[]> {
    try {
      console.log(`🔮 Gerando embeddings para ${chunks.length} chunks`);
      
      // First, validate and split oversized chunks
      const validatedChunks = this.validateAndSplitChunks(chunks);
      console.log(`🔧 Chunks após validação: ${validatedChunks.length} (${validatedChunks.length - chunks.length} novos chunks criados)`);
      
      const embeddingChunks: EmbeddingChunk[] = [];
      
      // Processar em lotes para otimizar custos
      for (let i = 0; i < validatedChunks.length; i += this.BATCH_SIZE) {
        const batch = validatedChunks.slice(i, i + this.BATCH_SIZE);
        console.log(`📦 Processando lote ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(validatedChunks.length / this.BATCH_SIZE)}`);
        
        const batchEmbeddings = await this.processBatch(batch);
        embeddingChunks.push(...batchEmbeddings);
        
        // Rate limiting - pequena pausa entre lotes
        if (i + this.BATCH_SIZE < validatedChunks.length) {
          await this.delay(200);
        }
      }
      
      console.log(`✅ Embeddings gerados com sucesso: ${embeddingChunks.length} chunks`);
      return embeddingChunks;
    } catch (error) {
      console.error('❌ Erro ao gerar embeddings:', error);
      throw new Error(`Falha na geração de embeddings: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private validateAndSplitChunks(chunks: any[]): any[] {
    const validatedChunks = [];
    
    for (const chunk of chunks) {
      const estimatedTokens = this.countTokens(chunk.content);
      
      if (estimatedTokens <= this.MAX_TOKENS_PER_CHUNK) {
        validatedChunks.push(chunk);
      } else {
        // Split oversized chunk
        console.log(`⚠️ Chunk ${chunk.chunkIndex} tem ${estimatedTokens} tokens, dividindo...`);
        const splitChunks = this.splitOversizedChunk(chunk);
        validatedChunks.push(...splitChunks);
      }
    }
    
    return validatedChunks;
  }

  private splitOversizedChunk(chunk: any): any[] {
    const content = chunk.content;
    const targetSize = Math.floor(this.MAX_TOKENS_PER_CHUNK * 0.8); // Use 80% of max for safety
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    
    const splitChunks = [];
    let currentContent = '';
    let currentTokens = 0;
    let subChunkIndex = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      if (currentTokens + sentenceTokens > targetSize && currentContent.trim()) {
        // Save current chunk
        splitChunks.push({
          ...chunk,
          content: currentContent.trim(),
          chunkIndex: `${chunk.chunkIndex}_${subChunkIndex}`,
          tokenCount: currentTokens,
          metadata: {
            ...chunk.metadata,
            isSplit: true,
            originalChunkIndex: chunk.chunkIndex,
            subIndex: subChunkIndex
          }
        });
        
        currentContent = sentence.trim();
        currentTokens = sentenceTokens;
        subChunkIndex++;
      } else {
        currentContent += (currentContent ? '. ' : '') + sentence.trim();
        currentTokens += sentenceTokens;
      }
    }
    
    // Add final chunk if there's content
    if (currentContent.trim()) {
      splitChunks.push({
        ...chunk,
        content: currentContent.trim(),
        chunkIndex: `${chunk.chunkIndex}_${subChunkIndex}`,
        tokenCount: currentTokens,
        metadata: {
          ...chunk.metadata,
          isSplit: true,
          originalChunkIndex: chunk.chunkIndex,
          subIndex: subChunkIndex
        }
      });
    }
    
    return splitChunks;
  }

  private countTokens(text: string): number {
    // More accurate token estimation for OpenAI models
    // Generally 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private async processBatch(chunks: any[]): Promise<EmbeddingChunk[]> {
    let attempt = 0;
    
    while (attempt < this.MAX_RETRIES) {
      try {
        const texts = chunks.map(chunk => this.prepareTextForEmbedding(chunk.content));
        
        const response = await this.openai.embeddings.create({
          model: this.MODEL,
          input: texts,
          encoding_format: 'float'
        });
        
        return chunks.map((chunk, index) => ({
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          embedding: response.data[index].embedding,
          metadata: chunk.metadata
        }));
        
      } catch (error) {
        attempt++;
        
        if (this.isRateLimitError(error)) {
          console.log(`⏳ Rate limit atingido, aguardando ${this.RETRY_DELAY * attempt}ms...`);
          await this.delay(this.RETRY_DELAY * attempt);
          continue;
        }
        
        if (attempt >= this.MAX_RETRIES) {
          throw error;
        }
        
        console.log(`🔄 Tentativa ${attempt}/${this.MAX_RETRIES} falhou, tentando novamente...`);
        await this.delay(this.RETRY_DELAY * attempt);
      }
    }
    
    throw new Error('Falha após múltiplas tentativas');
  }

  private prepareTextForEmbedding(text: string): string {
    // Limitar a 8000 tokens (limite do modelo)
    const maxLength = 8000 * 4; // Aproximadamente 4 chars por token
    
    if (text.length > maxLength) {
      return text.substring(0, maxLength).trim();
    }
    
    return text.trim();
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.code === 'rate_limit_exceeded' ||
           (error?.message && error.message.includes('rate limit'));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      const preparedText = this.prepareTextForEmbedding(text);
      
      const response = await this.openai.embeddings.create({
        model: this.MODEL,
        input: preparedText,
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Erro ao gerar embedding único:', error);
      throw new Error(`Falha na geração de embedding: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  getEmbeddingDimensions(): number {
    return 1536; // Dimensões do text-embedding-3-small
  }
}