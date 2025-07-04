import { Request, Response } from 'express';
import { isAuthenticated } from './auth.js';
import { IStorage } from './storage.js';
import { db } from './db.js';
import { sql } from 'drizzle-orm';

export function setupAnamnesisManagementRoutes(app: any, storage: IStorage) {
  
  // GET /api/anamneses - Lista de modelos
  app.get('/api/anamneses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Get user's clinic ID - super admin gets default clinic
      let userClinicId = 1;
      if (user.role !== 'super_admin') {
        const userClinics = await storage.getUserClinics(user.id);
        if (userClinics && userClinics.length > 0) {
          userClinicId = userClinics[0].id;
        }
      }
      
      const templates = await db.execute(sql`
        SELECT id, name, description, created_at, updated_at,
               COALESCE(
                 (SELECT COUNT(*) FROM jsonb_array_elements(fields->'questions')),
                 0
               ) as question_count
        FROM anamnesis_templates 
        WHERE clinic_id = ${userClinicId} AND is_active = true
        ORDER BY created_at DESC
      `);
      
      res.json(templates.rows);
    } catch (error) {
      console.error('❌ Error fetching anamnesis templates:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/anamneses - Criar modelo
  app.post('/api/anamneses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Get user's clinic ID - super admin gets default clinic
      let userClinicId = 1;
      if (user.role !== 'super_admin') {
        const userClinics = await storage.getUserClinics(user.id);
        if (userClinics && userClinics.length > 0) {
          userClinicId = userClinics[0].id;
        }
      }
      const { name, description, copyFromId, questions } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome da anamnese é obrigatório' });
      }

      let templateQuestions = questions || [];

      // Se está copiando de outro modelo
      if (copyFromId) {
        const sourceTemplate = await db.execute(sql`
          SELECT fields FROM anamnesis_templates 
          WHERE id = ${copyFromId} AND clinic_id = ${userClinicId}
        `);
        
        if (sourceTemplate.rows.length > 0) {
          const sourceFields = sourceTemplate.rows[0].fields as any;
          templateQuestions = sourceFields?.questions || [];
        }
      }

      const fields = {
        questions: templateQuestions
      };

      const result = await db.execute(sql`
        INSERT INTO anamnesis_templates (clinic_id, name, description, fields, is_default, is_active)
        VALUES (${userClinicId}, ${name}, ${description || ''}, ${JSON.stringify(fields)}, false, true)
        RETURNING id, name, description, created_at
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('❌ Error creating anamnesis template:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // GET /api/anamneses/:id/editar - Buscar modelo para edição
  app.get('/api/anamneses/:id/editar', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Get user's clinic ID - super admin gets default clinic
      let userClinicId = 1;
      if (user.role !== 'super_admin') {
        const userClinics = await storage.getUserClinics(user.id);
        if (userClinics && userClinics.length > 0) {
          userClinicId = userClinics[0].id;
        }
      }
      const { id } = req.params;

      const template = await db.execute(sql`
        SELECT id, name, description, fields, created_at, updated_at
        FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId} AND is_active = true
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      res.json(template.rows[0]);
    } catch (error) {
      console.error('❌ Error fetching anamnesis template:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // PUT /api/anamneses/:id - Atualizar modelo
  app.put('/api/anamneses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Get user's clinic ID - super admin gets default clinic
      let userClinicId = 1;
      if (user.role !== 'super_admin') {
        const userClinics = await storage.getUserClinics(user.id);
        if (userClinics && userClinics.length > 0) {
          userClinicId = userClinics[0].id;
        }
      }
      const { id } = req.params;
      const { name, description, questions } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome da anamnese é obrigatório' });
      }

      const fields = {
        questions: questions || []
      };

      const result = await db.execute(sql`
        UPDATE anamnesis_templates 
        SET name = ${name}, 
            description = ${description || ''}, 
            fields = ${JSON.stringify(fields)},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
        RETURNING id, name, description, updated_at
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('❌ Error updating anamnesis template:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // DELETE /api/anamneses/:id - Excluir modelo
  app.delete('/api/anamneses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userClinicId = user.clinic_id || 1;
      const { id } = req.params;

      // Não permitir excluir modelos padrão
      const template = await db.execute(sql`
        SELECT is_default FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      if (template.rows[0].is_default) {
        return res.status(400).json({ error: 'Não é possível excluir modelos padrão' });
      }

      await db.execute(sql`
        UPDATE anamnesis_templates 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error deleting anamnesis template:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/anamneses/:id/perguntas - Adicionar pergunta
  app.post('/api/anamneses/:id/perguntas', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userClinicId = user.clinic_id || 1;
      const { id } = req.params;
      const { pergunta, tipo, showAlert, alertText, addToAllTemplates } = req.body;

      if (!pergunta || !tipo) {
        return res.status(400).json({ error: 'Pergunta e tipo são obrigatórios' });
      }

      // Buscar template atual
      const template = await db.execute(sql`
        SELECT fields FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId} AND is_active = true
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      const currentFields = template.rows[0].fields as any;
      const questions = currentFields?.questions || [];

      // Gerar novo ID para a pergunta
      const newQuestionId = (questions.length + 1).toString();

      const newQuestion = {
        id: newQuestionId,
        text: pergunta,
        type: tipo,
        required: true,
        showAlert: showAlert || false,
        alertText: alertText || '',
        hasAdditional: tipo === 'sim_nao_nao_sei_texto'
      };

      questions.push(newQuestion);

      const updatedFields = {
        questions: questions
      };

      // Atualizar template atual
      await db.execute(sql`
        UPDATE anamnesis_templates 
        SET fields = ${JSON.stringify(updatedFields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      // Se solicitado, adicionar a pergunta em todos os modelos
      if (addToAllTemplates) {
        const allTemplates = await db.execute(sql`
          SELECT id, fields FROM anamnesis_templates 
          WHERE clinic_id = ${userClinicId} AND is_active = true AND id != ${id}
        `);

        for (const otherTemplate of allTemplates.rows) {
          const otherFields = otherTemplate.fields as any;
          const otherQuestions = otherFields?.questions || [];
          const otherNewQuestionId = (otherQuestions.length + 1).toString();
          
          otherQuestions.push({
            ...newQuestion,
            id: otherNewQuestionId
          });

          await db.execute(sql`
            UPDATE anamnesis_templates 
            SET fields = ${JSON.stringify({ questions: otherQuestions })}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${otherTemplate.id}
          `);
        }
      }

      res.json(newQuestion);
    } catch (error) {
      console.error('❌ Error adding question:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // PUT /api/anamneses/:id/perguntas/:perguntaId - Editar pergunta
  app.put('/api/anamneses/:id/perguntas/:perguntaId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userClinicId = user.clinic_id || 1;
      const { id, perguntaId } = req.params;
      const { pergunta, tipo, showAlert, alertText } = req.body;

      const template = await db.execute(sql`
        SELECT fields FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId} AND is_active = true
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      const currentFields = template.rows[0].fields as any;
      const questions = currentFields?.questions || [];

      const questionIndex = questions.findIndex((q: any) => q.id === perguntaId);
      if (questionIndex === -1) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }

      // Atualizar pergunta
      questions[questionIndex] = {
        ...questions[questionIndex],
        text: pergunta,
        type: tipo,
        showAlert: showAlert || false,
        alertText: alertText || '',
        hasAdditional: tipo === 'sim_nao_nao_sei_texto'
      };

      const updatedFields = { questions };

      await db.execute(sql`
        UPDATE anamnesis_templates 
        SET fields = ${JSON.stringify(updatedFields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      res.json(questions[questionIndex]);
    } catch (error) {
      console.error('❌ Error updating question:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // DELETE /api/anamneses/:id/perguntas/:perguntaId - Remover pergunta
  app.delete('/api/anamneses/:id/perguntas/:perguntaId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userClinicId = user.clinic_id || 1;
      const { id, perguntaId } = req.params;

      const template = await db.execute(sql`
        SELECT fields FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId} AND is_active = true
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      const currentFields = template.rows[0].fields as any;
      const questions = currentFields?.questions || [];

      const filteredQuestions = questions.filter((q: any) => q.id !== perguntaId);

      const updatedFields = { questions: filteredQuestions };

      await db.execute(sql`
        UPDATE anamnesis_templates 
        SET fields = ${JSON.stringify(updatedFields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error removing question:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // POST /api/anamneses/:id/perguntas/reorder - Reordenar perguntas
  app.post('/api/anamneses/:id/perguntas/reorder', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const userClinicId = user.clinic_id || 1;
      const { id } = req.params;
      const { order } = req.body;

      if (!order || !Array.isArray(order)) {
        return res.status(400).json({ error: 'Order array is required' });
      }

      const template = await db.execute(sql`
        SELECT fields FROM anamnesis_templates 
        WHERE id = ${id} AND clinic_id = ${userClinicId} AND is_active = true
      `);

      if (template.rows.length === 0) {
        return res.status(404).json({ error: 'Modelo de anamnese não encontrado' });
      }

      const fields = template.rows[0].fields as any;
      const questions = fields.questions || [];

      // Reorder questions based on the provided order
      const reorderedQuestions = order.map((questionId: string) => {
        return questions.find((q: any) => q.id === questionId);
      }).filter(Boolean);

      const updatedFields = { questions: reorderedQuestions };

      await db.execute(sql`
        UPDATE anamnesis_templates 
        SET fields = ${JSON.stringify(updatedFields)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND clinic_id = ${userClinicId}
      `);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error reordering questions:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}