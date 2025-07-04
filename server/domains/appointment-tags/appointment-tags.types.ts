
import { z } from 'zod';

// Helper for nullable optional fields
const nullableString = z.union([z.string(), z.null(), z.literal("")]).optional();

export const createAppointmentTagSchema = z.object({
  clinic_id: z.number(),
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.union([z.string(), z.null()]).optional(),
  description: nullableString
});

export const updateAppointmentTagSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  color: z.union([z.string(), z.null()]).optional(),
  description: nullableString
});

export type CreateAppointmentTagRequest = z.infer<typeof createAppointmentTagSchema>;
export type UpdateAppointmentTagRequest = z.infer<typeof updateAppointmentTagSchema>;
