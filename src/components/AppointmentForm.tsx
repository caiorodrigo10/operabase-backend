import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Clock, Plus, Check, ChevronsUpDown, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { AppointmentTagSelector } from "@/components/AppointmentTagSelector";
import type { Contact } from "../../../server/domains/contacts/contacts.schema";

const appointmentFormSchema = z.object({
  contact_id: z.string().min(1, "Paciente é obrigatório"),
  user_id: z.string().min(1, "Profissional é obrigatório"),
  type: z.string().min(1, "Tipo de consulta é obrigatório"),
  scheduled_date: z.string().min(1, "Data é obrigatória"),
  scheduled_time: z.string().min(1, "Horário é obrigatório"),
  duration: z.string().min(1, "Duração é obrigatória"),
  tag_id: z.union([z.string(), z.number()]).optional().transform(val => val ? (typeof val === 'string' ? parseInt(val) : val) : undefined),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  form?: any; // Optional form instance
  onSubmit: (data: AppointmentFormData) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
  preselectedContact?: Contact;
  showCancelButton?: boolean;
  showFindTimeButton?: boolean;
  onFindTimeClick?: () => void;
  patientForm?: any;
  setShowNewPatientDialog?: (show: boolean) => void;
  setFindTimeSlotsOpen?: (open: boolean) => void;
  availabilityConflict?: any;
  isCheckingAvailability?: boolean;
  workingHoursWarning?: any;
}

export function AppointmentForm({
  form: externalForm,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Agendar Consulta",
  cancelButtonText = "Cancelar",
  onCancel,
  preselectedContact,
  showCancelButton = true,
  showFindTimeButton = true,
  onFindTimeClick,
  patientForm,
  setShowNewPatientDialog,
  setFindTimeSlotsOpen,
  availabilityConflict,
  isCheckingAvailability = false,
  workingHoursWarning,
}: AppointmentFormProps) {
  const { toast } = useToast();
  const [contactComboboxOpen, setContactComboboxOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Use external form if provided, otherwise create internal form
  const internalForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
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

  const form = externalForm || internalForm;

  const watchedDate = form.watch("scheduled_date");
  const watchedDuration = form.watch("duration");

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/contacts?clinic_id=1');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
  });

  // Fetch clinic users
  const { data: clinicUsers = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/clinic/1/users/management'],
  });

  // Debug logging
  useEffect(() => {
    console.log('📊 API Response - All users:', clinicUsers);
    console.log('🔍 Professional users:', clinicUsers.filter((u: any) => u.is_professional));
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    }
  }, [clinicUsers, usersError]);

  // Handle preselected contact
  useEffect(() => {
    if (preselectedContact) {
      form.setValue('contact_id', preselectedContact.id.toString());
    }
  }, [preselectedContact, form]);

  const handleSubmit = (data: AppointmentFormData) => {
    onSubmit(data);
  };

  const handleFindTimeClick = () => {
    if (onFindTimeClick) {
      onFindTimeClick();
    } else if (setFindTimeSlotsOpen) {
      const targetDate = watchedDate || format(new Date(), 'yyyy-MM-dd');
      const targetDuration = watchedDuration || '30';
      setFindTimeSlotsOpen(true);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Contact Selection with Cadastrar button inline */}
        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-gray-700">Paciente *</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Popover open={contactComboboxOpen} onOpenChange={setContactComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={contactComboboxOpen}
                        className="flex-1 justify-between h-11 text-left font-normal px-3"
                      >
                        {field.value ? (
                          <span className="truncate">
                            {contacts.find((contact: Contact) => contact.id.toString() === field.value)?.name}
                          </span>
                        ) : (
                          <span className="text-gray-500">Buscar paciente...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Digite pelo menos 2 caracteres..." 
                          className="border-b"
                          value={patientSearchQuery}
                          onValueChange={setPatientSearchQuery}
                        />
                        {patientSearchQuery.length === 0 && (
                          <div className="py-6 text-center text-sm text-gray-500">
                            <div>Digite pelo menos 2 caracteres</div>
                          </div>
                        )}
                        {patientSearchQuery.length === 1 && (
                          <div className="py-6 text-center text-sm text-gray-500">
                            <div>Digite pelo menos 2 caracteres</div>
                          </div>
                        )}
                        {patientSearchQuery.length >= 2 && (
                          <>
                            <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                              <div>Nenhum paciente encontrado com "{patientSearchQuery}"</div>
                              {setShowNewPatientDialog && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="mt-2 text-blue-600"
                                  onClick={() => {
                                    setContactComboboxOpen(false);
                                    setPatientSearchQuery("");
                                    setShowNewPatientDialog(true);
                                    if (patientForm) {
                                      patientForm.setValue("name", patientSearchQuery);
                                    }
                                  }}
                                >
                                  <Plus className="mr-1 h-4 w-4" />
                                  Cadastrar paciente
                                </Button>
                              )}
                            </CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {contacts
                                .filter((contact: Contact) => 
                                  contact.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
                                )
                                .map((contact: Contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={contact.name}
                                  onSelect={() => {
                                    field.onChange(contact.id.toString());
                                    setContactComboboxOpen(false);
                                    setPatientSearchQuery("");
                                  }}
                                  className="flex items-center gap-3 p-3 cursor-pointer"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 bg-gray-500 text-white rounded-full text-sm font-medium flex-shrink-0">
                                    {contact.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-medium text-gray-900 truncate">{contact.name}</span>
                                    {contact.phone && (
                                      <span className="text-sm text-gray-500">{contact.phone}</span>
                                    )}
                                  </div>
                                  {field.value === contact.id.toString() && (
                                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                {setShowNewPatientDialog && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 text-blue-500 hover:text-white hover:bg-blue-500 border-blue-500 font-normal px-4"
                    onClick={() => setShowNewPatientDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Professional and Consultation Type */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-700">Profissional *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicUsers.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Nenhum profissional encontrado</div>
                      ) : (
                        clinicUsers
                          .filter((user: any) => {
                            console.log('User data:', user);
                            console.log('is_professional:', user.is_professional);
                            return user.is_professional === true || user.is_professional === 1;
                          })
                          .map((user: any) => (
                            <SelectItem key={user.id || user.user_id} value={(user.id || user.user_id)?.toString()}>
                              {user.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-700">Tipo de Consulta *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Consulta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="retorno">Retorno</SelectItem>
                      <SelectItem value="avaliacao">Avaliação</SelectItem>
                      <SelectItem value="procedimento">Procedimento</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date, Time, Duration and Find Time Button */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-3">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Data da consulta</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-3">
              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Horário</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="time"
                          {...field}
                          className="h-11 pr-8"
                        />
                        <Clock className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Duração</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="60" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="90">90</SelectItem>
                          <SelectItem value="120">120</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showFindTimeButton && (
              <div className="col-span-4">
                <FormItem>
                  <FormLabel className="text-sm text-gray-700 invisible">Ação</FormLabel>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-blue-500 hover:text-white hover:bg-blue-500 border-blue-500 font-normal px-6"
                      onClick={handleFindTimeClick}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Encontrar horário
                    </Button>
                  </FormControl>
                </FormItem>
              </div>
            )}
          </div>
        </div>

        {/* Smart Availability Status - Combined availability + context */}
        {(availabilityConflict || isCheckingAvailability) && (
          <div className={`p-3 rounded-lg border ${
            isCheckingAvailability
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : availabilityConflict?.hasConflict
                ? "bg-red-50 border-red-200 text-red-800"
                : workingHoursWarning && workingHoursWarning.hasWarning
                  ? "bg-orange-50 border-orange-200 text-orange-800"
                  : "bg-green-50 border-green-200 text-green-800"
          }`}>
            <div className="flex items-start gap-3">
              {isCheckingAvailability ? (
                <div className="w-4 h-4 mt-0.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : availabilityConflict?.hasConflict ? (
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : workingHoursWarning && workingHoursWarning.hasWarning ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {isCheckingAvailability ? (
                    'Verificando disponibilidade...'
                  ) : availabilityConflict?.hasConflict ? (
                    availabilityConflict.message
                  ) : workingHoursWarning && workingHoursWarning.hasWarning ? (
                    <>Horário livre, mas {workingHoursWarning.message.toLowerCase()}</>
                  ) : (
                    'Horário disponível'
                  )}
                </div>
                {!isCheckingAvailability && !availabilityConflict?.hasConflict && workingHoursWarning && workingHoursWarning.hasWarning && workingHoursWarning.details && (
                  <div className="text-xs text-orange-700 mt-1">
                    {workingHoursWarning.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tag Selector */}
        <AppointmentTagSelector
          clinicId={1}
          selectedTagId={selectedTagId}
          onTagSelect={(tagId) => {
            setSelectedTagId(tagId);
            form.setValue("tag_id", tagId || undefined);
          }}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações sobre a consulta..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {showCancelButton && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              {cancelButtonText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || (availabilityConflict?.hasConflict === true)}
          >
            {isSubmitting ? "Agendando..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}