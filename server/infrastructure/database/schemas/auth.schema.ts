
import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced users table for email/password authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  role: varchar("role").notNull().default("admin"), // super_admin, admin, manager, user
  is_active: boolean("is_active").notNull().default(true),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const password_reset_tokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_password_reset_tokens_user").on(table.user_id),
  index("idx_password_reset_tokens_token").on(table.token),
]);

// Clinic-User relationship table for multi-tenant access
export const clinic_users = pgTable("clinic_users", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  user_id: uuid("user_id").notNull(),
  role: varchar("role").notNull().default("usuario"), // admin, usuario
  is_professional: boolean("is_professional").notNull().default(false), // Controlled only by admins
  permissions: jsonb("permissions"), // Specific permissions for this clinic
  is_active: boolean("is_active").notNull().default(true),
  invited_by: uuid("invited_by"),
  invited_at: timestamp("invited_at"),
  joined_at: timestamp("joined_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.clinic_id, table.user_id),
  index("idx_clinic_users_clinic").on(table.clinic_id),
  index("idx_clinic_users_user").on(table.user_id),
  index("idx_clinic_users_professional").on(table.is_professional),
]);

// Professional status audit log
export const professional_status_audit = pgTable("professional_status_audit", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  target_user_id: integer("target_user_id").notNull(), // User whose status was changed
  changed_by_user_id: integer("changed_by_user_id").notNull(), // Admin who made the change
  action: varchar("action").notNull(), // 'activated' or 'deactivated'
  previous_status: boolean("previous_status").notNull(),
  new_status: boolean("new_status").notNull(),
  ip_address: varchar("ip_address"),
  user_agent: text("user_agent"),
  notes: text("notes"), // Optional reason for the change
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_professional_audit_clinic").on(table.clinic_id),
  index("idx_professional_audit_target").on(table.target_user_id),
  index("idx_professional_audit_changed_by").on(table.changed_by_user_id),
  index("idx_professional_audit_created").on(table.created_at),
]);

// Clinic invitations for onboarding new team members
export const clinic_invitations = pgTable("clinic_invitations", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  email: varchar("email").notNull(),
  role: varchar("role").notNull(),
  permissions: jsonb("permissions"),
  token: varchar("token").notNull().unique(),
  invited_by: integer("invited_by").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  accepted_at: timestamp("accepted_at"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invitations_email").on(table.email),
  index("idx_invitations_token").on(table.token),
]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertClinicUserSchema = createInsertSchema(clinic_users).omit({
  id: true,
  created_at: true,
});

export const insertClinicInvitationSchema = createInsertSchema(clinic_invitations).omit({
  id: true,
  created_at: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(password_reset_tokens).omit({
  id: true,
  created_at: true,
});

export const insertProfessionalStatusAuditSchema = createInsertSchema(professional_status_audit).omit({
  id: true,
  created_at: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ClinicUser = typeof clinic_users.$inferSelect;
export type InsertClinicUser = z.infer<typeof insertClinicUserSchema>;
export type ProfessionalStatusAudit = typeof professional_status_audit.$inferSelect;
export type InsertProfessionalStatusAudit = z.infer<typeof insertProfessionalStatusAuditSchema>;
export type ClinicInvitation = typeof clinic_invitations.$inferSelect;
export type InsertClinicInvitation = z.infer<typeof insertClinicInvitationSchema>;
export type PasswordResetToken = typeof password_reset_tokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// User profile update schema
export const updateUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  role: true,
  is_active: true,
  last_login: true,
  created_at: true,
  updated_at: true,
}).extend({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Se está tentando alterar senha, deve fornecer senha atual
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  // Se forneceu nova senha, deve confirmar
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Para alterar a senha, forneça a senha atual e confirme a nova senha",
  path: ["newPassword"],
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
