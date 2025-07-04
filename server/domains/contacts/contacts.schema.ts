
import { pgTable, text, serial, integer, timestamp, varchar, index, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  age: integer("age"),
  gender: text("gender"),
  profession: text("profession"),
  address: text("address"),
  emergency_contact: text("emergency_contact"),
  medical_history: text("medical_history"),
  current_medications: text("current_medications").array(),
  allergies: text("allergies").array(),
  profile_picture: text("profile_picture"), // URL da foto do perfil
  status: text("status").notNull(), // lead, ativo, inativo
  priority: text("priority").default("normal"), // baixa, normal, alta, urgente
  source: text("source").default("whatsapp"), // whatsapp, site, indicacao, outros
  notes: text("notes"),
  first_contact: timestamp("first_contact").defaultNow(),
  last_interaction: timestamp("last_interaction").defaultNow(),
}, (table) => [
  // Critical multi-tenant indexes for performance
  index("idx_contacts_clinic_status").on(table.clinic_id, table.status),
  index("idx_contacts_clinic_updated").on(table.clinic_id, table.last_interaction),
  index("idx_contacts_clinic_name").on(table.clinic_id, table.name),
  index("idx_contacts_phone_clinic").on(table.phone, table.clinic_id),
  index("idx_contacts_clinic_priority").on(table.clinic_id, table.priority),
]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  conversation_id: bigint("conversation_id", { mode: "bigint" }).notNull().unique(),
  contact_id: integer("contact_id").notNull(),
  clinic_id: integer("clinic_id").notNull(),
  status: text("status").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Critical indexes for conversation performance
  index("idx_conversations_clinic_updated").on(table.clinic_id, table.updated_at),
  index("idx_conversations_contact_clinic").on(table.contact_id, table.clinic_id),
  index("idx_conversations_clinic_status").on(table.clinic_id, table.status),
]);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id").notNull(), // Simplificar para integer primeiro
  sender_type: text("sender_type").notNull(), // patient, ai, professional, system
  content: text("content").notNull(),
  message_type: varchar("message_type", { length: 50 }).notNull().default("text"), // text, image, audio, video, document, location, contact
  ai_action: text("ai_action"), // agendou_consulta, enviou_followup, etc
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  // Critical index for message loading performance
  index("idx_messages_conversation_timestamp").on(table.conversation_id, table.timestamp),
]);

export const insertContactSchema = createInsertSchema(contacts).extend({
  // Make optional fields nullable to handle null values from frontend
  profession: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  medical_history: z.string().nullable().optional(),
  profile_picture: z.string().nullable().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations);

export const insertMessageSchema = createInsertSchema(messages);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
