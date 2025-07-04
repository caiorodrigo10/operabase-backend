
import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional()
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6)
});

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
