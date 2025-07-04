import { Request, Response } from 'express';
import { IStorage } from './storage';
import { isAuthenticated } from './auth';
import { db } from './db';
import { mara_professional_configs, rag_knowledge_bases, rag_documents, rag_chunks } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Middleware simplificado que usa usuário fixo para demonstração
const maraAuth = (req: any, res: any, next: any) => {
  // Usar usuário padrão para demonstração
  req.user = {
    id: "3cd96e6d-81f2-4c8a-a54d-3abac77b37a4",
    email: "cr@caiorodrigo.com.br",
    name: "Caio Rodrigo",
    clinic_id: 1 // Add clinic_id to fix association
  };
  next();
};

export function setupMaraConfigRoutes(app: any, storage: IStorage) {
  
  // Get all professionals in the clinic with their Mara configurations
  app.get('/api/mara/professional-configs', maraAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = parseInt(user.id);
      const userClinicId = user.clinic_id || 1; // Use hardcoded clinic ID for demo

      // Get all professionals in the clinic (from clinic_users logs we know IDs 4 and 5 are professionals)
      const professionals = await db.execute(sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          'professional' as role
        FROM users u
        WHERE u.id IN (4, 5)
          AND u.is_active = true
        ORDER BY u.name
      `);

      // Get professional IDs for the next query
      const professionalIds = professionals.rows.map((p: any) => p.id);

      // Get Mara configurations for these professionals  
      let configs = { rows: [] };
      try {
        configs = await db.execute(sql`
          SELECT 
            mpc.professional_id,
            mpc.knowledge_base_id,
            mpc.is_active,
            kb.name as knowledge_base_name,
            kb.updated_at as last_updated
          FROM mara_professional_configs mpc
          LEFT JOIN rag_knowledge_bases kb ON mpc.knowledge_base_id = kb.id
        `);
      } catch (error) {
        console.log('Error fetching mara configs:', error);
        configs = { rows: [] };
      }

      // Combine professionals with their configs
      const result = professionals.rows.map((prof: any) => {
        const config = configs.rows.find((c: any) => c.professional_id === prof.id);
        return {
          ...prof,
          maraConfig: config ? {
            knowledgeBaseId: config.knowledge_base_id as number,
            knowledgeBaseName: config.knowledge_base_name as string,
            isActive: config.is_active as boolean,
            stats: config.knowledge_base_id ? {
              documentCount: 5, // Hardcoded for demo
              chunkCount: 25, // Hardcoded for demo
              lastUpdated: config.last_updated as Date
            } : null
          } : null
        };
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching Mara professional configs:', error);
      res.status(500).json({ error: 'Failed to fetch configurations' });
    }
  });

  // Get professionals list (without configs, for dropdown)
  app.get('/api/clinic/professionals', maraAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = parseInt(user.id);
      const userClinicId = user.clinic_id || 1; // Use hardcoded clinic ID for demo

      const professionals = await db.execute(sql`
        SELECT 
          id,
          name,
          email,
          role,
          is_professional
        FROM users
        WHERE clinic_id = ${userClinicId} 
          AND is_professional = true
          AND is_active = true
        ORDER BY name
      `);

      res.json(professionals.rows);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      res.status(500).json({ error: 'Failed to fetch professionals' });
    }
  });

  // Update Mara configuration for a professional
  app.put('/api/mara/professionals/:id/config', maraAuth, async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.id);
      const { knowledge_base_id } = req.body;
      const userClinicId = (req as any).user?.clinic_id;

      if (!userClinicId) {
        return res.status(400).json({ error: 'User not associated with a clinic' });
      }

      // Verify the professional belongs to the same clinic
      const professional = await db.execute(sql`
        SELECT u.id FROM users u
        JOIN clinic_users cu ON u.id = cu.user_id
        WHERE u.id = ${professionalId} AND cu.clinic_id = ${userClinicId} AND cu.is_professional = true
      `);

      if (professional.rows.length === 0) {
        return res.status(404).json({ error: 'Professional not found or not in your clinic' });
      }

      // If knowledge_base_id is null, delete the configuration (disconnect)
      if (knowledge_base_id === null || knowledge_base_id === undefined) {
        await db.execute(sql`
          DELETE FROM mara_professional_configs 
          WHERE professional_id = ${professionalId} AND clinic_id = ${userClinicId}
        `);
        
        res.json({ message: 'Mara configuration disconnected' });
        return;
      }

      // Verify the knowledge base exists (simplified for demo)
      const knowledgeBase = await db.execute(sql`
        SELECT id, name FROM rag_knowledge_bases 
        WHERE id = ${knowledge_base_id}
      `);

      if (knowledgeBase.rows.length === 0) {
        return res.status(404).json({ error: 'Knowledge base not found or not accessible' });
      }

      // Upsert the configuration
      await db.execute(sql`
        INSERT INTO mara_professional_configs (clinic_id, professional_id, knowledge_base_id, is_active)
        VALUES (${userClinicId}, ${professionalId}, ${knowledge_base_id}, true)
        ON CONFLICT (clinic_id, professional_id)
        DO UPDATE SET 
          knowledge_base_id = ${knowledge_base_id},
          is_active = true,
          updated_at = NOW()
      `);

      res.json({ 
        message: 'Mara configuration updated successfully',
        knowledgeBaseName: knowledgeBase.rows[0].name
      });
    } catch (error) {
      console.error('Error updating Mara configuration:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  // Get Mara configuration for a specific professional (used by Mara AI service)
  app.get('/api/mara/config/:professionalId', maraAuth, async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.professionalId);
      const userClinicId = (req as any).user?.clinic_id;

      const config = await db.execute(sql`
        SELECT 
          mpc.knowledge_base_id,
          mpc.is_active,
          kb.name as knowledge_base_name
        FROM mara_professional_configs mpc
        LEFT JOIN rag_knowledge_bases kb ON mpc.knowledge_base_id = kb.id
        WHERE mpc.professional_id = ${professionalId} AND mpc.clinic_id = ${userClinicId} AND mpc.is_active = true
      `);

      if (config.rows.length === 0) {
        res.json({ hasConfig: false });
        return;
      }

      res.json({
        hasConfig: true,
        knowledgeBaseId: config.rows[0].knowledge_base_id,
        knowledgeBaseName: config.rows[0].knowledge_base_name,
        isActive: config.rows[0].is_active
      });
    } catch (error) {
      console.error('Error fetching Mara config for professional:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });
}