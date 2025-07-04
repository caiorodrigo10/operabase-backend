
import { z } from 'zod';

// Pipeline Stage Types
export const insertPipelineStageSchema = z.object({
  clinic_id: z.number(),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().optional(),
});

export const updatePipelineStageSchema = insertPipelineStageSchema.partial().omit({ clinic_id: true });

export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type UpdatePipelineStage = z.infer<typeof updatePipelineStageSchema>;

// Pipeline Opportunity Types
export const insertPipelineOpportunitySchema = z.object({
  clinic_id: z.number(),
  stage_id: z.number(),
  contact_id: z.number(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  value: z.number().optional(),
  expected_close_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['open', 'won', 'lost']).default('open'),
});

export const updatePipelineOpportunitySchema = insertPipelineOpportunitySchema.partial().omit({ clinic_id: true });

export type InsertPipelineOpportunity = z.infer<typeof insertPipelineOpportunitySchema>;
export type UpdatePipelineOpportunity = z.infer<typeof updatePipelineOpportunitySchema>;

// Pipeline Activity Types
export const insertPipelineActivitySchema = z.object({
  clinic_id: z.number(),
  opportunity_id: z.number(),
  user_id: z.string(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  completed: z.boolean().default(false),
});

export const updatePipelineActivitySchema = insertPipelineActivitySchema.partial().omit({ clinic_id: true });

export type InsertPipelineActivity = z.infer<typeof insertPipelineActivitySchema>;
export type UpdatePipelineActivity = z.infer<typeof updatePipelineActivitySchema>;

export interface PipelineStage {
  id: number;
  clinic_id: number;
  name: string;
  description?: string;
  color?: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineOpportunity {
  id: number;
  clinic_id: number;
  stage_id: number;
  contact_id: number;
  title: string;
  description?: string;
  value?: number;
  expected_close_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface PipelineActivity {
  id: number;
  clinic_id: number;
  opportunity_id: number;
  user_id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}
