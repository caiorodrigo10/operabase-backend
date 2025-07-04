import { db } from "../db";
import { rag_documents, rag_chunks, rag_embeddings, rag_knowledge_bases } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { PDFProcessor } from "./pdf-processor";
import { URLProcessor } from "./url-processor";
import { TextProcessor } from "./text-processor";
import { EmbeddingService } from "./embedding-service";

export class DocumentWorkflow {
  private pdfProcessor: PDFProcessor;
  private urlProcessor: URLProcessor;
  private textProcessor: TextProcessor;
  private embeddingService: EmbeddingService;

  constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.urlProcessor = new URLProcessor();
    this.textProcessor = new TextProcessor();
    this.embeddingService = new EmbeddingService();
  }

  async processDocument(documentId: number): Promise<void> {
    try {
      console.log(`🚀 Iniciando processamento do documento ${documentId}`);
      
      // 1. Buscar documento
      const [document] = await db
        .select()
        .from(rag_documents)
        .where(eq(rag_documents.id, documentId));

      if (!document) {
        throw new Error('Documento não encontrado');
      }

      // 2. Atualizar status para processing
      await this.updateStatus(documentId, 'processing');

      // 3. Extrair conteúdo baseado no tipo
      let extractedContent: string;
      
      switch (document.content_type) {
        case 'pdf':
          if (!document.file_path) throw new Error('Caminho do arquivo PDF não encontrado');
          extractedContent = await this.pdfProcessor.extractText(document.file_path);
          break;
          
        case 'url':
          if (!document.source_url) throw new Error('URL não encontrada');
          extractedContent = await this.urlProcessor.extractContent(document.source_url);
          break;
          
        case 'text':
          if (!document.original_content) throw new Error('Conteúdo de texto não encontrado');
          extractedContent = document.original_content;
          break;
          
        default:
          throw new Error(`Tipo de conteúdo não suportado: ${document.content_type}`);
      }

      // 4. Atualizar documento com conteúdo extraído
      await db
        .update(rag_documents)
        .set({
          extracted_content: extractedContent,
          updated_at: new Date()
        })
        .where(eq(rag_documents.id, documentId));

      // 5. Criar chunks baseado no tipo
      let chunks;
      
      switch (document.content_type) {
        case 'pdf':
          chunks = await this.pdfProcessor.chunkContent(extractedContent, documentId);
          break;
          
        case 'url':
          chunks = await this.urlProcessor.chunkContent(extractedContent, documentId, document.source_url || undefined);
          break;
          
        case 'text':
          chunks = await this.textProcessor.processText(extractedContent, documentId);
          break;
          
        default:
          throw new Error(`Tipo de chunking não suportado: ${document.content_type}`);
      }

      console.log(`📊 Criados ${chunks.length} chunks para documento ${documentId}`);

      // 6. Salvar chunks no banco
      const insertedChunks = await db
        .insert(rag_chunks)
        .values(
          chunks.map(chunk => ({
            document_id: documentId,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            token_count: chunk.tokenCount,
            metadata: chunk.metadata
          }))
        )
        .returning();

      console.log(`💾 Salvos ${insertedChunks.length} chunks no banco`);

      // 7. Gerar embeddings
      console.log(`🔮 Gerando embeddings para ${chunks.length} chunks`);
      const embeddingChunks = await this.embeddingService.generateEmbeddings(chunks);

      // 8. Obter clinic_id e knowledge_base_id do documento
      const clinicId = document.external_user_id.match(/^\d+$/) ? parseInt(document.external_user_id) : 1;
      
      // Tentar encontrar knowledge_base_id a partir dos metadados do documento
      let knowledgeBaseId = null;
      if (document.metadata && typeof document.metadata === 'object') {
        const metadata = document.metadata as any;
        if (metadata.knowledge_base) {
          // Buscar base de conhecimento pelo nome
          const knowledgeBases = await db
            .select()
            .from(rag_knowledge_bases)
            .where(eq(rag_knowledge_bases.external_user_id, document.external_user_id));
          
          const matchingKB = knowledgeBases.find(kb => kb.name === metadata.knowledge_base);
          if (matchingKB) {
            knowledgeBaseId = matchingKB.id;
          }
        }
      }

      console.log(`🔗 Vinculando embeddings: clinic_id=${clinicId}, knowledge_base_id=${knowledgeBaseId}`);

      // 9. Salvar embeddings no banco com campos obrigatórios
      await db
        .insert(rag_embeddings)
        .values(
          embeddingChunks.map((chunk, index) => ({
            chunk_id: insertedChunks[index].id,
            embedding: chunk.embedding,
            model_used: 'text-embedding-3-small',
            clinic_id: clinicId,
            knowledge_base_id: knowledgeBaseId
          }))
        );

      console.log(`🎯 Salvos ${embeddingChunks.length} embeddings no banco`);

      // 9. Atualizar status para completed
      await this.updateStatus(documentId, 'completed');
      
      console.log(`✅ Documento ${documentId} processado com sucesso`);

    } catch (error) {
      console.error(`❌ Erro no processamento do documento ${documentId}:`, error);
      
      // Atualizar status para failed
      await this.updateStatus(
        documentId, 
        'failed', 
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      
      throw error;
    }
  }

  private async updateStatus(
    documentId: number, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    await db
      .update(rag_documents)
      .set({
        processing_status: status,
        error_message: errorMessage || null,
        updated_at: new Date()
      })
      .where(eq(rag_documents.id, documentId));
  }

  async reprocessDocument(documentId: number): Promise<void> {
    try {
      console.log(`🔄 Reprocessando documento ${documentId}`);
      
      // Limpar chunks e embeddings existentes
      await db
        .delete(rag_embeddings)
        .where(eq(rag_embeddings.chunk_id, db
          .select({ id: rag_chunks.id })
          .from(rag_chunks)
          .where(eq(rag_chunks.document_id, documentId))
        ));

      await db
        .delete(rag_chunks)
        .where(eq(rag_chunks.document_id, documentId));

      // Resetar status
      await this.updateStatus(documentId, 'pending');
      
      // Processar novamente
      await this.processDocument(documentId);
      
    } catch (error) {
      console.error(`❌ Erro no reprocessamento do documento ${documentId}:`, error);
      throw error;
    }
  }

  async getProcessingStats(documentId: number): Promise<{
    status: string;
    chunksCount: number;
    embeddingsCount: number;
    errorMessage?: string;
  }> {
    try {
      const [document] = await db
        .select()
        .from(rag_documents)
        .where(eq(rag_documents.id, documentId));

      if (!document) {
        throw new Error('Documento não encontrado');
      }

      const chunksCount = await db
        .select({ count: rag_chunks.id })
        .from(rag_chunks)
        .where(eq(rag_chunks.document_id, documentId));

      const embeddingsCount = await db
        .select({ count: rag_embeddings.id })
        .from(rag_embeddings)
        .leftJoin(rag_chunks, eq(rag_embeddings.chunk_id, rag_chunks.id))
        .where(eq(rag_chunks.document_id, documentId));

      return {
        status: document.processing_status || 'pending',
        chunksCount: chunksCount.length,
        embeddingsCount: embeddingsCount.length,
        errorMessage: document.error_message || undefined
      };

    } catch (error) {
      console.error(`❌ Erro ao buscar stats do documento ${documentId}:`, error);
      throw error;
    }
  }
}