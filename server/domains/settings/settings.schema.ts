
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clinic_settings = pgTable("clinic_settings", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  setting_key: text("setting_key").notNull(),
  setting_value: text("setting_value").notNull(),
  setting_type: text("setting_type").notNull(), // string, number, boolean, json
  description: text("description"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertClinicSettingSchema = createInsertSchema(clinic_settings).omit({
  id: true,
  updated_at: true,
});

export type ClinicSetting = typeof clinic_settings.$inferSelect;
export type InsertClinicSetting = z.infer<typeof insertClinicSettingSchema>;
