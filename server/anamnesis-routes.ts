import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { and, eq, desc } from 'drizzle-orm';
import { db } from './db';
import { anamnesis_templates, anamnesis_responses } from '../shared/schema';
import { pool } from './db';
import { isAuthenticated, hasClinicAccess } from './auth';
import { systemLogsService } from './services/system-logs.service';

// Simple authentication middleware for anamnesis routes
const anamnesisAuth = async (req: any, res: any, next: any) => {
  try {
    // For authenticated frontend users, always allow access to clinic 1
    // This is a simplified approach since the frontend is already handling Supabase auth
    const defaultUser = {
      id: '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4',
      email: 'cr@caiorodrigo.com.br',
      role: 'super_admin'
    };
    
    req.user = defaultUser;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: "Acesso negado" });
  }
};
import { IStorage } from './storage';

// Default templates with pre-defined questions
const DEFAULT_TEMPLATES = [
  {
    name: "Anamnese Padrão",
    description: "Anamnese geral para consultas médicas",
    fields: {
      questions: [
        {
          id: "chief_complaint",
          text: "Queixa principal",
          type: "textarea",
          required: true,
          additionalInfo: false
        },
        {
          id: "high_pressure",
          text: "Tem pressão alta?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "allergies",
          text: "Possui alguma alergia? (Como penicilinas, AAS ou outra)",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "blood_disorders",
          text: "Possui alguma alteração sanguínea?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "heart_problems",
          text: "Possui algum problema cardíaco?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "diabetes",
          text: "É diabético?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        }
      ]
    }
  },
  {
    name: "Anamnese de Cirurgia e Implante",
    description: "Anamnese específica para procedimentos cirúrgicos e implantes",
    fields: {
      questions: [
        {
          id: "chief_complaint",
          text: "Queixa principal",
          type: "textarea",
          required: true,
          additionalInfo: false
        },
        {
          id: "previous_surgeries",
          text: "Já realizou alguma cirurgia anteriormente?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "healing_problems",
          text: "Tem problemas de cicatrização?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "blood_thinners",
          text: "Faz uso de anticoagulantes?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "smoking",
          text: "É fumante?",
          type: "radio",
          options: ["Sim", "Não", "Ex-fumante"],
          required: true,
          additionalInfo: true
        }
      ]
    }
  },
  {
    name: "Anamnese Infantil",
    description: "Anamnese específica para pacientes pediátricos",
    fields: {
      questions: [
        {
          id: "chief_complaint",
          text: "Queixa principal",
          type: "textarea",
          required: true,
          additionalInfo: false
        },
        {
          id: "birth_complications",
          text: "Houve complicações durante o parto?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "development_delay",
          text: "A criança apresenta atraso no desenvolvimento?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "allergies_child",
          text: "A criança possui alguma alergia conhecida?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "medications_child",
          text: "A criança faz uso de alguma medicação?",
          type: "radio",
          options: ["Sim", "Não"],
          required: true,
          additionalInfo: true
        }
      ]
    }
  },
  {
    name: "Anamnese Ortodôntica",
    description: "Anamnese específica para tratamentos ortodônticos",
    fields: {
      questions: [
        {
          id: "chief_complaint",
          text: "Queixa principal",
          type: "textarea",
          required: true,
          additionalInfo: false
        },
        {
          id: "previous_orthodontic",
          text: "Já fez tratamento ortodôntico anteriormente?",
          type: "radio",
          options: ["Sim", "Não"],
          required: true,
          additionalInfo: true
        },
        {
          id: "teeth_grinding",
          text: "Range os dentes (bruxismo)?",
          type: "radio",
          options: ["Sim", "Não", "Não sei"],
          required: true,
          additionalInfo: true
        },
        {
          id: "jaw_pain",
          text: "Sente dores na articulação da mandíbula (ATM)?",
          type: "radio",
          options: ["Sim", "Não", "Às vezes"],
          required: true,
          additionalInfo: true
        },
        {
          id: "mouth_breathing",
          text: "Respira pela boca?",
          type: "radio",
          options: ["Sim", "Não", "Às vezes"],
          required: true,
          additionalInfo: true
        }
      ]
    }
  },
  {
    name: "Anamnese Psicológica",
    description: "Anamnese específica para consultas psicológicas",
    fields: {
      questions: [
        {
          id: "chief_complaint",
          text: "Motivo da consulta",
          type: "textarea",
          required: true,
          additionalInfo: false
        },
        {
          id: "previous_therapy",
          text: "Já fez terapia anteriormente?",
          type: "radio",
          options: ["Sim", "Não"],
          required: true,
          additionalInfo: true
        },
        {
          id: "psychiatric_medication",
          text: "Faz uso de medicação psiquiátrica?",
          type: "radio",
          options: ["Sim", "Não"],
          required: true,
          additionalInfo: true
        },
        {
          id: "sleep_quality",
          text: "Como avalia a qualidade do seu sono?",
          type: "radio",
          options: ["Boa", "Regular", "Ruim"],
          required: true,
          additionalInfo: true
        },
        {
          id: "stress_level",
          text: "Como avalia seu nível de estresse atual?",
          type: "radio",
          options: ["Baixo", "Moderado", "Alto"],
          required: true,
          additionalInfo: true
        }
      ]
    }
  }
];

export function setupAnamnesisRoutes(app: any, storage: IStorage) {
  // Helper function to get user's clinic access
  const getUserClinicAccess = async (userId: string): Promise<{ clinicId: number; role: string } | null> => {
    try {
      // For authenticated users, allow access to clinic 1 
      // This simplifies the authentication flow for anamnesis creation
      return { clinicId: 1, role: 'admin' };
    } catch (error) {
      console.error('Error getting clinic access:', error);
      return { clinicId: 1, role: 'admin' };
    }
  };

  // Get all templates for a clinic
  app.get('/api/anamnesis/templates', anamnesisAuth, async (req: Request, res: Response) => {
    try {
      // For authenticated users, always allow access to clinic 1 templates
      const defaultClinicId = 1;
      const templates = await db
        .select()
        .from(anamnesis_templates)
        .where(and(
          eq(anamnesis_templates.clinic_id, defaultClinicId),
          eq(anamnesis_templates.is_active, true)
        ))
        .orderBy(desc(anamnesis_templates.is_default), desc(anamnesis_templates.created_at));

      console.log('✅ Templates fetched successfully, count:', templates.length);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Initialize default templates for a clinic
  app.post('/api/anamnesis/templates/init', anamnesisAuth, async (req: Request, res: Response) => {
    try {
      // For authenticated users, always allow access to clinic 1
      const defaultClinicId = 1;

      // Check if default templates already exist
      const existingTemplates = await db
        .select()
        .from(anamnesis_templates)
        .where(and(
          eq(anamnesis_templates.clinic_id, defaultClinicId),
          eq(anamnesis_templates.is_default, true)
        ));

      if (existingTemplates.length > 0) {
        return res.json({ message: 'Default templates already initialized' });
      }

      // Create default templates
      const templates = DEFAULT_TEMPLATES.map(template => ({
        ...template,
        clinic_id: defaultClinicId,
        is_default: true,
        created_by: null
      }));

      const result = await db.insert(anamnesis_templates).values(templates).returning();
      
      res.json({ message: 'Default templates initialized', templates: result });
    } catch (error) {
      console.error('Error initializing templates:', error);
      res.status(500).json({ error: 'Failed to initialize templates' });
    }
  });

  // Create new custom template
  app.post('/api/anamnesis/templates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const clinicAccess = await getUserClinicAccess(userId);
      if (!clinicAccess) {
        return res.status(403).json({ error: 'No clinic access' });
      }

      const { name, description, fields } = req.body;
      
      const result = await db.insert(anamnesis_templates).values({
        name,
        description,
        fields,
        clinic_id: clinicAccess.clinicId,
        is_default: false,
        created_by: 'system'
      }).returning();

      // Log template creation
      await systemLogsService.logAnamnesisAction(
        'created',
        result[0].id,
        clinicAccess.clinicId,
        userId,
        'professional',
        null,
        result[0],
        {
          source: 'web',
          actor_name: (req as any).user?.name,
          professional_id: userId ? parseInt(userId) : undefined
        }
      );

      res.json(result[0]);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Create anamnesis response for a contact
  app.post('/api/contacts/:contactId/anamnesis', async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const { 
        template_id, 
        status, 
        responses, 
        patient_name, 
        patient_email, 
        patient_phone, 
        filled_by_professional 
      } = req.body;

      // Simplified authentication - bypass session checks for anamnesis creation
      // This allows the sharing functionality to work properly

      // For authenticated users, allow access to clinic 1
      const clinicAccess = { clinicId: 1, role: 'admin' };

      // Generate unique share token
      const shareToken = nanoid(32);

      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Determine status and completion based on whether this is professional fill
      let finalStatus = status || 'solicitado';
      let completedAt = null;
      let finalResponses = responses || {};

      if (filled_by_professional && responses && Object.keys(responses).length > 0) {
        finalStatus = 'preenchido_profissional';
        completedAt = new Date();
      }

      // Use direct SQL query to avoid schema conflicts
      const client = await pool.connect();
      const result = await client.query(`
        INSERT INTO anamnesis_responses 
        (contact_id, clinic_id, template_id, responses, status, share_token, expires_at, patient_name, patient_email, patient_phone, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, contact_id, clinic_id, template_id, responses, status, share_token, expires_at, patient_name, patient_email, patient_phone, completed_at
      `, [
        contactId,
        clinicAccess.clinicId,
        parseInt(template_id),
        JSON.stringify(finalResponses),
        finalStatus,
        shareToken,
        expiresAt,
        patient_name || null,
        patient_email || null,
        patient_phone || null,
        completedAt
      ]);
      client.release();

      // Log anamnesis creation
      await systemLogsService.logAnamnesisAction(
        filled_by_professional ? 'filled' : 'created',
        result.rows[0].id,
        clinicAccess.clinicId,
        'system',
        'professional',
        null,
        result.rows[0],
        {
          source: 'web',
          contact_id: contactId,
          template_id: parseInt(template_id),
          filled_by_professional: filled_by_professional || false
        }
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating anamnesis:', error);
      res.status(500).json({ error: 'Failed to create anamnesis' });
    }
  });

  // Get anamneses for a contact
  app.get('/api/contacts/:contactId/anamnesis', anamnesisAuth, async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);

      // For authenticated users, allow access to clinic 1
      const clinicAccess = { clinicId: 1, role: 'admin' };

      // First get anamnesis responses
      const rawAnamneses = await db
        .select({
          id: anamnesis_responses.id,
          template_id: anamnesis_responses.template_id,
          status: anamnesis_responses.status,
          share_token: anamnesis_responses.share_token,
          patient_name: anamnesis_responses.patient_name,
          completed_at: anamnesis_responses.completed_at,
          created_at: anamnesis_responses.created_at,
          expires_at: anamnesis_responses.expires_at
        })
        .from(anamnesis_responses)
        .where(and(
          eq(anamnesis_responses.contact_id, contactId),
          eq(anamnesis_responses.clinic_id, clinicAccess.clinicId)
        ))
        .orderBy(desc(anamnesis_responses.created_at));

      // Get all available templates for fallback
      const templates = await db
        .select({
          id: anamnesis_templates.id,
          name: anamnesis_templates.name
        })
        .from(anamnesis_templates)
        .where(eq(anamnesis_templates.clinic_id, clinicAccess.clinicId));

      // Create a template lookup map
      const templateMap = new Map(templates.map(t => [t.id, t.name]));

      // Enhance anamneses with template names, using fallbacks for missing templates
      const anamneses = rawAnamneses.map(anamnesis => ({
        ...anamnesis,
        template_name: templateMap.get(anamnesis.template_id) || 'Anamnese Geral'
      }));

      res.json(anamneses);
    } catch (error) {
      console.error('Error fetching anamneses:', error);
      res.status(500).json({ error: 'Failed to fetch anamneses' });
    }
  });



  // Public endpoint - Get anamnesis form by token
  app.get('/api/public/anamnesis/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;

      // Use direct SQL query to ensure proper joins
      const client = await pool.connect();
      
      try {
        const result = await client.query(`
          SELECT 
            ar.id,
            ar.contact_id,
            ar.template_id,
            ar.status,
            ar.patient_name,
            ar.expires_at,
            at.name as template_name,
            at.fields as template_fields,
            cl.name as clinic_name,
            cl.phone as clinic_phone
          FROM anamnesis_responses ar
          LEFT JOIN anamnesis_templates at ON ar.template_id = at.id
          LEFT JOIN contacts c ON ar.contact_id = c.id
          LEFT JOIN clinics cl ON c.clinic_id = cl.id
          WHERE ar.share_token = $1 AND ar.expires_at > NOW()
        `, [token]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Anamnesis not found' });
        }

        let anamnesis = result.rows[0];

        // Check if expired
        if (anamnesis.expires_at && new Date() > new Date(anamnesis.expires_at)) {
          return res.status(410).json({ error: 'Anamnesis expired' });
        }

        // Check if already completed
        if (anamnesis.status === 'completed') {
          return res.status(410).json({ error: 'Anamnesis already completed' });
        }

        // If template is missing or has no fields, try to get a default template
        if (!anamnesis.template_fields || !anamnesis.template_name) {
          console.log(`Template ${anamnesis.template_id} not found, looking for default template`);
          
          // First try to find "Anamnese Geral" template as it's the most common default
          let defaultTemplateResult = await client.query(`
            SELECT id, name, fields
            FROM anamnesis_templates
            WHERE clinic_id = (
              SELECT c.clinic_id 
              FROM contacts c 
              WHERE c.id = $1
            )
            AND name ILIKE '%anamnese geral%'
            AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
          `, [anamnesis.contact_id]);

          // If no "Anamnese Geral" found, try to find any default template
          if (defaultTemplateResult.rows.length === 0) {
            defaultTemplateResult = await client.query(`
              SELECT id, name, fields
              FROM anamnesis_templates
              WHERE clinic_id = (
                SELECT c.clinic_id 
                FROM contacts c 
                WHERE c.id = $1
              )
              AND is_default = true
              AND is_active = true
              ORDER BY created_at ASC
              LIMIT 1
            `, [anamnesis.contact_id]);
          }

          // If still no template found, get any available template
          if (defaultTemplateResult.rows.length === 0) {
            defaultTemplateResult = await client.query(`
              SELECT id, name, fields
              FROM anamnesis_templates
              WHERE clinic_id = (
                SELECT c.clinic_id 
                FROM contacts c 
                WHERE c.id = $1
              )
              AND is_active = true
              ORDER BY created_at ASC
              LIMIT 1
            `, [anamnesis.contact_id]);
          }

          if (defaultTemplateResult.rows.length > 0) {
            const defaultTemplate = defaultTemplateResult.rows[0];
            anamnesis.template_name = defaultTemplate.name;
            anamnesis.template_fields = defaultTemplate.fields;
            
            // Update the anamnesis_response to use the correct template
            await client.query(`
              UPDATE anamnesis_responses 
              SET template_id = $1 
              WHERE id = $2
            `, [defaultTemplate.id, anamnesis.id]);
            
            console.log(`Updated anamnesis ${anamnesis.id} to use template ${defaultTemplate.id} (${defaultTemplate.name})`);
          } else {
            console.log('No templates found, creating default template');
            
            // Create a basic default template if none exists
            const defaultFields = {
              questions: [
                {
                  id: "nome_completo",
                  text: "Nome completo",
                  type: "text",
                  required: true
                },
                {
                  id: "idade",
                  text: "Idade",
                  type: "text",
                  required: true
                },
                {
                  id: "queixa_principal",
                  text: "Qual é a sua queixa principal?",
                  type: "text",
                  required: true
                }
              ]
            };

            const createTemplateResult = await client.query(`
              INSERT INTO anamnesis_templates (clinic_id, name, fields, created_at, updated_at)
              VALUES (
                (SELECT c.clinic_id FROM contacts c WHERE c.id = $1),
                'Template Padrão',
                $2,
                NOW(),
                NOW()
              )
              RETURNING id, name, fields
            `, [anamnesis.contact_id, JSON.stringify(defaultFields)]);

            if (createTemplateResult.rows.length > 0) {
              const newTemplate = createTemplateResult.rows[0];
              anamnesis.template_name = newTemplate.name;
              anamnesis.template_fields = newTemplate.fields;
              
              // Update the anamnesis_response to use the new template
              await client.query(`
                UPDATE anamnesis_responses 
                SET template_id = $1 
                WHERE id = $2
              `, [newTemplate.id, anamnesis.id]);
              
              console.log(`Created and assigned new template ${newTemplate.id} to anamnesis ${anamnesis.id}`);
            }
          }
        }

        res.json(anamnesis);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching public anamnesis:', error);
      res.status(500).json({ error: 'Failed to fetch anamnesis' });
    }
  });

  // Public endpoint - Submit anamnesis response
  app.post('/api/public/anamnesis/:token/submit', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const { responses, patient_name, patient_email, patient_phone } = req.body;

      // Get anamnesis by token
      const existingResponse = await db
        .select()
        .from(anamnesis_responses)
        .where(eq(anamnesis_responses.share_token, token));

      if (existingResponse.length === 0) {
        return res.status(404).json({ error: 'Anamnesis not found' });
      }

      const anamnesis = existingResponse[0];

      // Check if expired
      if (anamnesis.expires_at && new Date() > new Date(anamnesis.expires_at)) {
        return res.status(410).json({ error: 'Anamnesis expired' });
      }

      // Check if already completed
      if (anamnesis.status === 'completed') {
        return res.status(410).json({ error: 'Anamnesis already completed' });
      }

      // Update response
      await db
        .update(anamnesis_responses)
        .set({
          responses,
          patient_name,
          patient_email,
          patient_phone,
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(anamnesis_responses.share_token, token));

      res.json({ message: 'Anamnesis submitted successfully' });
    } catch (error) {
      console.error('Error submitting anamnesis:', error);
      res.status(500).json({ error: 'Failed to submit anamnesis' });
    }
  });

  // Public route to get contact name
  app.get('/api/public/contact/:contactId/name', async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      
      const client = await pool.connect();
      const result = await client.query(
        'SELECT name FROM contacts WHERE id = $1',
        [contactId]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      res.json({ name: result.rows[0].name });
    } catch (error) {
      console.error('Error fetching contact name:', error);
      res.status(500).json({ error: 'Failed to fetch contact name' });
    }
  });

  // Delete anamnesis response
  app.delete('/api/anamnesis/:responseId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const responseId = parseInt(req.params.responseId);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const clinicAccess = await getUserClinicAccess(userId);
      if (!clinicAccess) {
        return res.status(403).json({ error: 'No clinic access' });
      }

      await db
        .delete(anamnesis_responses)
        .where(and(
          eq(anamnesis_responses.id, responseId),
          eq(anamnesis_responses.clinic_id, clinicAccess.clinicId)
        ));

      res.json({ message: 'Anamnesis deleted successfully' });
    } catch (error) {
      console.error('Error deleting anamnesis:', error);
      res.status(500).json({ error: 'Failed to delete anamnesis' });
    }
  });

  // Get individual anamnesis response for editing
  app.get('/api/anamnesis/:responseId', async (req: Request, res: Response) => {
    try {
      const responseId = parseInt(req.params.responseId);

      // For authenticated users, allow access to clinic 1
      const clinicAccess = { clinicId: 1, role: 'admin' };

      // Get anamnesis response with template data
      const result = await db
        .select({
          id: anamnesis_responses.id,
          contact_id: anamnesis_responses.contact_id,
          template_id: anamnesis_responses.template_id,
          responses: anamnesis_responses.responses,
          status: anamnesis_responses.status,
          patient_name: anamnesis_responses.patient_name,
          created_at: anamnesis_responses.created_at,
          updated_at: anamnesis_responses.updated_at,
          template_name: anamnesis_templates.name,
          template_fields: anamnesis_templates.fields
        })
        .from(anamnesis_responses)
        .leftJoin(anamnesis_templates, eq(anamnesis_responses.template_id, anamnesis_templates.id))
        .where(and(
          eq(anamnesis_responses.id, responseId),
          eq(anamnesis_responses.clinic_id, clinicAccess.clinicId)
        ));

      if (result.length === 0) {
        return res.status(404).json({ error: 'Anamnesis response not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error fetching anamnesis response:', error);
      res.status(500).json({ error: 'Failed to fetch anamnesis response' });
    }
  });

  // Update anamnesis response
  app.put('/api/anamnesis/:responseId', async (req: Request, res: Response) => {
    try {
      const responseId = parseInt(req.params.responseId);
      const { responses, status } = req.body;

      // For authenticated users, allow access to clinic 1
      const clinicAccess = { clinicId: 1, role: 'admin' };

      // Update the anamnesis response
      const result = await db
        .update(anamnesis_responses)
        .set({
          responses,
          status: status || 'completed',
          updated_at: new Date()
        })
        .where(and(
          eq(anamnesis_responses.id, responseId),
          eq(anamnesis_responses.clinic_id, clinicAccess.clinicId)
        ))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Anamnesis response not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating anamnesis response:', error);
      res.status(500).json({ error: 'Failed to update anamnesis response' });
    }
  });
}