import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS, invalidateAppointmentQueries, invalidateContactQueries } from "@/lib/queryKeys";
import { AppointmentForm } from "@/components/AppointmentForm";
import { FindTimeSlots } from "@/components/FindTimeSlots";
import { useAvailabilityCheck, formatConflictMessage } from "@/hooks/useAvailability";
import { format } from "date-fns";
import type { Contact } from "../../../server/domains/contacts/contacts.schema";

interface AppointmentEditorProps {
  appointmentId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (appointment: any) => void;
  preselectedContact?: Contact;
}

export function AppointmentEditor({ appointmentId, isOpen, onClose, onSave, preselectedContact }: AppointmentEditorProps) {
  const { toast } = useToast();
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [findTimeSlotsOpen, setFindTimeSlotsOpen] = useState(false);
  const [availabilityConflict, setAvailabilityConflict] = useState<any>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [workingHoursWarning, setWorkingHoursWarning] = useState<any>(null);
  const [patientFormTab, setPatientFormTab] = useState("basic");

  // Appointment form schema
  const appointmentSchema = z.object({
    contact_id: z.string().min(1, "Contato é obrigatório"),
    user_id: z.string().min(1, "Profissional é obrigatório"),
    scheduled_date: z.string().min(1, "Data é obrigatória"),
    scheduled_time: z.string().min(1, "Horário é obrigatório"),
    duration: z.string().min(1, "Duração é obrigatória"),
    type: z.string().min(1, "Tipo é obrigatório"),
    notes: z.string().optional(),
    tag_id: z.string().optional(),
  });

  type AppointmentFormData = z.infer<typeof appointmentSchema>;

  // Patient form schema - comprehensive form matching contacts page
  const patientSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    profession: z.string().optional(),
    gender: z.string().optional(),
    reminder_preference: z.string().optional(),
    cpf: z.string().optional(),
    rg: z.string().optional(),
    birth_date: z.string().optional(),
    how_found_clinic: z.string().optional(),
    notes: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    landline_phone: z.string().optional(),
    zip_code: z.string().optional(),
    address: z.string().optional(),
    address_complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    responsible_name: z.string().optional(),
    responsible_cpf: z.string().optional(),
    responsible_birth_date: z.string().optional(),
    insurance_type: z.string().optional(),
    insurance_holder: z.string().optional(),
    insurance_number: z.string().optional(),
    insurance_responsible_cpf: z.string().optional(),
  });

  // Patient form for new patient creation
  const patientForm = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      clinic_id: 1,
      name: "",
      phone: "",
      email: "",
      profession: "",
      gender: "",
      reminder_preference: "whatsapp",
      cpf: "",
      rg: "",
      birth_date: "",
      how_found_clinic: "",
      notes: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      landline_phone: "",
      zip_code: "",
      address: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
      responsible_name: "",
      responsible_cpf: "",
      responsible_birth_date: "",
      insurance_type: "",
      insurance_holder: "",
      insurance_number: "",
      insurance_responsible_cpf: "",
    },
  });

  // Availability check hook
  const { checkAvailability } = useAvailabilityCheck();

  // Fetch contacts for patient search
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/contacts?clinic_id=1');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  // Fetch clinic users
  const { data: clinicUsers = [] } = useQuery({
    queryKey: ['/api/clinic/1/users/management'],
    queryFn: async () => {
      const response = await fetch('/api/clinic/1/users/management');
      if (!response.ok) {
        throw new Error('Failed to fetch clinic users');
      }
      return response.json();
    },
  });

  // Create new patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (patientData: any) => {
      const response = await apiRequest('/api/contacts', 'POST', {
        ...patientData,
        clinic_id: 1,
      });

      if (!response.ok) {
        throw new Error('Failed to create patient');
      }

      return response.json();
    },
    onSuccess: (newPatient) => {
      toast({
        title: "Paciente cadastrado",
        description: "Novo paciente criado com sucesso.",
      });

      invalidateContactQueries(queryClient, 1);
      setShowNewPatientDialog(false);
      patientForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Erro ao criar novo paciente.",
        variant: "destructive",
      });
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const appointmentData = {
        contact_id: parseInt(data.contact_id),
        user_id: parseInt(data.user_id),
        clinic_id: 1,
        type: data.type,
        appointment_type: data.type,
        specialty: data.type,
        scheduled_date: data.scheduled_date, // Keep date as YYYY-MM-DD
        scheduled_time: data.scheduled_time, // Keep time as HH:MM
        duration: parseInt(data.duration),
        duration_minutes: parseInt(data.duration),
        status: "agendada",
        notes: data.notes || null,
        session_notes: data.notes || null,
        tag_id: data.tag_id ? parseInt(data.tag_id) : null,
      };

      const response = await apiRequest('/api/appointments', 'POST', appointmentData);

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      return response.json();
    },
    onSuccess: async (appointment) => {
      toast({
        title: "Consulta agendada",
        description: "A consulta foi agendada com sucesso.",
      });
      await invalidateAppointmentQueries(queryClient, 1);
      if (onSave) onSave(appointment);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Ocorreu um erro ao agendar a consulta.",
        variant: "destructive",
      });
    },
  });

  // Form instance for appointment creation
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      contact_id: "",
      user_id: "",
      type: "consulta",
      scheduled_date: "",
      scheduled_time: "",
      duration: "60",
      tag_id: "",
      notes: "",
    },
  });

  // Watch form fields for availability checking
  const watchedDate = form.watch("scheduled_date");
  const watchedTime = form.watch("scheduled_time");
  const watchedDuration = form.watch("duration");
  const watchedProfessionalId = form.watch("user_id");

  // Set preselected contact
  useEffect(() => {
    if (preselectedContact) {
      form.setValue('contact_id', preselectedContact.id.toString());
    }
  }, [preselectedContact, form]);

  // Handle availability check with useAvailabilityCheck hook
  const availabilityCheckHook = useAvailabilityCheck();

  const handleAvailabilityCheck = useCallback(async (date: string, time: string, duration: string, professionalName?: string) => {
    if (!date || !time || !duration) {
      setAvailabilityConflict(null);
      setIsCheckingAvailability(false);
      return;
    }

    setIsCheckingAvailability(true);
    const startDateTime = new Date(`${date}T${time}`);
    const durationMinutes = parseInt(duration);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

    try {
      const result = await availabilityCheckHook.mutateAsync({
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        professionalName: professionalName
      });

      if (result.conflict) {
        setAvailabilityConflict({
          hasConflict: true,
          message: `Conflito detectado: ${result.conflictType}`,
          conflictType: result.conflictType
        });
      } else {
        setAvailabilityConflict({
          hasConflict: false,
          message: "Horário disponível",
          conflictType: undefined
        });
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setAvailabilityConflict(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [availabilityCheckHook]);

  // Helper function to get professional name by ID
  const getProfessionalNameById = useCallback((userId: string | number) => {
    if (!userId) return null;
    const user = clinicUsers.find((u: any) => (u.id || u.user_id)?.toString() === userId.toString());
    return user?.name || null;
  }, [clinicUsers]);

  // Separate effect for professional selection - immediate response
  useEffect(() => {
    const professionalName = getProfessionalNameById(watchedProfessionalId);

    if (!watchedProfessionalId || !professionalName) {
      setAvailabilityConflict({
        hasConflict: true,
        message: "Selecione um profissional antes de verificar disponibilidade",
        conflictType: "no_professional"
      });
    } else {
      // Professional selected - clear the warning immediately
      if (availabilityConflict?.conflictType === "no_professional") {
        setAvailabilityConflict(null);
      }
    }
  }, [watchedProfessionalId]);

  // Separate effect for date/time changes - with debounce
  useEffect(() => {
    if (!watchedProfessionalId) return;

    const professionalName = getProfessionalNameById(watchedProfessionalId);
    if (!professionalName) return;

    const timeoutId = setTimeout(() => {
      if (watchedDate && watchedTime && watchedDuration) {
        handleAvailabilityCheck(watchedDate, watchedTime, watchedDuration, professionalName);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedDate, watchedTime, watchedDuration, watchedProfessionalId]);

  // Handle form submission
  const handleSubmit = (data: AppointmentFormData) => {
    const formattedData = {
      ...data,
      tag_id: data.tag_id ? parseInt(data.tag_id) : undefined,
    };
    createAppointmentMutation.mutate(formattedData);
  };

  // Handle new patient creation
  const handleCreatePatient = (patientData: any) => {
    createPatientMutation.mutate(patientData);
  };

  // Handle find time slots
  const handleFindTimeClick = () => {
    setFindTimeSlotsOpen(true);
  };

  return (
    <>
      {/* Main Appointment Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Nova Consulta</DialogTitle>
            <DialogDescription>
              Preencha os dados para agendar uma nova consulta. O sistema verificará automaticamente a disponibilidade.
            </DialogDescription>
          </DialogHeader>

          <AppointmentForm
            form={form}
            onSubmit={handleSubmit}
            isSubmitting={createAppointmentMutation.isPending}
            submitButtonText="Agendar Consulta"
            cancelButtonText="Cancelar"
            onCancel={onClose}
            preselectedContact={preselectedContact}
            showCancelButton={true}
            showFindTimeButton={true}
            onFindTimeClick={handleFindTimeClick}
            patientForm={patientForm}
            setShowNewPatientDialog={setShowNewPatientDialog}
            setFindTimeSlotsOpen={setFindTimeSlotsOpen}
            availabilityConflict={availabilityConflict}
            isCheckingAvailability={isCheckingAvailability}
            workingHoursWarning={workingHoursWarning}
          />
        </DialogContent>
      </Dialog>

      {/* New Patient Dialog - Comprehensive Contact Form */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar novo paciente</DialogTitle>
          </DialogHeader>

          <Form {...patientForm}>
            <form onSubmit={patientForm.handleSubmit(handleCreatePatient)} className="space-y-6">
              <Tabs value={patientFormTab} onValueChange={setPatientFormTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Informações básicas</TabsTrigger>
                  <TabsTrigger value="additional">Informações complementares</TabsTrigger>
                  <TabsTrigger value="insurance">Convênio</TabsTrigger>
                </TabsList>

                {/* Tab 1: Basic Information */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>* Nome completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar gênero" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000-0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissão</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite a profissão" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="how_found_clinic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como conheceu a clínica?</FormLabel>
                          <FormControl>
                            <Input placeholder="Referência, pesquisa, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tab 2: Additional Information */}
                <TabsContent value="additional" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="emergency_contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do contato de emergência</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do responsável" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="emergency_contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone do contato de emergência</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite a cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="SP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={patientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, número" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Informações adicionais sobre o paciente..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab 3: Insurance Information */}
                <TabsContent value="insurance" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="insurance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de convênio</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do convênio" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="insurance_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da carteirinha</FormLabel>
                          <FormControl>
                            <Input placeholder="Número do convênio" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={patientForm.control}
                    name="insurance_holder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titular do convênio</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do titular" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPatientDialog(false)}
                  disabled={createPatientMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                >
                  {createPatientMutation.isPending ? "Cadastrando..." : "Cadastrar Paciente"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Find Time Slots Dialog (igual ao de /consultas) */}
      <Dialog open={findTimeSlotsOpen} onOpenChange={setFindTimeSlotsOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto z-[60]">
          <FindTimeSlots
            selectedDate={watchedDate || ''}
            duration={parseInt(watchedDuration) || 30}
            professionalName={getProfessionalNameById(watchedProfessionalId)}
            onTimeSelect={(time: string, date: string) => {
              // Update the appointment form with selected time
              form.setValue("scheduled_time", time);
              form.setValue("scheduled_date", date);
              setFindTimeSlotsOpen(false);
            }}
            onClose={() => setFindTimeSlotsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}