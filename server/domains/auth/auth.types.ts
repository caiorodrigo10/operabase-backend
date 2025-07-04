
import { z } from 'zod';

// Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  token?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  clinic_id?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
  token?: string; // Only for development
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Clinic Access Types
export interface UserClinicAccess {
  clinic: {
    id: number;
    name: string;
  };
  role: string;
  is_professional: boolean;
  permissions?: any;
}

// Invitation Types
export interface InvitationRequest {
  email: string;
  role: string;
  permissions?: any;
}

export interface AcceptInvitationRequest {
  token: string;
}

// Profile Update Types
export interface UpdateProfileRequest {
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

// Validation Schemas
export const loginRequestSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Email inválido')
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const updateProfileRequestSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres').optional()
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Senha atual é obrigatória para alterar a senha',
  path: ['currentPassword']
});

export const invitationRequestSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'usuario'], { required_error: 'Role é obrigatório' }),
  permissions: z.any().optional()
});
