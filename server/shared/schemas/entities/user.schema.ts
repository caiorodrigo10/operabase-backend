import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema, roleSchema, nullableString } from '../base/common.schema';

/**
 * Unified User entity schema
 * Consolidates user definitions from auth domain and shared schema
 */

// Core user validation schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema,
  is_active: z.boolean().default(true),
  last_login: z.date().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

// User creation schema (without auto-generated fields)
export const createUserSchema = userSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_login: true,
});

// User update schema (partial with password validation)
export const updateUserSchema = userSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Profile update schema with password change validation
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  currentPassword: passwordSchema.optional(),
  newPassword: passwordSchema.optional(),
  confirmPassword: passwordSchema.optional(),
}).refine((data) => {
  // If changing password, require current password
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  // Password confirmation must match
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Para alterar a senha, forneça a senha atual e confirme a nova senha",
  path: ["newPassword"],
});

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

// Clinic user relationship schema
export const clinicUserSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().uuid(),
  clinic_id: z.number().int().positive(),
  role: z.enum(['admin', 'usuario']),
  is_professional: z.boolean().default(false),
  is_active: z.boolean().default(true),
  joined_at: z.date(),
});

// Clinic invitation schema
export const clinicInvitationSchema = z.object({
  id: z.number().int().positive(),
  clinic_id: z.number().int().positive(),
  inviter_id: z.number().int().positive(),
  email: emailSchema,
  role: z.enum(['admin', 'usuario']),
  token: z.string(),
  expires_at: z.date(),
  accepted_at: z.date().nullable().optional(),
  created_at: z.date(),
});

// Create invitation request schema
export const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'usuario']).default('usuario'),
  message: nullableString,
});

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});

// Password reset token schema
export const passwordResetTokenSchema = z.object({
  id: z.string(),
  user_id: z.string().uuid(),
  token: z.string(),
  expires_at: z.date(),
  used: z.boolean().default(false),
  created_at: z.date(),
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ClinicUser = z.infer<typeof clinicUserSchema>;
export type ClinicInvitation = z.infer<typeof clinicInvitationSchema>;
export type CreateInvitation = z.infer<typeof createInvitationSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;