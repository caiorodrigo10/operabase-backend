/**
 * Unified Schema Export
 * Phase 2: Schema Consolidation
 * 
 * This index provides a single source of truth for all schemas
 * eliminating duplications across domain schemas
 */

// Base schemas
export * from './base/common.schema';
export * from './base/response.schema';

// Entity schemas
export * from './entities/user.schema';
export * from './entities/contact.schema';
export * from './entities/appointment.schema';

// Re-export for backward compatibility during migration
export {
  userSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  loginSchema,
  type User,
  type CreateUser,
  type UpdateUser,
  type UpdateProfile,
  type Login
} from './entities/user.schema';

export {
  contactSchema,
  createContactSchema,
  updateContactSchema,
  updateContactStatusSchema,
  conversationSchema,
  messageSchema,
  type Contact,
  type CreateContact,
  type UpdateContact,
  type Conversation,
  type Message
} from './entities/contact.schema';

export {
  appointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  appointmentTagSchema,
  type Appointment,
  type CreateAppointment,
  type UpdateAppointment,
  type AppointmentTag
} from './entities/appointment.schema';

export {
  successResponseSchema,
  errorResponseSchema,
  paginatedResponseSchema,
  listResponseSchema,
  itemResponseSchema,
  healthResponseSchema,
  metricsResponseSchema,
  type BaseResponse,
  type ErrorResponse,
  type Pagination,
  type HealthResponse,
  type MetricsResponse
} from './base/response.schema';