import { z } from 'zod';
import { 
  phoneSchema, 
  emailSchema, 
  clinicIdSchema, 
  nameSchema,
  contactStatusSchema,
  prioritySchema,
  sourceSchema,
  genderSchema,
  optionalEmail,
  optionalText,
  nullableString,
  nullableNumber
} from '../base/common.schema';

/**
 * Unified Contact entity schema
 * Consolidates contact definitions from contacts domain and shared schema
 */

// Core contact validation schema
export const contactSchema = z.object({
  id: z.number().int().positive(),
  clinic_id: clinicIdSchema,
  name: nameSchema,
  phone: phoneSchema,
  email: z.string().email().nullable().optional(),
  age: nullableNumber,
  gender: z.union([genderSchema, z.null()]).optional(),
  profession: nullableString,
  address: nullableString,
  emergency_contact: nullableString,
  medical_history: nullableString,
  current_medications: z.array(z.string()).nullable().optional(),
  allergies: z.array(z.string()).nullable().optional(),
  profile_picture: nullableString, // URL da foto do perfil
  status: contactStatusSchema,
  priority: prioritySchema.default('normal'),
  source: sourceSchema.default('whatsapp'),
  notes: nullableString,
  first_contact: z.date(),
  last_interaction: z.date(),
});

// Contact creation schema (without auto-generated fields)
export const createContactSchema = contactSchema.omit({
  id: true,
  first_contact: true,
  last_interaction: true,
}).extend({
  // Enhanced validation for creation with proper null handling
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  gender: z.union([genderSchema, z.null()]).optional(),
  profession: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  emergency_contact: z.union([z.string(), z.null()]).optional(),
  medical_history: z.union([z.string(), z.null()]).optional(),
  age: z.union([z.number().int().min(0).max(150), z.null()]).optional(),
  profile_picture: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

// Contact update schema (partial)
export const updateContactSchema = createContactSchema.partial();

// Contact status update schema
export const updateContactStatusSchema = z.object({
  status: contactStatusSchema,
});

// Contact search/filter schema
export const contactFiltersSchema = z.object({
  clinic_id: clinicIdSchema,
  status: contactStatusSchema.optional(),
  priority: prioritySchema.optional(),
  source: sourceSchema.optional(),
  search: z.string().min(1).optional(),
  gender: genderSchema.optional(),
  age_min: z.number().int().min(0).optional(),
  age_max: z.number().int().max(150).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
});

// Conversation schema (related to contacts)
export const conversationSchema = z.object({
  id: z.number().int().positive(),
  contact_id: z.number().int().positive(),
  clinic_id: clinicIdSchema,
  status: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Message schema (related to conversations)
export const messageSchema = z.object({
  id: z.number().int().positive(),
  conversation_id: z.number().int().positive(),
  sender_type: z.enum(['patient', 'ai', 'user']),
  content: z.string().min(1),
  ai_action: nullableString,
  timestamp: z.date(),
});

// Create conversation schema
export const createConversationSchema = conversationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Create message schema
export const createMessageSchema = messageSchema.omit({
  id: true,
  timestamp: true,
});

// Contact import schema (for bulk operations)
export const importContactSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmail,
  gender: z.union([genderSchema, z.null()]).optional(),
  age: z.number().int().min(0).max(150).optional(),
  profession: nullableString,
  address: nullableString,
  emergency_contact: nullableString,
  notes: nullableString,
  source: sourceSchema.default('outros'),
  priority: prioritySchema.default('normal'),
});

// Contact export schema
export const exportContactSchema = contactSchema.extend({
  clinic_name: z.string().optional(),
  total_appointments: z.number().int().min(0).optional(),
  last_appointment_date: z.date().nullable().optional(),
});

// Contact statistics schema
export const contactStatsSchema = z.object({
  total: z.number().int().min(0),
  by_status: z.record(contactStatusSchema, z.number().int().min(0)),
  by_priority: z.record(prioritySchema, z.number().int().min(0)),
  by_source: z.record(sourceSchema, z.number().int().min(0)),
  by_gender: z.record(genderSchema, z.number().int().min(0)),
  new_this_month: z.number().int().min(0),
  active_conversations: z.number().int().min(0),
});

// Type exports
export type Contact = z.infer<typeof contactSchema>;
export type CreateContact = z.infer<typeof createContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;
export type UpdateContactStatus = z.infer<typeof updateContactStatusSchema>;
export type ContactFilters = z.infer<typeof contactFiltersSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type CreateConversation = z.infer<typeof createConversationSchema>;
export type CreateMessage = z.infer<typeof createMessageSchema>;
export type ImportContact = z.infer<typeof importContactSchema>;
export type ExportContact = z.infer<typeof exportContactSchema>;
export type ContactStats = z.infer<typeof contactStatsSchema>;