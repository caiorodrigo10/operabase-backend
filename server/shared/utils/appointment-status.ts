/**
 * Appointment Status Utility Functions
 * 
 * Centralized functions to check appointment status types
 * for availability and conflict detection.
 */

import { 
  CANCELLED_STATUSES, 
  BLOCKING_STATUSES, 
  NON_BLOCKING_STATUSES,
  type AppointmentStatus 
} from '../constants/appointment-statuses';

/**
 * Check if an appointment status blocks time slots
 * @param status - The appointment status to check
 * @returns true if the status blocks new appointments
 */
export function isAppointmentBlocking(status: string): boolean {
  return BLOCKING_STATUSES.includes(status as any);
}

/**
 * Check if an appointment is cancelled
 * @param status - The appointment status to check
 * @returns true if the appointment is cancelled
 */
export function isAppointmentCancelled(status: string): boolean {
  return CANCELLED_STATUSES.includes(status as any);
}

/**
 * Check if an appointment status allows new bookings in the same time slot
 * @param status - The appointment status to check
 * @returns true if new appointments can be booked in this time slot
 */
export function isTimeSlotAvailable(status: string): boolean {
  return NON_BLOCKING_STATUSES.includes(status as any);
}

/**
 * Get all cancelled status values as array (for SQL queries)
 * @returns Array of cancelled status strings
 */
export function getCancelledStatusList(): string[] {
  return [...CANCELLED_STATUSES];
}

/**
 * Get all blocking status values as array (for SQL queries)
 * @returns Array of blocking status strings
 */
export function getBlockingStatusList(): string[] {
  return [...BLOCKING_STATUSES];
}

/**
 * Generate SQL IN clause condition for cancelled statuses
 * @returns SQL condition string for cancelled statuses
 */
export function getCancelledStatusSQLCondition(): string {
  const statusList = getCancelledStatusList().map(s => `'${s}'`).join(', ');
  return `(${statusList})`;
}

/**
 * Generate SQL NOT IN clause condition for blocking statuses
 * @returns SQL condition string to exclude blocking statuses
 */
export function getNonBlockingSQLCondition(): string {
  const statusList = getBlockingStatusList().map(s => `'${s}'`).join(', ');
  return `NOT IN (${statusList})`;
} 