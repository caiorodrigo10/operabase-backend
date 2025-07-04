
import { z } from 'zod';

// Request schemas
export const createClinicSchema = z.object({
  name: z.string().min(1),
  responsible: z.string().optional(),
  phone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  cnpj: z.string().optional(),
  description: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),
  working_days: z.array(z.string()).optional(),
  work_start: z.string().optional(),
  work_end: z.string().optional(),
  lunch_start: z.string().optional(),
  lunch_end: z.string().optional(),
  has_lunch_break: z.boolean().optional(),
});

export const updateClinicSchema = createClinicSchema.partial();

export const createUserInClinicSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'usuario']),
  isProfessional: z.boolean().default(false),
  clinicId: z.number(),
  createdBy: z.string(),
});

export type CreateClinicRequest = z.infer<typeof createClinicSchema>;
export type UpdateClinicRequest = z.infer<typeof updateClinicSchema>;
export type CreateUserInClinicRequest = z.infer<typeof createUserInClinicSchema>;
