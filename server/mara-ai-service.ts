import OpenAI from 'openai';
import { IStorage } from './storage.js';
import { db } from './db.js';
import { sql } from 'drizzle-orm';

interface ContactContext {
  contact: any;
  appointments: any[];
  medicalRecords: any[];
  anamnesisResponses: any[];
  clinicInfo?: any;
}

interface MaraResponse {
  response: string;
}

interface RAGResult {
  content: string;
  metadata: any;
  similarity: number;
}

interface MaraConfig {
  knowledgeBaseId?: number;
  knowledgeBaseName?: string;
  isActive: boolean;
}

export class MaraAIService {
  private openai: OpenAI;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.storage = storage;
  }

  async analyzeContact(contactId: number, question: string, userId?: number): Promise<MaraResponse> {
    try {
      console.log('🤖 Mara AI: Iniciando análise do contato', contactId);
      console.log('📝 Pergunta recebida:', question);
      console.log('👤 User ID:', userId);
      
      // Buscar contexto completo do contato
      console.log('📊 Buscando contexto do contato...');
      const context = await this.getContactContext(contactId);
      console.log('📋 Contexto obtido:', {
        contactName: context.contact?.name,
        appointmentsCount: context.appointments?.length || 0,
        medicalRecordsCount: context.medicalRecords?.length || 0
      });
      
      // Buscar informações do usuário logado
      let currentUser = null;
      if (userId) {
        try {
          currentUser = await this.storage.getUser(userId);
          console.log('👤 Usuário encontrado:', currentUser?.name);
        } catch (error: any) {
          console.log('⚠️ Não foi possível buscar dados do usuário:', error.message);
        }
      }

      // Buscar configuração Mara do profissional
      let maraConfig: MaraConfig | null = null;
      let ragContext = '';
      
      if (userId && context.contact?.clinic_id) {
        try {
          maraConfig = await this.getMaraConfigForProfessional(userId, context.contact.clinic_id);
          console.log('⚙️ Configuração Mara:', maraConfig);

          // Se tiver base de conhecimento conectada, fazer busca RAG
          if (maraConfig?.knowledgeBaseId) {
            console.log('🔍 Buscando conhecimento na base RAG:', maraConfig.knowledgeBaseId);
            const ragResults = await this.searchRAGKnowledge(question, maraConfig.knowledgeBaseId);
            ragContext = this.formatRAGContext(ragResults);
            console.log('📚 Contexto RAG obtido:', ragContext ? `Sim (${ragContext.length} chars)` : 'Não');
            console.log('📝 RAG Context Preview:', ragContext.substring(0, 200) + '...');
          }
        } catch (error: any) {
          console.log('⚠️ Erro ao buscar configuração Mara:', error.message);
        }
      }
      
      // Criar prompt com contexto híbrido (dados paciente + conhecimento RAG)
      const systemPrompt = this.createEnhancedSystemPrompt(context, currentUser, ragContext, maraConfig);
      console.log('📝 Prompt criado, enviando para OpenAI...');

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      const result = response.choices[0].message.content || "Desculpe, não consegui processar sua pergunta.";
      console.log('✅ Resposta gerada com sucesso');
      
      return {
        response: result
      };

    } catch (error: any) {
      console.error('❌ Erro na Mara AI:', error);
      console.error('Stack trace:', error.stack);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return {
        response: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente."
      };
    }
  }

  private async getContactContext(contactId: number): Promise<ContactContext> {
    try {
      if (!this.storage) {
        throw new Error('Storage not initialized');
      }

      const contact = await this.storage.getContact(contactId);
      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }

      // Get appointments for this contact by filtering clinic appointments
      const allAppointments = await this.storage.getAppointments(contact.clinic_id, {});
      const appointments = allAppointments.filter(apt => apt.contact_id === contactId);
      
      // Get medical records for this contact
      const medicalRecords = await this.storage.getMedicalRecords(contactId);
      
      // Get anamnesis responses for this contact - simplified for now
      const anamnesisResponses: any[] = [];
      console.log('Info: Anamnesis integration will be added later');
      
      let clinicInfo = null;
      if (contact?.clinic_id) {
        clinicInfo = await this.storage.getClinic(contact.clinic_id);
      }

      return {
        contact,
        appointments,
        medicalRecords,
        anamnesisResponses,
        clinicInfo
      };
    } catch (error) {
      console.error('Error in getContactContext:', error);
      throw error;
    }
  }

  private createSimpleSystemPrompt(context: ContactContext, currentUser?: any): string {
    const { contact, appointments, medicalRecords, anamnesisResponses, clinicInfo } = context;
    
    return `Você é Mara, uma assistente médica conversacional e amigável da ${clinicInfo?.name || 'clínica'}.

PROFISSIONAL CONVERSANDO:
${currentUser ? `Nome: ${currentUser.name}
Email: ${currentUser.email}
Função: ${currentUser.role === 'admin' ? 'Administrador' : 'Profissional'}` : 'Usuário não identificado'}

NOSSA CLÍNICA:
${clinicInfo ? `Nome: ${clinicInfo.name}
${clinicInfo.address ? `Endereço: ${clinicInfo.address}` : ''}
${clinicInfo.phone ? `Telefone: ${clinicInfo.phone}` : ''}
Especialidade: ${clinicInfo.specialty || 'Medicina Geral'}` : 'Informações da clínica não disponíveis'}

DADOS DO PACIENTE:
Nome: ${contact.name}
${contact.phone ? `Telefone: ${contact.phone}` : ''}
${contact.email ? `Email: ${contact.email}` : ''}
Status: ${contact.status}
${contact.notes ? `Observações: ${contact.notes}` : ''}

HISTÓRICO DE CONSULTAS (${appointments.length}):
${appointments.map(apt => `• ${new Date(apt.scheduled_date).toLocaleDateString('pt-BR')} - ${apt.appointment_type} com ${apt.doctor_name}
  Especialidade: ${apt.specialty} | Status: ${apt.status}${apt.session_notes ? `
  Notas: ${apt.session_notes}` : ''}`).join('\n\n')}

PRONTUÁRIOS (${medicalRecords.length}):
${medicalRecords.map(record => `• ${new Date(record.created_at).toLocaleDateString('pt-BR')} - ${record.record_type}${record.chief_complaint ? `
  Queixa: ${record.chief_complaint}` : ''}${record.diagnosis ? `
  Diagnóstico: ${record.diagnosis}` : ''}${record.treatment_plan ? `
  Tratamento: ${record.treatment_plan}` : ''}${record.observations ? `
  Obs: ${record.observations}` : ''}`).join('\n\n')}

INSTRUÇÕES:
- Se dirija ao profissional pelo nome quando apropriado
- Represente nossa clínica de forma profissional
- Responda de forma natural e conversacional
- Use os dados acima para fundamentar suas respostas
- Seja concisa mas informativa (2-4 parágrafos curtos)
- Use quebras de linha entre parágrafos para facilitar leitura
- Não invente informações que não estão nos dados
- Use linguagem médica apropriada mas acessível
- Responda diretamente o que foi perguntado`;
  }

  async generatePatientSummary(contactId: number): Promise<string> {
    try {
      const result = await this.analyzeContact(contactId, 'Faça um resumo geral deste paciente destacando os pontos principais do histórico médico.');
      return result.response;
      
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      return "Não foi possível gerar o resumo do paciente.";
    }
  }

  // RAG Integration Methods
  async getMaraConfigForProfessional(userId: number, clinicId: number): Promise<MaraConfig | null> {
    try {
      const result = await db.execute(sql`
        SELECT 
          mpc.knowledge_base_id,
          mpc.is_active,
          kb.name as knowledge_base_name
        FROM mara_professional_configs mpc
        LEFT JOIN rag_knowledge_bases kb ON mpc.knowledge_base_id = kb.id
        WHERE mpc.professional_id = ${userId} AND mpc.clinic_id = ${clinicId} AND mpc.is_active = true
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const config = result.rows[0] as any;
      return {
        knowledgeBaseId: config.knowledge_base_id as number,
        knowledgeBaseName: config.knowledge_base_name as string,
        isActive: config.is_active as boolean
      };
    } catch (error) {
      console.error('Error fetching Mara config:', error);
      return null;
    }
  }

  async searchRAGKnowledge(query: string, knowledgeBaseId: number): Promise<RAGResult[]> {
    console.log(`🔍 RAG Debug: Searching knowledge base ${knowledgeBaseId} for query: "${query}"`);
    
    try {
      // First, check if the knowledge base exists and has documents
      const kbCheck = await db.execute(sql`
        SELECT COUNT(*) as total_docs 
        FROM rag_documents 
        WHERE id IN (
          SELECT DISTINCT document_id 
          FROM rag_chunks 
          WHERE document_id IN (
            SELECT id FROM rag_documents 
            WHERE external_user_id = (
              SELECT external_user_id 
              FROM rag_knowledge_bases 
              WHERE id = ${knowledgeBaseId}
            )
          )
        )
      `);
      
      console.log(`📊 RAG Debug: Knowledge base ${knowledgeBaseId} has ${kbCheck.rows[0]?.total_docs || 0} documents`);
      
      // Check chunks availability
      const chunksCheck = await db.execute(sql`
        SELECT COUNT(*) as total_chunks
        FROM rag_chunks rc
        JOIN rag_documents rd ON rc.document_id = rd.id
        WHERE rd.external_user_id = (
          SELECT external_user_id 
          FROM rag_knowledge_bases 
          WHERE id = ${knowledgeBaseId}
        )
      `);
      
      console.log(`📊 RAG Debug: Knowledge base ${knowledgeBaseId} has ${chunksCheck.rows[0]?.total_chunks || 0} chunks`);
      
      // Check embeddings availability
      const embeddingsCheck = await db.execute(sql`
        SELECT COUNT(*) as total_embeddings
        FROM rag_embeddings re
        JOIN rag_chunks rc ON re.chunk_id = rc.id
        JOIN rag_documents rd ON rc.document_id = rd.id
        WHERE rd.external_user_id = (
          SELECT external_user_id 
          FROM rag_knowledge_bases 
          WHERE id = ${knowledgeBaseId}
        )
      `);
      
      console.log(`📊 RAG Debug: Knowledge base ${knowledgeBaseId} has ${embeddingsCheck.rows[0]?.total_embeddings || 0} embeddings`);
      
      // First, generate embedding for the query using the EmbeddingService
      const { EmbeddingService } = await import('./rag-processors/embedding-service.js');
      const embeddingService = new EmbeddingService();
      const queryEmbedding = await embeddingService.generateSingleEmbedding(query);
      
      console.log(`🔍 RAG Debug: Generated query embedding with ${queryEmbedding.length} dimensions`);
      
      // Convert embedding array to PostgreSQL vector format
      const embeddingVector = `[${queryEmbedding.join(',')}]`;
      
      // Perform similarity search using proper table structure
      const result = await db.execute(sql`
        SELECT 
          rc.content, 
          rc.metadata, 
          1 - (re.embedding <=> ${embeddingVector}::vector) as similarity,
          rd.title as document_title
        FROM rag_chunks rc
        JOIN rag_documents rd ON rc.document_id = rd.id
        JOIN rag_embeddings re ON re.chunk_id = rc.id
        WHERE rd.external_user_id = (
          SELECT external_user_id 
          FROM rag_knowledge_bases 
          WHERE id = ${knowledgeBaseId}
        )
        ORDER BY re.embedding <=> ${embeddingVector}::vector
        LIMIT 5
      `);

      console.log(`🎯 RAG Debug: Query returned ${result.rows.length} results`);
      
      const results = result.rows.map(row => ({
        content: row.content as string,
        metadata: row.metadata,
        similarity: parseFloat(row.similarity as string)
      }));
      
      console.log(`📋 RAG Debug: Top result similarity: ${results[0]?.similarity || 'N/A'}`);
      
      return results;
    } catch (error) {
      console.error('❌ RAG Debug: Error searching RAG knowledge:', error);
      return [];
    }
  }

  formatRAGContext(ragResults: RAGResult[]): string {
    if (ragResults.length === 0) {
      return '';
    }

    const contextChunks = ragResults
      .filter(result => result.similarity > 0.2) // Lowered threshold for better coverage
      .slice(0, 5) // Top 5 most relevant chunks
      .map(result => result.content)
      .join('\n\n');

    return contextChunks;
  }

  createEnhancedSystemPrompt(context: ContactContext, currentUser: any, ragContext: string, maraConfig: MaraConfig | null): string {
    let prompt = `Você é a Mara, uma assistente médica inteligente especializada em análise de pacientes.`;

    // Add professional context
    if (currentUser) {
      prompt += `\n\nPROFISSIONAL:
Nome: ${currentUser.name}
Função: ${currentUser.role}`;
      
      if (maraConfig?.knowledgeBaseName) {
        prompt += `\nBase de Conhecimento: ${maraConfig.knowledgeBaseName}`;
      }
    }

    // Add specialized knowledge context if available
    if (ragContext) {
      prompt += `\n\nCONHECIMENTO ESPECIALIZADO:
${ragContext}`;
    }

    // Add patient context (existing logic)
    prompt += `\n\nDADOS DO PACIENTE:`;
    
    if (context.contact) {
      prompt += `\nNome: ${context.contact.name}`;
      if (context.contact.age) prompt += `\nIdade: ${context.contact.age} anos`;
      if (context.contact.phone) prompt += `\nTelefone: ${context.contact.phone}`;
      if (context.contact.email) prompt += `\nEmail: ${context.contact.email}`;
      if (context.contact.notes) prompt += `\nObservações: ${context.contact.notes}`;
    }

    // Add medical history
    if (context.appointments && context.appointments.length > 0) {
      prompt += `\n\nHISTÓRICO DE CONSULTAS:`;
      context.appointments.forEach((apt: any, index: number) => {
        prompt += `\n${index + 1}. Data: ${apt.date_time} - Tipo: ${apt.appointment_type || 'Consulta'} - Status: ${apt.status}`;
        if (apt.notes) prompt += ` - Observações: ${apt.notes}`;
      });
    }

    if (context.medicalRecords && context.medicalRecords.length > 0) {
      prompt += `\n\nREGISTROS MÉDICOS:`;
      context.medicalRecords.forEach((record: any, index: number) => {
        prompt += `\n${index + 1}. ${record.date}: ${record.description}`;
        if (record.diagnosis) prompt += ` - Diagnóstico: ${record.diagnosis}`;
        if (record.treatment) prompt += ` - Tratamento: ${record.treatment}`;
      });
    }

    if (context.anamnesisResponses && context.anamnesisResponses.length > 0) {
      prompt += `\n\nRESPOSTAS DE ANAMNESE:`;
      context.anamnesisResponses.forEach((response: any, index: number) => {
        prompt += `\n${index + 1}. ${response.question}: ${response.answer}`;
      });
    }

    // Instructions
    prompt += `\n\nINSTRUÇÕES:
- Analise os dados do paciente de forma profissional e empática
- Use o conhecimento especializado quando relevante, mas sempre priorize os dados específicos do paciente
- Seja concisa mas informativa (2-4 parágrafos curtos)
- Use quebras de linha entre parágrafos para facilitar leitura
- Não invente informações que não estão nos dados
- Use linguagem médica apropriada mas acessível
- Responda diretamente o que foi perguntado`;

    if (ragContext) {
      prompt += `\n- Integre o conhecimento especializado de forma natural quando aplicável`;
    }

    return prompt;
  }
}

// Export da classe para instanciação nas rotas