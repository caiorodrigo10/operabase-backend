
import { z } from 'zod';

export const medicalRecordSchema = z.object({
  contact_id: z.number(),
  clinic_id: z.number(),
  professional_id: z.string(),
  content: z.string(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  appointment_id: z.number().optional()
});

export const updateMedicalRecordSchema = medicalRecordSchema.partial().omit({
  contact_id: true,
  clinic_id: true
});

export const medicalRecordQuerySchema = z.object({
  contact_id: z.string().transform(Number),
  clinic_id: z.string().transform(Number)
});

export type CreateMedicalRecordRequest = z.infer<typeof medicalRecordSchema>;
export type UpdateMedicalRecordRequest = z.infer<typeof updateMedicalRecordSchema>;
export type MedicalRecordQuery = z.infer<typeof medicalRecordQuerySchema>;
