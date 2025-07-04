
import { z } from 'zod';

export const createAiTemplateSchema = z.object({
  clinic_id: z.number(),
  name: z.string().min(1),
  template_type: z.string().min(1),
  content: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

export const updateAiTemplateSchema = createAiTemplateSchema.partial().omit({ clinic_id: true });

export type CreateAiTemplateRequest = z.infer<typeof createAiTemplateSchema>;
export type UpdateAiTemplateRequest = z.infer<typeof updateAiTemplateSchema>;
