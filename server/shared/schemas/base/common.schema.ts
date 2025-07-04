import { z } from 'zod';

/**
 * Common validation schemas used across all domains
 * These provide consistent validation patterns and can be reused
 */

// Basic field validations
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Formato de telefone inválido")
  .min(10, "Telefone muito curto")
  .max(15, "Telefone muito longo");

export const emailSchema = z.string()
  .email("Email inválido")
  .min(5, "Email muito curto")
  .max(254, "Email muito longo");

export const clinicIdSchema = z.number()
  .int("ID da clínica deve ser inteiro")
  .positive("ID da clínica deve ser positivo");

export const userIdSchema = z.union([
  z.string().uuid("ID do usuário deve ser UUID válido"),
  z.number().int().positive("ID do usuário deve ser inteiro positivo")
]);

export const contactIdSchema = z.number()
  .int("ID do contato deve ser inteiro")
  .positive("ID do contato deve ser positivo");

export const appointmentIdSchema = z.number()
  .int("ID da consulta deve ser inteiro")
  .positive("ID da consulta deve ser positivo");

// Text field validations
export const nameSchema = z.string()
  .min(1, "Nome é obrigatório")
  .max(255, "Nome muito longo")
  .trim();

export const passwordSchema = z.string()
  .min(6, "Senha deve ter pelo menos 6 caracteres")
  .max(128, "Senha muito longa");

export const tokenSchema = z.string()
  .min(1, "Token é obrigatório")
  .max(255, "Token inválido");

// Date and time validations
export const dateSchema = z.string()
  .datetime("Data deve estar em formato ISO válido")
  .or(z.date());

export const timestampSchema = z.string()
  .datetime("Timestamp deve estar em formato ISO válido")
  .or(z.date());

// Status and enum validations
export const contactStatusSchema = z.enum([
  'novo', 
  'em_conversa', 
  'agendado', 
  'realizado', 
  'pos_atendimento'
], {
  errorMap: () => ({ message: "Status de contato inválido" })
});

export const prioritySchema = z.enum([
  'baixa', 
  'normal', 
  'alta', 
  'urgente'
], {
  errorMap: () => ({ message: "Prioridade inválida" })
});

export const sourceSchema = z.enum([
  'whatsapp', 
  'site', 
  'indicacao', 
  'importacao',
  'cadastro',
  'outros'
], {
  errorMap: () => ({ message: "Origem inválida" })
});

export const genderSchema = z.enum([
  'masculino', 
  'feminino', 
  'outros', 
  'nao_informado'
], {
  errorMap: () => ({ message: "Gênero inválido" })
});

export const appointmentStatusSchema = z.enum([
  'agendada',
  'confirmada', 
  'realizada', 
  'cancelada', 
  'reagendada'
], {
  errorMap: () => ({ message: "Status de consulta inválido" })
});

export const roleSchema = z.enum([
  'super_admin', 
  'admin', 
  'manager', 
  'usuario'
], {
  errorMap: () => ({ message: "Papel de usuário inválido" })
});

// Nullable field helpers
export const nullableString = z.string().nullable().optional();
export const nullableNumber = z.number().nullable().optional();
export const nullableBoolean = z.boolean().nullable().optional();
export const nullableDate = z.date().nullable().optional();

// Optional field helpers with proper null handling
export const optionalEmail = z.union([emailSchema, z.literal(""), z.null()]).optional();
export const optionalPhone = z.union([phoneSchema, z.literal(""), z.null()]).optional();
export const optionalText = z.union([z.string(), z.null()]).optional();