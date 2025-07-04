/**
 * Centralized Appointment Status Constants
 * 
 * This file defines all appointment statuses and their categorization
 * for availability checking and conflict detection.
 */

// All possible cancelled statuses in the system
export const CANCELLED_STATUSES = [
  'cancelada',           // Simple cancellation
  'cancelada_paciente',  // Cancelled by patient (MCP)
  'cancelada_dentista'   // Cancelled by professional (MCP)
] as const;

// Statuses that block time slots (prevent new appointments)
export const BLOCKING_STATUSES = [
  'agendada',    // Scheduled
  'confirmada',  // Confirmed
  'realizada'    // Completed
] as const;

// Statuses that don't block time slots (allow new appointments)
export const NON_BLOCKING_STATUSES = [
  ...CANCELLED_STATUSES,
  'faltou'  // No-show
] as const;

// All valid appointment statuses
export const ALL_APPOINTMENT_STATUSES = [
  ...BLOCKING_STATUSES,
  ...NON_BLOCKING_STATUSES
] as const;

// Type definitions for TypeScript
export type CancelledStatus = typeof CANCELLED_STATUSES[number];
export type BlockingStatus = typeof BLOCKING_STATUSES[number];
export type NonBlockingStatus = typeof NON_BLOCKING_STATUSES[number];
export type AppointmentStatus = typeof ALL_APPOINTMENT_STATUSES[number]; 