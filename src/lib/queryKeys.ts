// Query keys centralizadas para garantir consistência em toda a aplicação
export const QUERY_KEYS = {
  // Appointments
  APPOINTMENTS: (clinicId: number) => ['/api/appointments', { clinic_id: clinicId }] as const,
  
  // Contacts
  CONTACTS: (clinicId: number) => ['/api/contacts', { clinic_id: clinicId }] as const,
  
  // Clinic Users
  CLINIC_USERS: (clinicId: number) => [`/api/clinic/${clinicId}/users/management`] as const,
  
  // Clinic Config
  CLINIC_CONFIG: (clinicId: number) => [`/api/clinic/${clinicId}/config`] as const,
  
  // Appointment Tags
  APPOINTMENT_TAGS: (clinicId: number) => [`/api/clinic/${clinicId}/appointment-tags`] as const,
  
  // Medical Records
  MEDICAL_RECORDS: (contactId: number) => [`/api/contacts/${contactId}/medical-records`] as const,
} as const;

// Helper para invalidar queries relacionadas aos appointments
export const invalidateAppointmentQueries = (queryClient: any, clinicId: number = 1) => {
  console.log('🔄 Invalidating appointment queries for clinic:', clinicId);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPOINTMENTS(clinicId) }),
    queryClient.refetchQueries({ queryKey: QUERY_KEYS.APPOINTMENTS(clinicId) })
  ]);
};

// Helper para invalidar queries relacionadas aos contacts
export const invalidateContactQueries = (queryClient: any, clinicId: number = 1) => {
  console.log('🔄 Invalidating contact queries for clinic:', clinicId);
  return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS(clinicId) });
}; 