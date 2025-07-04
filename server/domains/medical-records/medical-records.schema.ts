
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const medical_records = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  appointment_id: integer("appointment_id"),
  contact_id: integer("contact_id").notNull(),
  clinic_id: integer("clinic_id").notNull(),
  record_type: text("record_type").notNull().default("consultation"), // consultation, exam, prescription, note
  content: text("content"), // nota livre em formato markdown
  chief_complaint: text("chief_complaint"), // queixa principal
  history_present_illness: text("history_present_illness"), // história da doença atual
  physical_examination: text("physical_examination"), // exame físico
  diagnosis: text("diagnosis"), // diagnóstico
  treatment_plan: text("treatment_plan"), // plano de tratamento
  prescriptions: jsonb("prescriptions"), // receitas médicas
  exam_requests: jsonb("exam_requests"), // solicitações de exames
  follow_up_instructions: text("follow_up_instructions"), // instruções de retorno
  observations: text("observations"), // observações gerais
  vital_signs: jsonb("vital_signs"), // sinais vitais (pressão, temperatura, etc)
  attachments: text("attachments").array(), // URLs de anexos (imagens, PDFs, etc)
  voice_transcription: text("voice_transcription"), // transcrição de áudio
  ai_summary: text("ai_summary"), // resumo gerado por IA
  templates_used: text("templates_used").array(), // templates médicos utilizados
  version: integer("version").default(1), // controle de versão
  is_active: boolean("is_active").default(true),
  created_by: integer("created_by"),
  updated_by: integer("updated_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Critical multi-tenant composite indexes for medical records performance
  index("idx_medical_records_clinic_updated").on(table.clinic_id, table.updated_at),
  index("idx_medical_records_contact_clinic").on(table.contact_id, table.clinic_id),
  index("idx_medical_records_clinic_type").on(table.clinic_id, table.record_type),
  index("idx_medical_records_clinic_active").on(table.clinic_id, table.is_active),
  // Existing single-column indexes
  index("idx_medical_records_appointment").on(table.appointment_id),
  index("idx_medical_records_contact").on(table.contact_id),
  index("idx_medical_records_clinic").on(table.clinic_id),
]);

export const insertMedicalRecordSchema = createInsertSchema(medical_records).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type MedicalRecord = typeof medical_records.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
