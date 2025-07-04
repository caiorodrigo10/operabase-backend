import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Remaining schemas for features that haven't been fully modularized yet

// Tabela para etiquetas de consultas (appointment tags)
export const appointment_tags = pgTable("appointment_tags", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(), // Cor da etiqueta em hexadecimal
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_appointment_tags_clinic").on(table.clinic_id),
]);

// Tabela para métricas e analytics
export const analytics_metrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  metric_type: text("metric_type").notNull(), // daily_messages, appointments_scheduled, conversion_rate, etc
  value: integer("value").notNull(),
  date: timestamp("date").notNull(),
  metadata: text("metadata"), // JSON string para dados adicionais
  created_at: timestamp("created_at").defaultNow(),
});

// Tabela para templates de mensagens da IA
export const ai_templates = pgTable("ai_templates", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  template_name: text("template_name").notNull(),
  template_type: text("template_type").notNull(), // greeting, appointment_confirmation, follow_up, etc
  content: text("content").notNull(),
  variables: text("variables").array(), // variáveis disponíveis no template
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tabela para estágios do pipeline de vendas
export const pipeline_stages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  order_index: integer("order_index").notNull(),
  color: text("color").default("#3B82F6"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tabela para oportunidades no pipeline
export const pipeline_opportunities = pgTable("pipeline_opportunities", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  stage_id: integer("stage_id").notNull(),
  contact_id: integer("contact_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  value: integer("value"), // valor estimado em centavos
  probability: integer("probability").default(50), // probabilidade de fechamento (0-100)
  expected_close_date: timestamp("expected_close_date"),
  assigned_to: text("assigned_to"), // usuário responsável
  status: text("status").default("active"), // active, won, lost, on_hold
  tags: text("tags").array(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tabela para histórico de mudanças de estágio
export const pipeline_history = pgTable("pipeline_history", {
  id: serial("id").primaryKey(),
  opportunity_id: integer("opportunity_id").notNull(),
  from_stage_id: integer("from_stage_id"),
  to_stage_id: integer("to_stage_id").notNull(),
  changed_by: text("changed_by").notNull(),
  change_reason: text("change_reason"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// Tabela para atividades do pipeline (follow-ups, calls, meetings)
export const pipeline_activities = pgTable("pipeline_activities", {
  id: serial("id").primaryKey(),
  opportunity_id: integer("opportunity_id").notNull(),
  activity_type: text("activity_type").notNull(), // call, meeting, email, task, note
  title: text("title").notNull(),
  description: text("description"),
  scheduled_date: timestamp("scheduled_date"),
  completed_date: timestamp("completed_date"),
  assigned_to: text("assigned_to").notNull(),
  status: text("status").default("pending"), // pending, completed, cancelled
  outcome: text("outcome"), // resultado da atividade quando completada
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Schema validations for forms
export const insertAppointmentTagSchema = createInsertSchema(appointment_tags, {
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato hexadecimal"),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertAnalyticsMetricSchema = createInsertSchema(analytics_metrics).omit({
  id: true,
  created_at: true,
});

export const insertAiTemplateSchema = createInsertSchema(ai_templates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPipelineStageSchema = createInsertSchema(pipeline_stages).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPipelineOpportunitySchema = createInsertSchema(pipeline_opportunities).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPipelineHistorySchema = createInsertSchema(pipeline_history).omit({
  id: true,
  created_at: true,
});

export const insertPipelineActivitySchema = createInsertSchema(pipeline_activities).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Type definitions
export type AppointmentTag = typeof appointment_tags.$inferSelect;
export type InsertAppointmentTag = z.infer<typeof insertAppointmentTagSchema>;

export type AnalyticsMetric = typeof analytics_metrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;

export type AiTemplate = typeof ai_templates.$inferSelect;
export type InsertAiTemplate = z.infer<typeof insertAiTemplateSchema>;

export type PipelineStage = typeof pipeline_stages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;

export type PipelineOpportunity = typeof pipeline_opportunities.$inferSelect;
export type InsertPipelineOpportunity = z.infer<typeof insertPipelineOpportunitySchema>;

export type PipelineHistory = typeof pipeline_history.$inferSelect;
export type InsertPipelineHistory = z.infer<typeof insertPipelineHistorySchema>;

export type PipelineActivity = typeof pipeline_activities.$inferSelect;
export type InsertPipelineActivity = z.infer<typeof insertPipelineActivitySchema>;