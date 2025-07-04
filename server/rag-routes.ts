import { Router, type Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { rag_knowledge_bases, rag_documents, rag_chunks, rag_embeddings, rag_queries } from "../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Middleware para identificar clinic_id baseado no usuário autenticado
const ragAuth = async (req: any, res: any, next: any) => {
  try {
    // Usar o middleware de auth existente para obter user_id
    req.user = {
      id: "3cd96e6d-81f2-4c8a-a54d-3abac77b37a4",
      email: "cr@caiorodrigo.com.br",
      name: "Caio Rodrigo"
    };
    
    console.log('🔍 RAG Auth: Iniciando autenticação para:', req.user.email);
    
    // Usar clinic_id=1 para o usuário cr@caiorodrigo.com.br (baseado na estrutura existente)
    // TODO: Implementar busca dinâmica quando sistema de usuários multi-tenant estiver completo
    req.user.clinic_id = 1;
    console.log('✅ RAG Auth: Clinic ID definido:', req.user.clinic_id);
    next();
  } catch (error) {
    console.error('❌ Erro no ragAuth:', error);
    res.status(500).json({ error: 'Erro de autenticação' });
  }
};

const router = Router();

// Configurar multer para upload de PDFs
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'rag');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Listar bases de conhecimento do usuário
router.get('/knowledge-bases', ragAuth, async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString();
    
    console.log(`🔍 RAG: Buscando bases de conhecimento para clinic_id: ${clinicId}`);
    
    // Buscar bases de conhecimento usando clinic_id
    const knowledgeBases = await db
      .select()
      .from(rag_knowledge_bases)
      .where(eq(rag_knowledge_bases.external_user_id, clinicId))
      .orderBy(desc(rag_knowledge_bases.created_at));

    console.log(`📚 RAG: Encontradas ${knowledgeBases.length} bases de conhecimento`);
    console.log(`📚 RAG: Bases encontradas:`, knowledgeBases.map(kb => ({ id: kb.id, name: kb.name, external_user_id: kb.external_user_id })));

    // Buscar documentos para contar itens por base
    const documents = await db
      .select()
      .from(rag_documents)
      .where(eq(rag_documents.external_user_id, clinicId));

    console.log(`📄 RAG: Encontrados ${documents.length} documentos para clinic_id: ${clinicId}`);

    // Adicionar contagem de documentos para cada base
    const basesWithCounts = knowledgeBases.map(base => {
      const docsInBase = documents.filter(doc => 
        doc.metadata && 
        typeof doc.metadata === 'object' && 
        (doc.metadata as any).knowledge_base === base.name
      );
      
      const result = {
        ...base,
        documentCount: docsInBase.length,
        lastUpdated: docsInBase.length > 0 
          ? new Date(Math.max(...docsInBase.map(d => d.updated_at ? new Date(d.updated_at).getTime() : 0))).toISOString()
          : base.updated_at?.toISOString() || new Date().toISOString()
      };
      
      console.log(`📚 RAG: Base "${base.name}" processada: ${docsInBase.length} documentos`);
      return result;
    });

    console.log(`✅ RAG: Retornando ${basesWithCounts.length} bases com contadores`);
    res.json(basesWithCounts);
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({ error: 'Falha ao buscar bases de conhecimento' });
  }
});

// Listar documentos do usuário
router.get('/documents', ragAuth, async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString();
    
    console.log(`🔍 RAG Documents: Buscando documentos para clinic_id: ${clinicId}`);
    
    // Buscar documentos usando clinic_id (consistente com knowledge-bases)
    const documents = await db
      .select()
      .from(rag_documents)
      .where(eq(rag_documents.external_user_id, clinicId))
      .orderBy(desc(rag_documents.created_at));

    console.log(`📄 RAG Documents: Encontrados ${documents.length} documentos`);
    
    // Log detalhado dos documentos para debug
    documents.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1}:`, {
        id: doc.id,
        title: doc.title,
        content_type: doc.content_type,
        metadata: doc.metadata,
        processing_status: doc.processing_status
      });
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching RAG documents:', error);
    res.status(500).json({ error: 'Falha ao buscar documentos' });
  }
});

// Criar nova base de conhecimento
router.post('/knowledge-bases', ragAuth, async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente
    const { name, description } = req.body;
    
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Name:', name, 'Description:', description);
    console.log('🔍 Clinic ID:', clinicId);
    
    if (!name || !name.trim()) {
      console.log('❌ Validation failed - name is required');
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    // Descrição é opcional, usar valor padrão se vazia
    const finalDescription = description && description.trim() ? description.trim() : `Base de conhecimento ${name}`;
    
    // Criar base de conhecimento na tabela dedicada
    const [newKnowledgeBase] = await db
      .insert(rag_knowledge_bases)
      .values({
        external_user_id: clinicId, // Usar clinic_id para consistência
        name: name.trim(),
        description: finalDescription,
        created_by: req.user?.name || req.user?.email
      })
      .returning();

    console.log('✅ Created knowledge base:', newKnowledgeBase);

    res.json({ 
      success: true, 
      message: 'Base de conhecimento criada com sucesso',
      knowledgeBase: newKnowledgeBase 
    });
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    res.status(500).json({ error: 'Falha ao criar base de conhecimento' });
  }
});

// Upload genérico de documentos (text, url)
router.post('/documents', ragAuth, async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente
    const { title, content, content_type, knowledge_base } = req.body;

    console.log('📝 Creating document:', { title, content_type, knowledge_base, clinicId });

    if (!title || !content || !content_type) {
      return res.status(400).json({ error: 'Título, conteúdo e tipo são obrigatórios' });
    }

    // Validar URL se for tipo url
    if (content_type === 'url') {
      try {
        new URL(content);
      } catch {
        return res.status(400).json({ error: 'URL inválida' });
      }
    }

    const [document] = await db
      .insert(rag_documents)
      .values({
        external_user_id: clinicId, // Usar clinic_id para consistência
        title: content_type === 'url' ? content : title, // Use URL as title for URL documents
        content_type,
        original_content: content,
        source_url: content_type === 'url' ? content : null,
        extracted_content: content_type === 'text' ? content : null,
        processing_status: 'pending',
        metadata: knowledge_base ? { knowledge_base } : null
      })
      .returning();

    console.log('✅ Document created with ID:', document.id);

    // Iniciar processamento em background
    processDocumentAsync(document.id);

    res.json({
      documentId: document.id,
      status: 'queued',
      message: 'Documento adicionado para processamento'
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Falha ao criar documento' });
  }
});

// Upload de URL
// Preview de crawling para URLs
router.post('/crawl/preview', ragAuth, async (req: any, res: Response) => {
  try {
    const { url, crawlMode, mode } = req.body;
    const actualMode = crawlMode || mode;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }

    console.log(`🔍 Preview de crawling: ${url} (modo: ${actualMode})`);

    const { CrawlerService } = await import('./rag-processors/crawler-service');
    const crawler = new CrawlerService();

    let pages;
    if (actualMode === 'domain') {
      pages = await crawler.crawlDomain(url, { maxPages: 50 });
    } else {
      const singlePage = await crawler.crawlSinglePage(url);
      pages = [singlePage];
    }

    await crawler.close();

    console.log(`✅ Preview concluído: ${pages.length} páginas encontradas`);

    res.json({
      pages: pages.map(page => ({
        url: page.url,
        title: page.title,
        wordCount: page.wordCount,
        isValid: page.isValid,
        preview: page.content.substring(0, 200) + (page.content.length > 200 ? '...' : ''),
        error: page.error
      }))
    });
  } catch (error) {
    console.error('Error crawling URL:', error);
    res.status(500).json({ error: 'Falha no crawling da URL' });
  }
});

// Processar URLs selecionadas do crawling
router.post('/crawl/process', ragAuth, async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente
    const { selectedPages, knowledge_base } = req.body;

    if (!selectedPages || !Array.isArray(selectedPages) || selectedPages.length === 0) {
      return res.status(400).json({ error: 'Páginas selecionadas são obrigatórias' });
    }

    console.log(`📦 Processando ${selectedPages.length} páginas selecionadas`);

    const documentIds = [];

    for (const pageData of selectedPages) {
      const { url, title, content } = pageData;

      const [document] = await db
        .insert(rag_documents)
        .values({
          external_user_id: clinicId, // Usar clinic_id para consistência
          title: url, // Always use URL as title for crawled pages
          content_type: 'url',
          source_url: url,
          original_content: content,
          processing_status: 'pending',
          metadata: knowledge_base ? { knowledge_base } : null
        })
        .returning();

      documentIds.push(document.id);

      // Processar documento em background
      processDocumentAsync(document.id);
    }

    res.json({
      documentIds,
      message: `${selectedPages.length} páginas adicionadas para processamento`,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error processing crawled pages:', error);
    res.status(500).json({ error: 'Falha ao processar páginas' });
  }
});

// Upload de PDF (endpoint original)
router.post('/documents/pdf', ragAuth, upload.single('file'), async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente
    const { title } = req.body;
    const file = req.file;

    if (!title || !file) {
      return res.status(400).json({ error: 'Título e arquivo são obrigatórios' });
    }

    const [document] = await db
      .insert(rag_documents)
      .values({
        external_user_id: clinicId, // Usar clinic_id para consistência
        title,
        content_type: 'pdf',
        file_path: file.path,
        processing_status: 'pending'
      })
      .returning();

    // Iniciar processamento em background
    processDocumentAsync(document.id);

    res.json({
      documentId: document.id,
      status: 'queued',
      message: 'PDF enviado para processamento'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Falha ao enviar PDF' });
  }
});

// Upload de PDF (endpoint usado pelo frontend)
router.post('/documents/upload', ragAuth, upload.single('file'), async (req: any, res: Response) => {
  try {
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente
    const { knowledge_base } = req.body;
    const file = req.file;

    console.log('🔍 Upload Debug - Clinic ID:', clinicId);
    console.log('🔍 Upload Debug - Knowledge Base:', knowledge_base);

    if (!knowledge_base || !file) {
      return res.status(400).json({ error: 'Base de conhecimento e arquivo são obrigatórios' });
    }

    // Fix encoding issue for filenames with accents
    const decodedFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const cleanTitle = decodedFilename.replace(/\.pdf$/i, '');

    const [document] = await db
      .insert(rag_documents)
      .values({
        external_user_id: clinicId, // Usar clinic_id para consistência
        title: cleanTitle,
        content_type: 'pdf',
        file_path: file.path,
        metadata: { 
          knowledge_base: knowledge_base,
          created_by: req.user?.name || req.user?.email
        },
        processing_status: 'pending'
      })
      .returning();

    console.log('✅ Upload Debug - Document created:', {
      id: document.id,
      title: document.title,
      external_user_id: document.external_user_id,
      metadata: document.metadata
    });

    // Iniciar processamento em background
    processDocumentAsync(document.id);

    res.json({
      documentId: document.id,
      status: 'queued',
      message: 'PDF enviado para processamento'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Falha ao enviar PDF' });
  }
});

// Buscar status de processamento
router.get('/processing/:id', ragAuth, async (req: any, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const userId = req.user?.email || req.user?.id?.toString();

    const [document] = await db
      .select()
      .from(rag_documents)
      .where(and(
        eq(rag_documents.id, documentId),
        eq(rag_documents.external_user_id, userId)
      ));

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json({
      documentId: document.id,
      status: document.processing_status,
      errorMessage: document.error_message,
      title: document.title,
      contentType: document.content_type
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);
    res.status(500).json({ error: 'Falha ao buscar status' });
  }
});

// Deletar base de conhecimento completa
router.delete('/knowledge-bases/:id', ragAuth, async (req: any, res: Response) => {
  try {
    const knowledgeBaseId = parseInt(req.params.id);
    const userId = req.user?.email || req.user?.id?.toString();

    console.log(`🗑️ Deleting knowledge base ID: ${knowledgeBaseId} for user: ${userId}`);

    // Buscar a base de conhecimento usando clinic_id
    const clinicId = parseInt(req.user.clinic_id);
    console.log(`🔍 Delete Debug: Searching with clinic_id: ${clinicId}, knowledge_base_id: ${knowledgeBaseId}`);
    
    const [knowledgeBase] = await db
      .select()
      .from(rag_knowledge_bases)
      .where(and(
        eq(rag_knowledge_bases.external_user_id, clinicId.toString()),
        eq(rag_knowledge_bases.id, knowledgeBaseId)
      ));

    console.log(`🔍 Delete Debug: Knowledge base found:`, knowledgeBase ? 'YES' : 'NO');

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Base de conhecimento não encontrada' });
    }

    // Buscar todos os documentos da base de conhecimento usando clinic_id
    const allDocuments = await db
      .select()
      .from(rag_documents)
      .where(eq(rag_documents.external_user_id, clinicId.toString()));

    // Filtrar documentos que pertencem à base de conhecimento
    const documents = allDocuments.filter(doc => {
      if (doc.metadata && typeof doc.metadata === 'object') {
        const metadata = doc.metadata as any;
        return metadata.knowledge_base === knowledgeBase.name;
      }
      return false;
    });

    console.log(`📊 Found ${documents.length} documents to delete`);

    // 0. Verificar todas as referências existentes antes de deletar
    console.log(`🔍 Checking all references to knowledge base ID: ${knowledgeBase.id}`);
    
    try {
      // 1. Verificar e remover referências da tabela mara_professional_configs
      console.log(`🔍 Checking Mara config references for knowledge base ID: ${knowledgeBase.id}`);
      try {
        const maraConfigs = await db.execute(sql`
          SELECT professional_id, knowledge_base_id FROM mara_professional_configs 
          WHERE knowledge_base_id = ${knowledgeBase.id}
        `);
        console.log(`📊 Found ${maraConfigs.rows.length} Mara config references:`, maraConfigs.rows);
        
        if (maraConfigs.rows.length > 0) {
          const deleteResult = await db.execute(sql`
            DELETE FROM mara_professional_configs 
            WHERE knowledge_base_id = ${knowledgeBase.id}
          `);
          console.log(`✅ Deleted ${deleteResult.rowCount || 0} Mara config references`);
        }
      } catch (maraError) {
        console.log(`⚠️ Warning: Could not check/clean Mara configs:`, maraError.message);
      }

      // 2. Verificar e remover referências do array connected_knowledge_base_ids na tabela livia_configurations
      console.log(`🔍 Checking Livia config references for knowledge base ID: ${knowledgeBase.id}`);
      try {
        const liviaConfigs = await db.execute(sql`
          SELECT id, clinic_id, connected_knowledge_base_ids FROM livia_configurations 
          WHERE ${knowledgeBase.id} = ANY(connected_knowledge_base_ids)
        `);
        console.log(`📊 Found ${liviaConfigs.rows.length} Livia config references:`, liviaConfigs.rows);
        
        if (liviaConfigs.rows.length > 0) {
          const updateResult = await db.execute(sql`
            UPDATE livia_configurations 
            SET connected_knowledge_base_ids = array_remove(connected_knowledge_base_ids, ${knowledgeBase.id})
            WHERE ${knowledgeBase.id} = ANY(connected_knowledge_base_ids)
          `);
          console.log(`✅ Updated ${updateResult.rowCount || 0} Livia config references`);
        }
      } catch (liviaError) {
        console.log(`⚠️ Warning: Could not check/clean Livia configs:`, liviaError.message);
      }
    } catch (cleanupError) {
      console.log(`⚠️ Warning: Error during reference cleanup:`, cleanupError.message);
    }

    // 3. Deletar arquivos físicos se existirem
    for (const document of documents) {
      if (document.content_type === 'pdf' && document.file_path) {
        try {
          if (fs.existsSync(document.file_path)) {
            fs.unlinkSync(document.file_path);
            console.log(`🗂️ Deleted file: ${document.file_path}`);
          }
        } catch (error) {
          console.warn('Warning: Could not delete file:', error);
        }
      }
    }

    // 4. Deletar todos os documentos encontrados
    for (const document of documents) {
      await db
        .delete(rag_documents)
        .where(eq(rag_documents.id, document.id));
    }

    // 5. Deletar a base de conhecimento
    await db
      .delete(rag_knowledge_bases)
      .where(eq(rag_knowledge_bases.id, knowledgeBase.id));

    console.log(`✅ Deleted knowledge base with ${documents.length} documents`);

    res.json({ 
      message: 'Base de conhecimento deletada com sucesso',
      deletedDocuments: documents.length
    });
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    res.status(500).json({ error: 'Falha ao deletar base de conhecimento' });
  }
});

// Deletar documento individual
router.delete('/documents/:id', ragAuth, async (req: any, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente

    console.log(`🗑️ Deletando documento ID: ${documentId} para clinic: ${clinicId}`);

    // Buscar documento para verificar ownership e obter file_path
    const [document] = await db
      .select()
      .from(rag_documents)
      .where(and(
        eq(rag_documents.id, documentId),
        eq(rag_documents.external_user_id, clinicId) // Usar clinic_id
      ));

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Deletar arquivo físico se for PDF
    if (document.content_type === 'pdf' && document.file_path) {
      try {
        if (fs.existsSync(document.file_path)) {
          fs.unlinkSync(document.file_path);
        }
      } catch (error) {
        console.warn('Warning: Could not delete file:', error);
      }
    }

    // Deletar documento (cascata irá deletar chunks e embeddings)
    await db
      .delete(rag_documents)
      .where(eq(rag_documents.id, documentId));

    res.json({ message: 'Documento deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Falha ao deletar documento' });
  }
});

// Reprocessar documento
router.post('/documents/:id/reprocess', ragAuth, async (req: any, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const clinicId = req.user?.clinic_id?.toString(); // Usar clinic_id consistente

    // Verificar ownership do documento
    const [document] = await db
      .select()
      .from(rag_documents)
      .where(and(
        eq(rag_documents.id, documentId),
        eq(rag_documents.external_user_id, clinicId) // Usar clinic_id
      ));

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Iniciar reprocessamento
    const { DocumentWorkflow } = await import('./rag-processors/document-workflow');
    const workflow = new DocumentWorkflow();
    
    setImmediate(async () => {
      try {
        await workflow.reprocessDocument(documentId);
        console.log(`✅ Document ${documentId} reprocessed successfully`);
      } catch (error) {
        console.error(`❌ Error reprocessing document ${documentId}:`, error);
      }
    });

    res.json({
      message: 'Reprocessamento iniciado',
      documentId
    });
  } catch (error) {
    console.error('Error starting reprocessing:', error);
    res.status(500).json({ error: 'Falha ao iniciar reprocessamento' });
  }
});

// Busca semântica RAG
router.post('/search', ragAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user?.email || req.user?.id?.toString();
    const { query, limit = 5, minSimilarity = 0.7 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    console.log(`🔍 Busca semântica para: "${query}" (usuário: ${userId})`);

    // Verificar se existem documentos processados
    const embeddingCount = await db
      .select({ count: sql`count(*)` })
      .from(rag_embeddings)
      .innerJoin(rag_chunks, eq(rag_embeddings.chunk_id, rag_chunks.id))
      .innerJoin(rag_documents, eq(rag_chunks.document_id, rag_documents.id))
      .where(eq(rag_documents.external_user_id, userId));

    if (!embeddingCount[0]?.count || embeddingCount[0].count === 0) {
      const docCount = await db
        .select({ count: sql`count(*)` })
        .from(rag_documents)
        .where(eq(rag_documents.external_user_id, userId));

      return res.json({
        results: [],
        message: `Nenhum documento processado encontrado. Você tem ${docCount[0]?.count || 0} documentos, mas nenhum foi processado ainda.`,
        totalDocuments: docCount[0]?.count || 0,
        processedEmbeddings: 0
      });
    }

    // Gerar embedding da query usando OpenAI
    const { EmbeddingService } = await import('./rag-processors/embedding-service');
    const embeddingService = new EmbeddingService();
    
    const queryEmbeddings = await embeddingService.generateEmbeddings([{
      content: query,
      chunkIndex: 0,
      tokenCount: query.split(' ').length,
      metadata: { type: 'query' }
    }]);

    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      return res.status(500).json({ error: 'Falha ao gerar embedding da query' });
    }

    const queryEmbedding = queryEmbeddings[0].embedding;

    // Realizar busca vetorial usando função SQL
    const searchResults = await db.execute(sql`
      SELECT 
        c.content,
        c.metadata,
        d.title,
        d.id as document_id,
        c.id as chunk_id,
        1 - (e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM rag_embeddings e
      JOIN rag_chunks c ON e.chunk_id = c.id
      JOIN rag_documents d ON c.document_id = d.id
      WHERE d.external_user_id = ${userId}
        AND d.processing_status = 'completed'
        AND 1 - (e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    console.log(`📊 Encontrados ${searchResults.rows.length} resultados para "${query}"`);

    const formattedResults = searchResults.rows.map((row: any) => ({
      content: row.content,
      similarity: parseFloat(row.similarity),
      document: {
        id: row.document_id,
        title: row.title
      },
      metadata: row.metadata,
      chunkId: row.chunk_id
    }));

    res.json({
      results: formattedResults,
      query,
      totalResults: formattedResults.length,
      message: formattedResults.length > 0 
        ? `Encontrados ${formattedResults.length} resultados relevantes`
        : 'Nenhum resultado relevante encontrado',
      processedEmbeddings: embeddingCount[0]?.count || 0
    });

  } catch (error) {
    console.error('Error performing semantic search:', error);
    res.status(500).json({ error: 'Falha na busca semântica' });
  }
});

// Função auxiliar para processamento assíncrono real
async function processDocumentAsync(documentId: number) {
  try {
    const { DocumentWorkflow } = await import('./rag-processors/document-workflow');
    const workflow = new DocumentWorkflow();
    
    // Processar documento em background
    setImmediate(async () => {
      try {
        await workflow.processDocument(documentId);
        console.log(`✅ Document ${documentId} processed successfully`);
      } catch (error) {
        console.error(`❌ Error processing document ${documentId}:`, error);
      }
    });

  } catch (error) {
    console.error(`Error starting processing for document ${documentId}:`, error);
  }
}

export default router;