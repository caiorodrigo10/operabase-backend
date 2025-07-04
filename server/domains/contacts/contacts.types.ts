
import { z } from 'zod';

// Request schemas
export const createContactSchema = z.object({
  clinic_id: z.number(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  status: z.string().default('novo'),
  source: z.string().default('cadastro'),
  gender: z.union([z.string(), z.null()]).optional(),
  profession: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  emergency_contact: z.union([z.string(), z.null()]).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactStatusUpdateSchema = z.object({
  status: z.string(),
});

export type CreateContactRequest = z.infer<typeof createContactSchema>;
export type UpdateContactRequest = z.infer<typeof updateContactSchema>;
export type ContactStatusUpdateRequest = z.infer<typeof contactStatusUpdateSchema>;
