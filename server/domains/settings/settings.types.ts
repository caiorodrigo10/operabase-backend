
import { z } from 'zod';

export const createClinicSettingSchema = z.object({
  clinic_id: z.number(),
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional()
});

export const updateClinicSettingSchema = createClinicSettingSchema.partial().omit({ clinic_id: true });

export type CreateClinicSettingRequest = z.infer<typeof createClinicSettingSchema>;
export type UpdateClinicSettingRequest = z.infer<typeof updateClinicSettingSchema>;
