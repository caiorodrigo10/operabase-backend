import { z } from 'zod';
import { 
  clinicIdSchema, 
  contactIdSchema, 
  appointmentIdSchema,
  appointmentStatusSchema,
  nullableString,
  nullableNumber,
  dateSchema,
  timestampSchema
} from '../base/common.schema';

/**
 * Unified Appointment entity schema
 * Consolidates appointment definitions from appointments domain and shared schema
 */

// Core appointment validation schema
export const appointmentSchema = z.object({
  id: appointmentIdSchema,
  clinic_id: clinicIdSchema,
  contact_id: contactIdSchema,
  user_id: z.union([z.string().uuid(), z.number().int().positive()]),
  type: z.string().min(1, "Tipo da consulta é obrigatório"),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  duration: z.number().int().min(15).max(480).default(60), // 15 min to 8 hours
  status: appointmentStatusSchema.default('agendada'),
  notes: nullableString,
  location: nullableString,
  price: nullableNumber,
  payment_status: z.enum(['pendente', 'pago', 'cancelado']).default('pendente'),
  reminder_sent: z.boolean().default(false),
  google_event_id: nullableString,
  tag_id: z.number().int().positive().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Appointment creation schema (without auto-generated fields)
export const createAppointmentSchema = z.object({
  contact_id: z.number().int().positive(),
  user_id: z.union([z.string().uuid(), z.number().int().positive()]),
  clinic_id: z.number().int().positive(),
  type: z.string().min(1, "Tipo da consulta é obrigatório").optional(),
  scheduled_date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
    z.date().transform((date) => date.toISOString().split('T')[0])
  ]),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  duration: z.number().int().min(15).max(480).default(60),
  status: z.enum(['agendada', 'confirmada', 'realizada', 'cancelada', 'reagendada']).default('agendada'),
  notes: z.union([z.string(), z.null(), z.literal("")]).optional(),
  location: z.union([z.string(), z.null(), z.literal("")]).optional(),
  price: z.union([z.number().min(0), z.null()]).optional(),
  payment_status: z.enum(['pendente', 'pago', 'cancelado']).default('pendente'),
  tag_id: z.union([z.number().int().positive(), z.null()]).optional(),
  google_event_id: z.union([z.string(), z.null()]).optional(),
  // Support legacy field names for compatibility
  doctor_name: z.string().optional(),
  specialty: z.union([z.string(), z.null()]).optional(),
  appointment_type: z.string().optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  payment_amount: z.union([z.number().min(0), z.null()]).optional(),
  session_notes: z.union([z.string(), z.null(), z.literal("")]).optional(),
});

// Appointment update schema (partial)
export const updateAppointmentSchema = z.object({
  id: appointmentIdSchema,
  contact_id: z.number().int().positive().optional(),
  user_id: z.union([z.string().uuid(), z.number().int().positive()]).optional(),
  clinic_id: z.number().int().positive().optional(),
  type: z.string().min(1).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().int().min(15).max(480).optional(),
  status: z.enum(['agendada', 'confirmada', 'realizada', 'cancelada', 'reagendada']).optional(),
  notes: z.union([z.string(), z.null(), z.literal("")]).optional(),
  location: z.union([z.string(), z.null(), z.literal("")]).optional(),
  price: z.union([z.number().min(0), z.null()]).optional(),
  payment_status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
  tag_id: z.union([z.number().int().positive(), z.null()]).optional(),
  google_event_id: z.union([z.string(), z.null()]).optional(),
});

// Appointment status update schema
export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  notes: nullableString,
});

// Appointment filters for searching/listing
export const appointmentFiltersSchema = z.object({
  clinic_id: clinicIdSchema,
  user_id: z.union([z.string().uuid(), z.number().int().positive()]).optional(),
  contact_id: contactIdSchema.optional(),
  status: appointmentStatusSchema.optional(),
  type: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  payment_status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
  tag_id: z.number().int().positive().optional(),
});

// Appointment reschedule schema
export const rescheduleAppointmentSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  reason: nullableString,
});

// Appointment tags schema
export const appointmentTagSchema = z.object({
  id: z.number().int().positive(),
  clinic_id: clinicIdSchema,
  name: z.string().min(1, "Nome da etiqueta é obrigatório").max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar em formato hexadecimal"),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
});

// Create appointment tag schema
export const createAppointmentTagSchema = appointmentTagSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Update appointment tag schema
export const updateAppointmentTagSchema = createAppointmentTagSchema.partial();

// Appointment reminder schema
export const appointmentReminderSchema = z.object({
  id: z.number().int().positive(),
  appointment_id: appointmentIdSchema,
  type: z.enum(['email', 'sms', 'whatsapp', 'push']),
  scheduled_for: z.date(),
  sent_at: z.date().nullable().optional(),
  status: z.enum(['pending', 'sent', 'failed']),
  message: z.string().optional(),
  created_at: z.date(),
});

// Create reminder schema
export const createReminderSchema = appointmentReminderSchema.omit({
  id: true,
  sent_at: true,
  created_at: true,
});

// Appointment statistics schema
export const appointmentStatsSchema = z.object({
  total: z.number().int().min(0),
  by_status: z.record(appointmentStatusSchema, z.number().int().min(0)),
  by_type: z.record(z.string(), z.number().int().min(0)),
  by_payment_status: z.record(z.enum(['pendente', 'pago', 'cancelado']), z.number().int().min(0)),
  today: z.number().int().min(0),
  this_week: z.number().int().min(0),
  this_month: z.number().int().min(0),
  completion_rate: z.number().min(0).max(1),
  average_duration: z.number().min(0),
  revenue_total: z.number().min(0),
  revenue_pending: z.number().min(0),
});

// Calendar view schema
export const calendarViewSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  view_type: z.enum(['day', 'week', 'month']),
  clinic_id: clinicIdSchema,
  user_id: z.union([z.string().uuid(), z.number().int().positive()]).optional(),
});

// Availability slot schema
export const availabilitySlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
  duration: z.number().int().min(15).max(480),
  available: z.boolean(),
  user_id: z.union([z.string().uuid(), z.number().int().positive()]),
  clinic_id: clinicIdSchema,
});

// Type exports
export type Appointment = z.infer<typeof appointmentSchema>;
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatus = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>;
export type RescheduleAppointment = z.infer<typeof rescheduleAppointmentSchema>;
export type AppointmentTag = z.infer<typeof appointmentTagSchema>;
export type CreateAppointmentTag = z.infer<typeof createAppointmentTagSchema>;
export type UpdateAppointmentTag = z.infer<typeof updateAppointmentTagSchema>;
export type AppointmentReminder = z.infer<typeof appointmentReminderSchema>;
export type CreateReminder = z.infer<typeof createReminderSchema>;
export type AppointmentStats = z.infer<typeof appointmentStatsSchema>;
export type CalendarView = z.infer<typeof calendarViewSchema>;
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;