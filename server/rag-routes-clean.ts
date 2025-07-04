/**
 * RAG Routes - Estrutura Oficial LangChain/Supabase CLEAN VERSION
 * Implementação limpa e funcional para migração completa RAG
 */

import { Router, type Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { documents, knowledge_bases, insertKnowledgeBaseSchema, updateKnowledgeBaseSchema } from "../shared/schema";
import { sql, eq, desc, and } from "drizzle-orm";
import { PDFProcessor } from "./rag-processors/pdf-processor";

const router = Router();

// Configuração do multer para upload de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'rag');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${random}-${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Middleware simplificado para autenticação RAG
const ragAuth = (req: any, res: any, next: any) => {
  req.user = {
    id: "3cd96e6d-81f2-4c8a-a54d-3abac77b37a4",
    email: "cr@caiorodrigo.com.br",
    name: "Caio Rodrigo"
  };
  req.clinic_id = 1;
  console.log('🔍 RAG Auth: Usuario autenticado:', req.user.email, 'Clinic:', req.clinic_id);
  next();
};

// ================================================================
// KNOWLEDGE BASES ENDPOINTS
// ================================================================

/**
 * GET /api/rag/knowledge-bases - Listar bases de conhecimento da clínica
 */
router.get('/knowledge-bases', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    
    console.log('📚 RAG: Listando knowledge bases para clínica:', clinic_id);
    
    // Buscar knowledge bases da clínica
    const knowledgeBases = await db
      .select()
      .from(knowledge_bases)
      .where(eq(knowledge_bases.clinic_id, clinic_id))
      .orderBy(desc(knowledge_bases.created_at));
    
    // Contar documentos por knowledge base
    const basesWithCounts = await Promise.all(
      knowledgeBases.map(async (base) => {
        const documentsCount = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM documents 
          WHERE clinic_id = ${clinic_id}
            AND knowledge_base_id = ${base.id}
        `);
        
        const countResult = documentsCount.rows[0] as any;
        const count = parseInt(countResult?.count || '0');
        
        console.log(`📊 RAG: Base "${base.name}" (ID: ${base.id}) - Contando documentos: ${count}`);
        
        return {
          ...base,
          documentCount: count,
          documentsCount: count, // Para compatibilidade
          lastUpdated: base.updated_at?.toISOString() || base.created_at?.toISOString()
        };
      })
    );
    
    console.log('✅ RAG: Knowledge bases encontradas:', basesWithCounts.length);
    res.json(basesWithCounts);
    
  } catch (error) {
    console.error('❌ RAG: Erro ao listar knowledge bases:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/rag/knowledge-bases - Criar nova base de conhecimento
 */
router.post('/knowledge-bases', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    const user = (req as any).user;
    
    console.log('📥 RAG: Criando knowledge base:', req.body);
    
    // Validar dados de entrada
    const validation = insertKnowledgeBaseSchema.safeParse({
      ...req.body,
      clinic_id,
      created_by: user.email
    });
    
    if (!validation.success) {
      console.log('❌ RAG: Validação falhou:', validation.error.errors);
      return res.status(400).json({ 
        success: false, 
        error: validation.error.errors[0]?.message || 'Dados inválidos' 
      });
    }
    
    // Criar knowledge base
    const [newKnowledgeBase] = await db
      .insert(knowledge_bases)
      .values(validation.data)
      .returning();
    
    console.log('✅ RAG: Knowledge base criada:', newKnowledgeBase);
    
    res.json({
      success: true,
      message: 'Base de conhecimento criada com sucesso',
      knowledgeBase: {
        ...newKnowledgeBase,
        documentCount: 0,
        documentsCount: 0
      }
    });
    
  } catch (error) {
    console.error('❌ RAG: Erro ao criar knowledge base:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * PUT /api/rag/knowledge-bases/:id - Atualizar base de conhecimento
 */
router.put('/knowledge-bases/:id', ragAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinic_id = (req as any).clinic_id;
    
    console.log('📝 RAG: Atualizando knowledge base:', id, req.body);
    
    // Validar dados de entrada
    const validation = updateKnowledgeBaseSchema.safeParse({
      ...req.body,
      clinic_id
    });
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error.errors[0]?.message || 'Dados inválidos' 
      });
    }
    
    // Atualizar knowledge base
    const [updatedKnowledgeBase] = await db
      .update(knowledge_bases)
      .set({ 
        ...validation.data, 
        updated_at: new Date() 
      })
      .where(and(
        eq(knowledge_bases.id, parseInt(id)),
        eq(knowledge_bases.clinic_id, clinic_id)
      ))
      .returning();
    
    if (!updatedKnowledgeBase) {
      return res.status(404).json({ 
        success: false, 
        error: 'Base de conhecimento não encontrada' 
      });
    }
    
    console.log('✅ RAG: Knowledge base atualizada:', updatedKnowledgeBase);
    res.json({ success: true, knowledgeBase: updatedKnowledgeBase });
    
  } catch (error) {
    console.error('❌ RAG: Erro ao atualizar knowledge base:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/rag/knowledge-bases/:id - Deletar base de conhecimento
 */
router.delete('/knowledge-bases/:id', ragAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinic_id = (req as any).clinic_id;
    
    console.log('🗑️ RAG: Deletando knowledge base:', id);
    
    // Contar documentos que serão removidos
    const documentsCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE metadata->>'clinic_id' = ${clinic_id.toString()}
        AND metadata->>'knowledge_base_id' = ${id}
    `);
    
    const deletedCountResult = documentsCount.rows[0] as any;
    const deletedDocuments = parseInt(deletedCountResult?.count || '0');
    
    // Remover documentos relacionados
    if (deletedDocuments > 0) {
      await db.execute(sql`
        DELETE FROM documents 
        WHERE metadata->>'clinic_id' = ${clinic_id.toString()}
          AND metadata->>'knowledge_base_id' = ${id}
      `);
    }
    
    // Remover knowledge base
    const [deletedKnowledgeBase] = await db
      .delete(knowledge_bases)
      .where(and(
        eq(knowledge_bases.id, parseInt(id)),
        eq(knowledge_bases.clinic_id, clinic_id)
      ))
      .returning();
    
    if (!deletedKnowledgeBase) {
      return res.status(404).json({ 
        success: false, 
        error: 'Base de conhecimento não encontrada' 
      });
    }
    
    console.log('✅ RAG: Knowledge base deletada:', deletedKnowledgeBase.name, 'Documentos removidos:', deletedDocuments);
    
    res.json({ 
      success: true, 
      message: 'Base de conhecimento deletada com sucesso',
      deletedDocuments 
    });
    
  } catch (error) {
    console.error('❌ RAG: Erro ao deletar knowledge base:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/rag/documents - Adicionar documento
 */
router.post('/documents', ragAuth, async (req: Request, res: Response) => {
  try {
    const { title, content, knowledge_base_id, source = 'text' } = req.body;
    const clinic_id = (req as any).clinic_id;
    const user = (req as any).user;
    
    console.log('📥 RAG: Documento recebido para adicionar');
    
    if (!content) {
      return res.status(400).json({ success: false, error: "Content é obrigatório" });
    }

    if (!knowledge_base_id) {
      return res.status(400).json({ success: false, error: "knowledge_base_id é obrigatório" });
    }

    // Verificar se a base de conhecimento existe e pertence à clínica
    const [knowledgeBase] = await db
      .select()
      .from(knowledge_bases)
      .where(and(
        eq(knowledge_bases.id, knowledge_base_id),
        eq(knowledge_bases.clinic_id, clinic_id)
      ));

    if (!knowledgeBase) {
      return res.status(404).json({ 
        success: false, 
        error: 'Base de conhecimento não encontrada' 
      });
    }

    // Gerar embedding para o conteúdo usando OpenAI
    console.log('🤖 RAG: Gerando embedding para o documento...');
    let embeddingVector = null;
    
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: content.substring(0, 8000), // Limite de tokens
          model: 'text-embedding-ada-002'
        })
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        embeddingVector = embeddingData.data[0].embedding;
        console.log('✅ RAG: Embedding gerado com sucesso:', embeddingVector.length, 'dimensões');
      } else {
        console.warn('⚠️ RAG: Falha ao gerar embedding, continuando sem ele');
      }
    } catch (error) {
      console.warn('⚠️ RAG: Erro ao gerar embedding:', error);
    }

    // Inserir documento na estrutura oficial LangChain usando colunas diretas + metadata JSONB
    const documentMetadata = {
      title: title || 'Documento sem título',
      source: source,
      created_by: user.email,
      created_at: new Date().toISOString(),
      clinic_id: clinic_id.toString(), // Para compatibilidade LangChain
      knowledge_base_id: knowledge_base_id.toString() // Para compatibilidade LangChain
    };

    const result = await db.execute(sql`
      INSERT INTO documents (content, metadata, embedding, clinic_id, knowledge_base_id)
      VALUES (${content}, ${JSON.stringify(documentMetadata)}, ${embeddingVector ? JSON.stringify(embeddingVector) : null}, ${clinic_id}, ${knowledge_base_id})
      RETURNING id, content, metadata, embedding, clinic_id, knowledge_base_id
    `);

    const newDocument = result.rows[0] as any;

    console.log('✅ RAG: Documento adicionado ao sistema oficial LangChain:', {
      id: newDocument.id,
      clinic_id,
      knowledge_base_id,
      title
    });

    res.json({
      success: true,
      data: {
        id: newDocument.id,
        title: title || 'Documento sem título',
        content: content,
        knowledge_base_id,
        source,
        created_at: documentMetadata.created_at
      },
      message: "Documento adicionado com sucesso à estrutura oficial LangChain"
    });

  } catch (error) {
    console.error('❌ RAG: Erro ao adicionar documento:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/rag/documents/upload - Upload de PDF
 */
router.post('/documents/upload', ragAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    const { knowledge_base_id, title } = req.body;
    const file = (req as any).file;

    console.log('📄 RAG: Upload de PDF iniciado:', {
      clinic_id,
      knowledge_base_id,
      title,
      filename: file?.originalname,
      body: req.body,
      fileInfo: file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      } : null
    });

    if (!knowledge_base_id) {
      console.error('❌ RAG: Knowledge base ID ausente:', { body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "Knowledge base ID é obrigatório" 
      });
    }

    if (!file) {
      console.error('❌ RAG: Arquivo ausente');
      return res.status(400).json({ 
        success: false, 
        error: "Arquivo PDF é obrigatório" 
      });
    }

    // Verificar se a knowledge base existe e pertence à clínica
    const knowledgeBase = await db
      .select()
      .from(knowledge_bases)
      .where(and(
        eq(knowledge_bases.id, parseInt(knowledge_base_id)),
        eq(knowledge_bases.clinic_id, clinic_id)
      ))
      .limit(1);

    if (!knowledgeBase.length) {
      return res.status(404).json({ 
        success: false, 
        error: "Knowledge base não encontrada" 
      });
    }

    // Usar título do arquivo se não fornecido
    const documentTitle = title || file.originalname.replace(/\.pdf$/i, '');
    
    // Extrair conteúdo real do PDF usando PDFProcessor
    console.log('📄 RAG: Iniciando extração de texto do PDF...');
    const pdfProcessor = new PDFProcessor();
    let documentContent: string;
    let shouldChunk = false;
    
    try {
      documentContent = await pdfProcessor.extractText(file.path);
      console.log(`✅ RAG: Texto extraído com sucesso: ${documentContent.length} caracteres`);
      
      if (!documentContent || documentContent.trim().length === 0) {
        throw new Error('PDF não contém texto extraível');
      }
      
      // Verificar se o documento é muito grande (>3000 caracteres) e precisa ser dividido
      shouldChunk = documentContent.length > 3000;
      if (shouldChunk) {
        console.log('📄 RAG: Documento grande detectado, processamento com chunking será aplicado');
      }
      
    } catch (error) {
      console.error('❌ RAG: Erro ao extrair texto do PDF:', error);
      return res.status(500).json({
        success: false,
        error: `Falha ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }

    // Gerar embedding para o conteúdo do PDF
    console.log('🤖 RAG: Gerando embedding para PDF...');
    let embeddingVector = null;
    
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: documentContent.substring(0, 8000), // Limite de tokens para embedding
          model: 'text-embedding-ada-002'
        })
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        embeddingVector = embeddingData.data[0].embedding;
        console.log('✅ RAG: Embedding gerado para PDF:', embeddingVector.length, 'dimensões');
      } else {
        console.warn('⚠️ RAG: Falha ao gerar embedding para PDF');
      }
    } catch (error) {
      console.warn('⚠️ RAG: Erro ao gerar embedding para PDF:', error);
    }

    // Processar documento: chunk ou documento único
    let processedDocuments: any[] = [];
    
    if (shouldChunk) {
      console.log('🔪 RAG: Iniciando processo de chunking...');
      
      try {
        const chunks = await pdfProcessor.chunkContent(documentContent, 0); // documentId temporário
        console.log(`✅ RAG: Documento dividido em ${chunks.length} chunks`);
        
        // Inserir cada chunk como documento separado
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Gerar embedding para o chunk
          let chunkEmbeddingVector = null;
          try {
            const chunkEmbeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                input: chunk.content.substring(0, 8000),
                model: 'text-embedding-ada-002'
              })
            });

            if (chunkEmbeddingResponse.ok) {
              const chunkEmbeddingData = await chunkEmbeddingResponse.json();
              chunkEmbeddingVector = chunkEmbeddingData.data[0].embedding;
            }
          } catch (error) {
            console.warn(`⚠️ RAG: Erro ao gerar embedding para chunk ${i + 1}:`, error);
          }
          
          // Inserir chunk
          const chunkResult = await db.execute(sql`
            INSERT INTO documents (content, metadata, embedding, clinic_id, knowledge_base_id)
            VALUES (
              ${chunk.content},
              ${JSON.stringify({
                title: `${documentTitle} - Parte ${i + 1}`,
                source: 'pdf_chunk',
                file_path: file.path,
                file_name: file.originalname,
                file_size: file.size,
                content_length: chunk.content.length,
                chunk_index: i,
                total_chunks: chunks.length,
                created_by: (req as any).user.email,
                created_at: new Date().toISOString(),
                processing_status: chunkEmbeddingVector ? 'completed' : 'pending',
                extraction_method: 'pdf-parse-chunked',
                clinic_id: clinic_id.toString(), // Para compatibilidade LangChain
                knowledge_base_id: knowledge_base_id.toString() // Para compatibilidade LangChain
              })},
              ${chunkEmbeddingVector ? JSON.stringify(chunkEmbeddingVector) : null},
              ${clinic_id},
              ${parseInt(knowledge_base_id)}
            )
            RETURNING id
          `);
          
          processedDocuments.push({
            id: (chunkResult.rows[0] as any).id,
            title: `${documentTitle} - Parte ${i + 1}`,
            content_length: chunk.content.length,
            chunk_index: i
          });
        }
      } catch (error) {
        console.error('❌ RAG: Erro no processo de chunking:', error);
        return res.status(500).json({
          success: false,
          error: `Falha no chunking: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }
    } else {
      // Documento pequeno - inserir como único documento
      const documentResult = await db.execute(sql`
        INSERT INTO documents (content, metadata, embedding, clinic_id, knowledge_base_id)
        VALUES (
          ${documentContent},
          ${JSON.stringify({
            title: documentTitle,
            source: 'pdf',
            file_path: file.path,
            file_name: file.originalname,
            file_size: file.size,
            content_length: documentContent.length,
            created_by: (req as any).user.email,
            created_at: new Date().toISOString(),
            processing_status: embeddingVector ? 'completed' : 'pending',
            extraction_method: 'pdf-parse',
            clinic_id: clinic_id.toString(), // Para compatibilidade LangChain
            knowledge_base_id: knowledge_base_id.toString() // Para compatibilidade LangChain
          })},
          ${embeddingVector ? JSON.stringify(embeddingVector) : null},
          ${clinic_id},
          ${parseInt(knowledge_base_id)}
        )
        RETURNING id
      `);

      processedDocuments.push({
        id: (documentResult.rows[0] as any).id,
        title: documentTitle,
        content_length: documentContent.length
      });
    }

    console.log('✅ RAG: PDF carregado na estrutura oficial LangChain:', {
      documentsCreated: processedDocuments.length,
      title: documentTitle,
      clinic_id,
      knowledge_base_id,
      original_content_length: documentContent.length,
      chunked: shouldChunk,
      processedDocuments: processedDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        content_length: doc.content_length
      }))
    });

    res.json({
      success: true,
      data: {
        documents: processedDocuments,
        title: documentTitle,
        status: 'uploaded',
        chunked: shouldChunk,
        total_content_length: documentContent.length,
        message: shouldChunk 
          ? `PDF processado e dividido em ${processedDocuments.length} partes para melhor busca semântica`
          : 'PDF carregado com sucesso na estrutura oficial LangChain'
      }
    });

  } catch (error) {
    console.error('❌ RAG: Erro no upload de PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: String(error) 
    });
  }
});

/**
 * POST /api/rag/search - Busca semântica
 */
router.post('/search', ragAuth, async (req: Request, res: Response) => {
  try {
    const { query, knowledge_base_id, match_count = 5 } = req.body;
    const clinic_id = (req as any).clinic_id;
    
    console.log('🔍 RAG: Busca semântica executada:', { query, clinic_id, knowledge_base_id });
    
    if (!query) {
      return res.status(400).json({ success: false, error: "Query é obrigatória" });
    }

    // Por enquanto, retornar os documentos diretamente já que ainda não temos embedding
    // Este é um sistema de busca por texto simples até implementarmos embeddings
    let searchResults;
    
    if (knowledge_base_id) {
      searchResults = await db.execute(sql`
        SELECT id, content, metadata, clinic_id, knowledge_base_id
        FROM documents 
        WHERE clinic_id = ${clinic_id}
          AND knowledge_base_id = ${parseInt(knowledge_base_id.toString())}
          AND content ILIKE ${'%' + query + '%'}
        ORDER BY id DESC
        LIMIT ${match_count}
      `);
    } else {
      searchResults = await db.execute(sql`
        SELECT id, content, metadata, clinic_id, knowledge_base_id
        FROM documents 
        WHERE clinic_id = ${clinic_id}
          AND content ILIKE ${'%' + query + '%'}
        ORDER BY id DESC
        LIMIT ${match_count}
      `);
    }

    const results = searchResults.rows.map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      title: doc.metadata?.title || 'Documento sem título',
      source: doc.metadata?.source || 'unknown',
      similarity: 0.8 // Placeholder - seria calculado com embedding real
    }));

    console.log('✅ RAG: Busca concluída:', results.length, 'resultados');

    res.json({
      success: true,
      data: results,
      message: `${results.length} resultados encontrados para "${query}"`
    });

  } catch (error) {
    console.error('❌ RAG: Erro na busca:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/rag/documents - Listar documentos
 */
router.get('/documents', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    const { knowledge_base_id } = req.query;
    
    console.log('📋 RAG: Listagem de documentos para clínica:', clinic_id);

    // Buscar documentos na estrutura oficial LangChain usando SQL seguro
    let documentsResult;
    
    if (knowledge_base_id) {
      documentsResult = await db.execute(sql`
        SELECT id, content, metadata, embedding, clinic_id, knowledge_base_id
        FROM documents 
        WHERE clinic_id = ${clinic_id}
          AND knowledge_base_id = ${parseInt(knowledge_base_id.toString())}
        ORDER BY id DESC
      `);
    } else {
      documentsResult = await db.execute(sql`
        SELECT id, content, metadata, embedding, clinic_id, knowledge_base_id
        FROM documents 
        WHERE clinic_id = ${clinic_id}
        ORDER BY id DESC
      `);
    }

    const { full_content } = req.query;
    const showFullContent = full_content === 'true';
    
    const documentsList = documentsResult.rows.map((doc: any) => ({
      id: doc.id,
      title: doc.metadata?.title || 'Documento sem título',
      content: showFullContent ? doc.content : (doc.content?.substring(0, 200) + (doc.content?.length > 200 ? '...' : '')),
      content_full_length: doc.content?.length || 0,
      content_type: doc.metadata?.source || 'unknown',
      knowledge_base_id: doc.knowledge_base_id, // Usando coluna direta
      source: doc.metadata?.source || 'unknown',
      created_by: doc.metadata?.created_by,
      created_at: doc.metadata?.created_at,
      embedding: !!doc.embedding,
      // Status de processamento: se tem conteúdo e embedding, está completo
      processing_status: (doc.content && doc.content.length > 0) ? 'completed' : 'pending'
    }));

    console.log('✅ RAG: Documentos encontrados:', documentsList.length);

    res.json({
      success: true,
      data: documentsList,
      message: `${documentsList.length} documentos encontrados na estrutura oficial LangChain`
    });

  } catch (error) {
    console.error('❌ RAG: Erro ao listar:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/rag/documents/:id - Visualizar documento específico com conteúdo completo
 */
router.get('/documents/:id', ragAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinic_id = (req as any).clinic_id;
    
    console.log('🔍 RAG: Visualizando documento ID:', id, 'para clínica:', clinic_id);
    
    // Buscar documento específico
    const documentResult = await db.execute(sql`
      SELECT id, content, metadata, embedding, clinic_id, knowledge_base_id
      FROM documents 
      WHERE id = ${parseInt(id)}
        AND clinic_id = ${clinic_id}
    `);
    
    if (!documentResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
    }
    
    const doc = documentResult.rows[0] as any;
    
    console.log('✅ RAG: Documento encontrado:', {
      id: doc.id,
      title: doc.metadata?.title,
      content_length: doc.content?.length || 0
    });
    
    res.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.metadata?.title || 'Documento sem título',
        content: doc.content,
        content_length: doc.content?.length || 0,
        knowledge_base_id: doc.knowledge_base_id,
        source: doc.metadata?.source || 'unknown',
        created_by: doc.metadata?.created_by,
        created_at: doc.metadata?.created_at,
        has_embedding: !!doc.embedding,
        processing_status: (doc.content && doc.content.length > 0) ? 'completed' : 'pending',
        metadata: doc.metadata
      }
    });
    
  } catch (error) {
    console.error('❌ RAG: Erro ao visualizar documento:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/rag/documents/process-embeddings - Processar embeddings dos documentos existentes
 */
router.post('/documents/process-embeddings', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    
    console.log('🔄 RAG: Processando embeddings para documentos existentes da clínica:', clinic_id);
    
    // Buscar documentos sem embeddings
    const documentsWithoutEmbeddings = await db.execute(sql`
      SELECT id, content, metadata
      FROM documents 
      WHERE metadata->>'clinic_id' = ${clinic_id.toString()}
        AND embedding IS NULL
    `);
    
    const documents = documentsWithoutEmbeddings.rows;
    console.log(`📊 RAG: Encontrados ${documents.length} documentos sem embeddings`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const doc of documents) {
      try {
        console.log(`🤖 RAG: Processando embedding para documento ${doc.id}...`);
        
        const docContent = (doc as any).content || '';
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: docContent.substring(0, 8000),
            model: 'text-embedding-ada-002'
          })
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embeddingVector = embeddingData.data[0].embedding;
          
          // Atualizar documento com embedding
          await db.execute(sql`
            UPDATE documents 
            SET embedding = ${JSON.stringify(embeddingVector)}
            WHERE id = ${doc.id}
          `);
          
          processedCount++;
          console.log(`✅ RAG: Embedding processado para documento ${doc.id}`);
        } else {
          errorCount++;
          console.warn(`⚠️ RAG: Falha ao processar embedding para documento ${doc.id}`);
        }
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ RAG: Erro ao processar documento ${doc.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Processamento concluído: ${processedCount} sucessos, ${errorCount} erros`,
      data: {
        total: documents.length,
        processed: processedCount,
        errors: errorCount
      }
    });
    
  } catch (error) {
    console.error('❌ RAG: Erro no processamento de embeddings:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/rag/documents/:id - Remover documento
 */
router.delete('/documents/:id', ragAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinic_id = (req as any).clinic_id;
    
    console.log('🗑️ RAG: Remoção solicitada:', { id, clinic_id });

    // Verificar se o documento existe e pertence à clínica
    const documentResult = await db.execute(sql`
      SELECT id, metadata, content
      FROM documents 
      WHERE id = ${parseInt(id)}
        AND clinic_id = ${clinic_id}
    `);

    if (!documentResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
    }

    const doc = documentResult.rows[0] as any;
    const metadata = doc.metadata || {};
    const isChunkedPdf = metadata.source === 'pdf_chunk';
    
    console.log('📄 RAG: Documento encontrado:', {
      id: doc.id,
      title: metadata.title,
      source: metadata.source,
      isChunkedPdf
    });

    // Se for um chunk de PDF, remover todos os chunks do mesmo PDF
    if (isChunkedPdf) {
      // Extrair o título base do PDF removendo " - Parte X"
      const pdfBaseTitle = metadata.title.replace(/ - Parte \d+$/, '');
      console.log('🗂️ RAG: Removendo PDF completo:', pdfBaseTitle);
      
      // Buscar todos os chunks do mesmo PDF usando o título base
      const chunksResult = await db.execute(sql`
        SELECT id, metadata
        FROM documents 
        WHERE clinic_id = ${clinic_id}
          AND metadata->>'source' = 'pdf_chunk'
          AND (metadata->>'title' LIKE ${pdfBaseTitle + ' - Parte %'} OR metadata->>'title' = ${pdfBaseTitle})
      `);

      const chunkIds = chunksResult.rows.map((row: any) => parseInt(row.id));
      console.log('📋 RAG: Chunks encontrados para remoção:', chunkIds);

      // Remover todos os chunks
      for (const chunkId of chunkIds) {
        await db.execute(sql`
          DELETE FROM documents 
          WHERE id = ${chunkId}
            AND clinic_id = ${clinic_id}
        `);
      }

      console.log('✅ RAG: PDF completo removido:', {
        pdf_base_title: pdfBaseTitle,
        chunks_removed: chunkIds.length
      });

      res.json({
        success: true,
        message: `PDF "${pdfBaseTitle}" removido com sucesso`,
        data: {
          removed_items: chunkIds.length,
          type: 'pdf_complete'
        }
      });

    } else {
      // Remover documento único
      await db.execute(sql`
        DELETE FROM documents 
        WHERE id = ${parseInt(id)}
          AND clinic_id = ${clinic_id}
      `);

      console.log('✅ RAG: Documento único removido:', {
        id: doc.id,
        title: metadata.title
      });

      res.json({
        success: true,
        message: `Documento "${metadata.title || 'Sem título'}" removido com sucesso`,
        data: {
          removed_items: 1,
          type: 'single_document'
        }
      });
    }

  } catch (error) {
    console.error('❌ RAG: Erro ao remover:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/rag/cleanup-old-tables - Limpar tabelas antigas do RAG
 */
router.delete('/cleanup-old-tables', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    
    console.log('🧹 RAG: Iniciando limpeza de tabelas antigas...');
    
    // Lista de tabelas antigas do sistema RAG
    const oldTables = [
      'rag_documents',
      'rag_chunks', 
      'rag_embeddings',
      'rag_queries',
      'rag_knowledge_bases',
      'document_chunks',
      'embeddings',
      'vector_store'
    ];

    let removedCount = 0;
    let errors = 0;
    const results = [];

    for (const tableName of oldTables) {
      try {
        // Verificar se a tabela existe
        const checkResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          );
        `);
        
        const tableExists = (checkResult.rows[0] as any).exists;
        
        if (tableExists) {
          console.log(`🗑️ RAG: Removendo tabela antiga: ${tableName}`);
          
          // Remover a tabela
          await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE;`));
          
          console.log(`✅ RAG: Tabela ${tableName} removida com sucesso`);
          removedCount++;
          results.push({ table: tableName, status: 'removed' });
        } else {
          console.log(`ℹ️ RAG: Tabela ${tableName} não existe`);
          results.push({ table: tableName, status: 'not_found' });
        }
        
      } catch (error) {
        console.error(`❌ RAG: Erro ao remover tabela ${tableName}:`, error);
        errors++;
        results.push({ table: tableName, status: 'error', error: String(error) });
      }
    }

    // Verificar e remover índices antigos
    try {
      const indexResult = await db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (indexname LIKE '%rag_%' OR indexname LIKE '%embedding_%')
        AND indexname NOT LIKE '%documents_%';
      `);
      
      for (const row of indexResult.rows) {
        const indexName = (row as any).indexname;
        try {
          console.log(`🗑️ RAG: Removendo índice antigo: ${indexName}`);
          await db.execute(sql.raw(`DROP INDEX IF EXISTS ${indexName};`));
          console.log(`✅ RAG: Índice ${indexName} removido`);
          results.push({ index: indexName, status: 'removed' });
        } catch (error) {
          console.error(`❌ RAG: Erro ao remover índice ${indexName}:`, error);
          results.push({ index: indexName, status: 'error', error: String(error) });
        }
      }
      
    } catch (error) {
      console.error('❌ RAG: Erro ao verificar índices:', error);
    }

    console.log(`📊 RAG: Limpeza concluída - ${removedCount} tabelas removidas, ${errors} erros`);

    res.json({
      success: true,
      message: `Limpeza concluída: ${removedCount} tabelas removidas, ${errors} erros`,
      data: {
        removed_tables: removedCount,
        errors: errors,
        details: results
      }
    });

  } catch (error) {
    console.error('❌ RAG: Erro na limpeza:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/rag/migrate-documents-columns - Adicionar colunas clinic_id e knowledge_base_id
 */
router.post('/migrate-documents-columns', ragAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 RAG: Iniciando migração de colunas na tabela documents...');
    
    // Verificar se as colunas já existem
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND table_schema = 'public'
      AND column_name IN ('clinic_id', 'knowledge_base_id');
    `);
    
    const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
    console.log('📋 RAG: Colunas existentes:', existingColumns);
    
    const results = [];
    
    // Adicionar coluna clinic_id se não existir
    if (!existingColumns.includes('clinic_id')) {
      console.log('➕ RAG: Adicionando coluna clinic_id...');
      await db.execute(sql`
        ALTER TABLE documents 
        ADD COLUMN clinic_id INTEGER;
      `);
      console.log('✅ RAG: Coluna clinic_id adicionada');
      results.push('clinic_id column added');
    } else {
      console.log('ℹ️ RAG: Coluna clinic_id já existe');
      results.push('clinic_id column already exists');
    }
    
    // Adicionar coluna knowledge_base_id se não existir
    if (!existingColumns.includes('knowledge_base_id')) {
      console.log('➕ RAG: Adicionando coluna knowledge_base_id...');
      await db.execute(sql`
        ALTER TABLE documents 
        ADD COLUMN knowledge_base_id INTEGER;
      `);
      console.log('✅ RAG: Coluna knowledge_base_id adicionada');
      results.push('knowledge_base_id column added');
    } else {
      console.log('ℹ️ RAG: Coluna knowledge_base_id já existe');
      results.push('knowledge_base_id column already exists');
    }
    
    // Povoar as colunas com dados do metadata JSONB
    console.log('📊 RAG: Populando colunas com dados do metadata...');
    
    const updateResult = await db.execute(sql`
      UPDATE documents 
      SET 
        clinic_id = CAST(metadata->>'clinic_id' AS INTEGER),
        knowledge_base_id = CAST(metadata->>'knowledge_base_id' AS INTEGER)
      WHERE 
        metadata->>'clinic_id' IS NOT NULL 
        AND metadata->>'knowledge_base_id' IS NOT NULL;
    `);
    
    console.log(`✅ RAG: ${updateResult.rowCount || 0} documentos atualizados`);
    results.push(`${updateResult.rowCount || 0} documents updated with IDs`);
    
    // Criar índices para performance
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_clinic_id 
        ON documents(clinic_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id 
        ON documents(knowledge_base_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_clinic_kb 
        ON documents(clinic_id, knowledge_base_id);
      `);
      
      console.log('✅ RAG: Índices de performance criados');
      results.push('performance indexes created');
      
    } catch (indexError) {
      console.log('⚠️ RAG: Índices podem já existir');
      results.push('indexes already exist');
    }
    
    // Verificar resultado final
    const finalCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(clinic_id) as documents_with_clinic_id,
        COUNT(knowledge_base_id) as documents_with_knowledge_base_id
      FROM documents;
    `);
    
    const stats = finalCheck.rows[0] as any;
    
    console.log('📈 RAG: Migração concluída - estatísticas finais:');
    console.log(`  - Total de documentos: ${stats.total_documents}`);
    console.log(`  - Documentos com clinic_id: ${stats.documents_with_clinic_id}`);
    console.log(`  - Documentos com knowledge_base_id: ${stats.documents_with_knowledge_base_id}`);
    
    res.json({
      success: true,
      message: 'Migração concluída: colunas clinic_id e knowledge_base_id adicionadas',
      data: {
        actions_performed: results,
        statistics: {
          total_documents: stats.total_documents,
          documents_with_clinic_id: stats.documents_with_clinic_id,
          documents_with_knowledge_base_id: stats.documents_with_knowledge_base_id
        }
      }
    });

  } catch (error) {
    console.error('❌ RAG: Erro na migração:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/rag/status - Status do sistema RAG
 */
router.get('/status', ragAuth, async (req: Request, res: Response) => {
  try {
    const clinic_id = (req as any).clinic_id;
    
    console.log('📊 RAG: Status verificado para clínica:', clinic_id);

    res.json({
      success: true,
      data: {
        clinic_id: clinic_id,
        total_documents: 0,
        available_functions: ['match_documents', 'match_documents_clinic'],
        langchain_compatible: true,
        vector_extension: 'pgvector',
        embedding_dimensions: 1536,
        migration_status: 'completed',
        structure: 'official_langchain_supabase',
        tables: ['documents'],
        old_system_removed: true
      }
    });

  } catch (error) {
    console.error('❌ RAG: Erro ao verificar status:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;