import { Conversation, Message, SystemEvent, TimelineItem, PatientInfo } from '@/types/conversations';

export const mockConversations: Conversation[] = [
  {
    id: 1,
    patient_name: "Maria Silva",
    patient_avatar: undefined,
    last_message: "Muito obrigada! Vocês são sempre muito atenciosos. Até terça!",
    timestamp: "09:26",
    unread_count: 0,
    status: 'active',
    ai_active: true,
    has_pending_appointment: true
  },
  {
    id: 2,
    patient_name: "João Santos",
    patient_avatar: undefined,
    last_message: "Perfeito! Obrigado pelas orientações, doutor. Vou anotar tudo certinho.",
    timestamp: "14:45",
    unread_count: 0,
    status: 'active',
    ai_active: true,
    has_pending_appointment: false
  },
  {
    id: 3,
    patient_name: "Ana Costa",
    patient_avatar: undefined,
    last_message: "Que alívio! Muito obrigada, doutora. Até amanhã! ❤️",
    timestamp: "09:03",
    unread_count: 0,
    status: 'active',
    ai_active: true,
    has_pending_appointment: true
  },
  {
    id: 4,
    patient_name: "Carlos Oliveira",
    patient_avatar: undefined,
    last_message: "Doutor, preciso de ajuda urgente!",
    timestamp: "16:20",
    unread_count: 3,
    status: 'active',
    ai_active: false,
    has_pending_appointment: false
  },
  {
    id: 5,
    patient_name: "Patricia Lima",
    patient_avatar: undefined,
    last_message: "Obrigada! Já estou me sentindo melhor seguindo suas orientações.",
    timestamp: "11:40",
    unread_count: 1,
    status: 'active',
    ai_active: true,
    has_pending_appointment: false
  }
];

export const mockMessages: Message[] = [
  // Conversation 1 - Maria Silva
  { id: 1, conversation_id: 1, type: 'received', content: "Bom dia, Dra. Paula! Como está?", timestamp: "09:15", sender_name: "Maria Silva" },
  { id: 2, conversation_id: 1, type: 'sent_user', content: "Bom dia, Maria! Tudo bem por aqui. Como você está se sentindo?", timestamp: "09:17", sender_name: "Dra. Paula" },
  { 
    id: 3, 
    conversation_id: 1, 
    type: 'received', 
    content: "Estou bem, mas gostaria de remarcar minha consulta da próxima semana. Surgiu um compromisso inadiável no trabalho. Aproveitando, posso enviar meu receituário médico atual?", 
    timestamp: "09:18", 
    sender_name: "Maria Silva",
    media_type: 'document',
    media_url: 'https://example.com/receituario.pdf',
    media_filename: 'Receituário Médico Atual.pdf',
    media_size: 524288
  },
  { id: 4, conversation_id: 1, type: 'sent_user', content: "Claro! Sem problemas. Vou verificar a agenda para encontrarmos outro horário que funcione para você.", timestamp: "09:19", sender_name: "Dra. Paula" },
  { id: 5, conversation_id: 1, type: 'sent_ai', content: "Encontrei algumas opções disponíveis: terça às 14h, quarta às 10h ou quinta às 16h. Qual prefere?", timestamp: "09:20", sender_name: "IA" },
  { id: 6, conversation_id: 1, type: 'note', content: "Paciente mencionou dores de cabeça recorrentes. Investigar na próxima consulta.", timestamp: "09:20", sender_name: "Dra. Paula" },
  { id: 7, conversation_id: 1, type: 'received', content: "A terça às 14h seria perfeita! Posso confirmar esse horário?", timestamp: "09:22", sender_name: "Maria Silva" },
  { id: 8, conversation_id: 1, type: 'sent_user', content: "Perfeito! Vou agendar para terça-feira às 14h.", timestamp: "09:23", sender_name: "Dra. Paula" },
  { id: 9, conversation_id: 1, type: 'sent_ai', content: "Agendamento confirmado! Você receberá um lembrete 24h antes da consulta.", timestamp: "09:24", sender_name: "IA" },
  { id: 10, conversation_id: 1, type: 'note', content: "Lembrar de verificar exames de sangue pendentes.", timestamp: "09:24", sender_name: "Dra. Paula" },
  { id: 11, conversation_id: 1, type: 'received', content: "Muito obrigada! Vocês são sempre muito atenciosos. Até terça!", timestamp: "09:25", sender_name: "Maria Silva" },
  { id: 12, conversation_id: 1, type: 'sent_user', content: "Sempre às ordens, Maria! Tenha uma ótima semana e até terça às 14h. 😊", timestamp: "09:26", sender_name: "Dra. Paula" },

  // Conversation 2 - João Santos
  { id: 13, conversation_id: 2, type: 'received', content: "Dr. Carlos, boa tarde! Estou com uma dúvida sobre meu medicamento.", timestamp: "14:30", sender_name: "João Santos" },
  { id: 14, conversation_id: 2, type: 'sent_user', content: "Boa tarde, João! Qual é sua dúvida? Estou aqui para ajudar.", timestamp: "14:32", sender_name: "Dr. Carlos" },
  { 
    id: 15, 
    conversation_id: 2, 
    type: 'received', 
    content: "", 
    timestamp: "14:33", 
    sender_name: "João Santos",
    media_type: 'audio',
    media_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    media_filename: 'Rotina de Medicamentos.mp3',
    media_size: 156789,
    media_duration: 45
  },
  { id: 16, conversation_id: 2, type: 'received', content: "Esqueci de tomar a metformina ontem à noite. Devo tomar uma dose dupla hoje?", timestamp: "14:34", sender_name: "João Santos" },
  { id: 17, conversation_id: 2, type: 'sent_user', content: "Não, João! Nunca tome dose dupla. Continue com sua rotina normal e tome apenas a dose de hoje nos horários habituais.", timestamp: "14:35", sender_name: "Dr. Carlos" },
  { id: 18, conversation_id: 2, type: 'received', content: "Entendi. E como faço para não esquecer mais? Às vezes fico confuso com os horários.", timestamp: "14:36", sender_name: "João Santos" },
  { id: 19, conversation_id: 2, type: 'sent_ai', content: "Posso sugerir algumas estratégias: usar alarme no celular, deixar o medicamento sempre no mesmo local visível, ou usar um organizador de comprimidos semanal.", timestamp: "14:37", sender_name: "IA" },
  { id: 20, conversation_id: 2, type: 'received', content: "Boa ideia! Vou comprar um desses organizadores. Aproveito para perguntar: minha glicemia hoje cedo estava 160. Está alta?", timestamp: "14:39", sender_name: "João Santos" },
  { id: 21, conversation_id: 2, type: 'sent_user', content: "Sim, está um pouco elevada. O ideal é manter entre 70-130 em jejum. Você tomou café da manhã antes de medir?", timestamp: "14:41", sender_name: "Dr. Carlos" },
  { id: 22, conversation_id: 2, type: 'received', content: "Não, foi em jejum mesmo. Ontem comi uma sobremesa no almoço, pode ter influenciado?", timestamp: "14:42", sender_name: "João Santos" },
  { id: 23, conversation_id: 2, type: 'sent_user', content: "Pode sim. Vamos monitorar por alguns dias. Continue medindo em jejum e anote os valores. Se persistir alto, ajustamos a medicação na próxima consulta.", timestamp: "14:44", sender_name: "Dr. Carlos" },
  { id: 24, conversation_id: 2, type: 'received', content: "Perfeito! Obrigado pelas orientações, doutor. Vou anotar tudo certinho.", timestamp: "14:45", sender_name: "João Santos" },

  // Conversation 3 - Ana Costa
  { id: 25, conversation_id: 3, type: 'received', content: "Dra. Fernanda, bom dia! Tudo bem?", timestamp: "08:45", sender_name: "Ana Costa" },
  { id: 26, conversation_id: 3, type: 'sent_user', content: "Bom dia, Ana! Tudo ótimo por aqui. Como você e o bebê estão?", timestamp: "08:47", sender_name: "Dra. Fernanda" },
  { id: 27, conversation_id: 3, type: 'received', content: "Estamos bem! O bebê está mexendo bastante hoje. 😊 Queria confirmar se minha consulta do pré-natal continua para amanhã.", timestamp: "08:48", sender_name: "Ana Costa" },
  { id: 28, conversation_id: 3, type: 'sent_user', content: "Que bom saber que vocês estão bem! Vou verificar sua consulta na agenda.", timestamp: "08:49", sender_name: "Dra. Fernanda" },
  { id: 29, conversation_id: 3, type: 'sent_ai', content: "Sua consulta está confirmada para amanhã às 15h30. É recomendado chegar 15 minutos antes para a coleta de urina de rotina.", timestamp: "08:50", sender_name: "IA" },
  { id: 30, conversation_id: 3, type: 'received', content: "Perfeito! Já estava com saudades de escutar o coraçãozinho dele. Preciso levar algum exame específico?", timestamp: "08:52", sender_name: "Ana Costa" },
  { id: 31, conversation_id: 3, type: 'sent_user', content: "Traga os exames de sangue que pedimos na última consulta, se já ficaram prontos. Caso contrário, sem problemas!", timestamp: "08:54", sender_name: "Dra. Fernanda" },
  { id: 32, conversation_id: 3, type: 'received', content: "Já peguei! Hemograma e glicemia estão normais. Posso enviar por foto aqui mesmo?", timestamp: "08:55", sender_name: "Ana Costa" },
  { id: 33, conversation_id: 3, type: 'sent_user', content: "Pode sim! Mande as fotos que já vou dando uma olhada prévia.", timestamp: "08:56", sender_name: "Dra. Fernanda" },
  { 
    id: 34, 
    conversation_id: 3, 
    type: 'received', 
    content: "Aqui estão os exames de sangue:", 
    timestamp: "08:57", 
    sender_name: "Ana Costa",
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    media_filename: 'Hemograma Completo.jpg',
    media_size: 245760
  },
  { 
    id: 35, 
    conversation_id: 3, 
    type: 'received', 
    content: "", 
    timestamp: "08:58", 
    sender_name: "Ana Costa",
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&h=300&fit=crop',
    media_filename: 'Glicemia em Jejum.jpg',
    media_size: 198432
  },
  { id: 36, conversation_id: 3, type: 'sent_user', content: "Exames perfeitos, Ana! Tudo dentro da normalidade. Conversamos melhor amanhã, mas pode ficar tranquila.", timestamp: "09:02", sender_name: "Dra. Fernanda" },
  { id: 37, conversation_id: 3, type: 'received', content: "Que alívio! Muito obrigada, doutora. Até amanhã! ❤️", timestamp: "09:03", sender_name: "Ana Costa" },

  // Conversation 4 - Carlos Oliveira
  { id: 38, conversation_id: 4, type: 'received', content: "Dr. Roberto, preciso de ajuda urgente!", timestamp: "16:20", sender_name: "Carlos Oliveira" },
  { id: 39, conversation_id: 4, type: 'sent_user', content: "Carlos, o que está acontecendo? Me conte os detalhes.", timestamp: "16:21", sender_name: "Dr. Roberto" },
  { 
    id: 40, 
    conversation_id: 4, 
    type: 'received', 
    content: "Estou sentindo um desconforto no peito desde o almoço. Não é dor forte, mas estou preocupado. Tirei uma foto do meu eletrocardiograma caseiro:", 
    timestamp: "16:22", 
    sender_name: "Carlos Oliveira",
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
    media_filename: 'ECG Caseiro.jpg',
    media_size: 312456
  },
  { id: 41, conversation_id: 4, type: 'sent_user', content: "Entendo sua preocupação. Esse desconforto irradia para braço, pescoço ou costas? Está com falta de ar?", timestamp: "16:23", sender_name: "Dr. Roberto" },
  { id: 42, conversation_id: 4, type: 'received', content: "Não irradia, não. E não estou com falta de ar. É mais como uma pressão leve no peito.", timestamp: "16:24", sender_name: "Carlos Oliveira" },
  { id: 43, conversation_id: 4, type: 'sent_user', content: "Tomou todos os medicamentos hoje? E como está a pressão arterial?", timestamp: "16:25", sender_name: "Dr. Roberto" },

  // Conversation 5 - Patricia Lima
  { id: 44, conversation_id: 5, type: 'received', content: "Dra. Lucia, bom dia! Como está?", timestamp: "10:30", sender_name: "Patricia Lima" },
  { id: 45, conversation_id: 5, type: 'sent_user', content: "Bom dia, Patricia! Estou bem, obrigada. Como você está se sentindo com o novo tratamento?", timestamp: "10:32", sender_name: "Dra. Lucia" },
  { 
    id: 46, 
    conversation_id: 5, 
    type: 'received', 
    content: "Muito melhor! A ansiedade diminuiu bastante desde que comecei a tomar o medicamento. Gravei um vídeo mostrando como faço os exercícios de respiração:", 
    timestamp: "10:33", 
    sender_name: "Patricia Lima",
    media_type: 'video',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    media_filename: 'Exercícios de Respiração.mp4',
    media_size: 2048576,
    media_duration: 120,
    media_thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop'
  },
  { id: 47, conversation_id: 5, type: 'sent_user', content: "Que ótima notícia! E os exercícios de respiração que conversamos? Está conseguindo praticar?", timestamp: "10:35", sender_name: "Dra. Lucia" },
  { id: 48, conversation_id: 5, type: 'received', content: "Sim! Faço todos os dias pela manhã. Realmente ajuda muito a começar o dia mais calma.", timestamp: "10:36", sender_name: "Patricia Lima" },
  { id: 49, conversation_id: 5, type: 'sent_ai', content: "Excelente progresso! Manter a rotina de exercícios respiratórios potencializa os efeitos da medicação.", timestamp: "10:37", sender_name: "IA" },
  { id: 50, conversation_id: 5, type: 'received', content: "Queria tirar uma dúvida: posso tomar um chá de camomila junto com o medicamento?", timestamp: "10:38", sender_name: "Patricia Lima" },
  { id: 51, conversation_id: 5, type: 'sent_user', content: "Pode sim! Camomila é um excelente complemento natural. Inclusive pode potencializar o efeito relaxante.", timestamp: "10:39", sender_name: "Dra. Lucia" },
  { id: 52, conversation_id: 5, type: 'received', content: "Perfeito! E sobre a nossa próxima consulta, pode ser na mesma data?", timestamp: "10:40", sender_name: "Patricia Lima" },
  { id: 53, conversation_id: 5, type: 'sent_user', content: "Mantemos na sexta às 11h então. Vou anotar seu progresso no prontuário.", timestamp: "10:41", sender_name: "Dra. Lucia" },
  { 
    id: 54, 
    conversation_id: 5, 
    type: 'received', 
    content: "Obrigada! Já estou me sentindo melhor seguindo suas orientações. Anexei meu relatório de progresso:", 
    timestamp: "11:40", 
    sender_name: "Patricia Lima",
    media_type: 'document',
    media_url: 'https://example.com/relatorio-progresso.docx',
    media_filename: 'Relatório de Progresso - Ansiedade.docx',
    media_size: 45678
  }
];

export const mockSystemEvents: SystemEvent[] = [
  // Conversation 1 - Maria Silva
  { 
    id: 1, 
    conversation_id: 1, 
    type: 'availability_check', 
    content: "Consulta de disponibilidade pela IA", 
    timestamp: "09:19" 
  },
  { 
    id: 2, 
    conversation_id: 1, 
    type: 'appointment_created', 
    content: "Consulta agendada para 28/06 às 14:00 com Dra. Paula", 
    timestamp: "09:23",
    metadata: { 
      appointment_date: "28/06/2025", 
      appointment_time: "14:00", 
      doctor_name: "Dra. Paula" 
    }
  },

  // Conversation 2 - João Santos
  { 
    id: 3, 
    conversation_id: 2, 
    type: 'contact_created', 
    content: "Novo contato criado no sistema", 
    timestamp: "14:30" 
  },

  // Conversation 3 - Ana Costa
  { 
    id: 4, 
    conversation_id: 3, 
    type: 'availability_check', 
    content: "Consulta de disponibilidade pela IA", 
    timestamp: "08:49" 
  },
  { 
    id: 5, 
    conversation_id: 3, 
    type: 'appointment_status_changed', 
    content: "Status da consulta alterado de agendada para confirmada", 
    timestamp: "09:01",
    metadata: { 
      old_status: "agendada", 
      new_status: "confirmada" 
    }
  },

  // Conversation 4 - Carlos Oliveira
  { 
    id: 6, 
    conversation_id: 4, 
    type: 'contact_created', 
    content: "Novo contato criado no sistema", 
    timestamp: "16:20" 
  },
  { 
    id: 7, 
    conversation_id: 4, 
    type: 'appointment_created', 
    content: "Consulta agendada para 24/06 às 16:30 com Dr. Roberto", 
    timestamp: "16:25",
    metadata: { 
      appointment_date: "24/06/2025", 
      appointment_time: "16:30", 
      doctor_name: "Dr. Roberto" 
    }
  },

  // Conversation 5 - Patricia Lima
  { 
    id: 8, 
    conversation_id: 5, 
    type: 'appointment_status_changed', 
    content: "Status da consulta alterado de pendente para confirmada", 
    timestamp: "10:41",
    metadata: { 
      old_status: "pendente", 
      new_status: "confirmada" 
    }
  }
];

export const mockPatientInfo: PatientInfo = {
  id: 1,
  name: "Maria Silva",
  phone: "(11) 99999-9999",
  email: "maria@email.com",
  last_appointment: {
    date: "15/06/2025",
    time: "14:30",
    doctor: "Dr. João",
    specialty: "Cardiologia"
  },
  recent_appointments: [
    { date: "15/06", specialty: "Cardiologia" },
    { date: "10/05", specialty: "Clínico Geral" },
    { date: "22/04", specialty: "Cardiologia" }
  ]
};

export function createTimelineItems(conversationId: number): TimelineItem[] {
  const messages = mockMessages.filter(m => m.conversation_id === conversationId);
  const events = mockSystemEvents.filter(e => e.conversation_id === conversationId);
  
  const timeline: TimelineItem[] = [];
  
  messages.forEach(message => {
    timeline.push({
      id: message.id,
      type: 'message',
      timestamp: message.timestamp,
      data: message
    });
  });
  
  events.forEach(event => {
    timeline.push({
      id: event.id + 1000, // Offset to avoid ID conflicts
      type: 'event',
      timestamp: event.timestamp,
      data: event
    });
  });
  
  // Sort by timestamp
  timeline.sort((a, b) => {
    const timeA = new Date(`2025-01-01 ${a.timestamp}`).getTime();
    const timeB = new Date(`2025-01-01 ${b.timestamp}`).getTime();
    return timeA - timeB;
  });
  
  return timeline;
}

export const conversationFilters = [
  { type: 'all' as const, label: 'Todas' },
  { type: 'unread' as const, label: 'Não lidas' },
  { type: 'ai_active' as const, label: 'IA ativa' },
  { type: 'manual' as const, label: 'Manual' }
];

// Mock appointments data for calendar functionality
export const mockAppointments = [
  {
    id: 1,
    contact_id: 1,
    clinic_id: 1,
    user_id: 4,
    doctor_name: "Dr. João Silva",
    specialty: "Cardiologia",
    appointment_type: "consulta",
    scheduled_date: "2025-06-24 10:00:00",
    duration_minutes: 60,
    status: "agendada",
    payment_status: "pendente",
    created_at: "2025-06-20 10:00:00",
    updated_at: "2025-06-20 10:00:00"
  },
  {
    id: 2,
    contact_id: 2,
    clinic_id: 1,
    user_id: 4,
    doctor_name: "Dr. João Silva",
    specialty: "Clínico Geral",
    appointment_type: "consulta",
    scheduled_date: "2025-06-24 14:00:00",
    duration_minutes: 30,
    status: "agendada",
    payment_status: "pendente",
    created_at: "2025-06-20 14:00:00",
    updated_at: "2025-06-20 14:00:00"
  }
];

// Mock contacts data for appointments
export const mockContacts = [
  {
    id: 1,
    name: "Maria Silva",
    email: "maria@email.com",
    phone: "(11) 99999-9999",
    clinic_id: 1,
    status: "active",
    created_at: "2025-06-20 10:00:00",
    updated_at: "2025-06-20 10:00:00"
  },
  {
    id: 2,
    name: "João Santos",
    email: "joao@email.com",
    phone: "(11) 88888-8888",
    clinic_id: 1,
    status: "active",
    created_at: "2025-06-20 11:00:00",
    updated_at: "2025-06-20 11:00:00"
  }
];

// Dashboard mock data exports - Comprehensive medical clinic data
export const mockMetrics = {
  // Main metrics for cards
  mensagensHoje: 247,
  agendamentosHoje: 18,
  atendimentosAtivos: 12,
  
  // Performance metrics
  tempoResposta: "2.3s",
  taxaSucesso: 94.8,
  satisfacao: 4.7,
  
  // Legacy support for other components
  totalContacts: 1247,
  monthlyAppointments: 342,
  completedAppointments: 298,
  pendingAppointments: 44
};

export const mockActivities = [
  {
    id: 1,
    action: "Triagem automática concluída",
    details: "Paciente Maria Santos - Sintomas de gripe identificados",
    status: "Concluído",
    color: "green"
  },
  {
    id: 2,
    action: "Agendamento realizado via IA",
    details: "Dr. Carlos Silva - Cardiologia, 25/06 às 14:30",
    status: "Agendado",
    color: "blue"
  },
  {
    id: 3,
    action: "Análise de exames iniciada",
    details: "Resultados de hemograma para João Oliveira",
    status: "Em análise",
    color: "purple"
  },
  {
    id: 4,
    action: "Prescrição médica enviada",
    details: "Receita digital para Ana Costa - Antibiótico",
    status: "Enviado",
    color: "green"
  },
  {
    id: 5,
    action: "Lembrete de consulta enviado",
    details: "SMS automático para 15 pacientes - Consultas de amanhã",
    status: "Enviado",
    color: "blue"
  },
  {
    id: 6,
    action: "Suporte técnico acionado",
    details: "Integração WhatsApp - Verificação de conectividade",
    status: "Em progresso",
    color: "purple"
  }
];

export const weeklyPerformanceData = [
  { day: 'Seg', mensagens: 186, agendamentos: 12 },
  { day: 'Ter', mensagens: 234, agendamentos: 18 },
  { day: 'Qua', mensagens: 298, agendamentos: 22 },
  { day: 'Qui', mensagens: 267, agendamentos: 19 },
  { day: 'Sex', mensagens: 312, agendamentos: 25 },
  { day: 'Sáb', mensagens: 156, agendamentos: 8 },
  { day: 'Dom', mensagens: 89, agendamentos: 4 }
];

export const conversionData = [
  { name: 'Triagem Inicial', value: 42, fill: '#3b82f6' },
  { name: 'Em Consulta', value: 28, fill: '#10b981' },
  { name: 'Agendado', value: 18, fill: '#f59e0b' },
  { name: 'Finalizado', value: 12, fill: '#8b5cf6' }
];

export const hourlyActivityData = [
  { hour: '8h', atividade: 12 },
  { hour: '9h', atividade: 28 },
  { hour: '10h', atividade: 45 },
  { hour: '11h', atividade: 52 },
  { hour: '12h', atividade: 38 },
  { hour: '13h', atividade: 22 },
  { hour: '14h', atividade: 67 },
  { hour: '15h', atividade: 73 },
  { hour: '16h', atividade: 58 },
  { hour: '17h', atividade: 41 },
  { hour: '18h', atividade: 29 }
];

export const mockPipelineData = [
  {
    id: 1,
    name: "Maria Silva",
    phone: "(11) 99999-9999",
    email: "maria@email.com",
    stage: "novo",
    last_interaction: "2025-01-20T14:30:00Z",
    source: "whatsapp"
  },
  {
    id: 2,
    name: "João Santos",
    phone: "(11) 88888-8888",
    email: "joao@email.com",
    stage: "em_conversa",
    last_interaction: "2025-01-20T12:15:00Z",
    source: "telefone"
  },
  {
    id: 3,
    name: "Ana Costa",
    phone: "(11) 77777-7777",
    email: "ana@email.com",
    stage: "agendado",
    last_interaction: "2025-01-20T10:45:00Z",
    source: "site"
  }
];