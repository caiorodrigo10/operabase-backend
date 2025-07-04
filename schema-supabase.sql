-- Esquema completo para Supabase
-- Execute este SQL no painel do Supabase em: SQL Editor

-- Limpar tabelas existentes (cuidado em produção!)
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS pipeline_opportunities CASCADE;
DROP TABLE IF EXISTS pipeline_stages CASCADE;
DROP TABLE IF EXISTS charges CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS clinic_invitations CASCADE;
DROP TABLE IF EXISTS clinic_users CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Tabela de sessões
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX "IDX_session_expire" ON sessions (expire);

-- Tabela de usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de clínicas
CREATE TABLE clinics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  specialties TEXT[],
  working_hours TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de relacionamento clínica-usuário
CREATE TABLE clinic_users (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR NOT NULL DEFAULT 'user',
  permissions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by INTEGER,
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, user_id)
);

-- Tabela de convites
CREATE TABLE clinic_invitations (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  permissions JSONB,
  token VARCHAR NOT NULL UNIQUE,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de contatos
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  gender TEXT,
  profession TEXT,
  address TEXT,
  emergency_contact TEXT,
  medical_history TEXT,
  current_medications TEXT[],
  allergies TEXT[],
  status TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  source TEXT DEFAULT 'whatsapp',
  notes TEXT,
  first_contact TIMESTAMP DEFAULT NOW(),
  last_interaction TIMESTAMP DEFAULT NOW()
);

-- Tabela de conversas
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id),
  clinic_id INTEGER REFERENCES clinics(id),
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_action TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) NOT NULL,
  clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  doctor_name TEXT,
  specialty TEXT,
  appointment_type TEXT,
  scheduled_date TIMESTAMP,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL,
  cancellation_reason TEXT,
  session_notes TEXT,
  next_appointment_suggested TIMESTAMP,
  payment_status TEXT DEFAULT 'pendente',
  payment_amount INTEGER,
  google_calendar_event_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de prontuários médicos
CREATE TABLE medical_records (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id),
  contact_id INTEGER REFERENCES contacts(id) NOT NULL,
  clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'consultation',
  content TEXT,
  chief_complaint TEXT,
  history_present_illness TEXT,
  physical_examination TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  prescriptions JSONB,
  exam_requests JSONB,
  follow_up_instructions TEXT,
  observations TEXT,
  vital_signs JSONB,
  attachments TEXT[],
  voice_transcription TEXT,
  ai_summary TEXT,
  templates_used TEXT[],
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabelas de pipeline
CREATE TABLE pipeline_stages (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id),
  name TEXT NOT NULL,
  description TEXT,
  order_position INTEGER NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  target_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pipeline_opportunities (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id),
  contact_id INTEGER REFERENCES contacts(id),
  stage_id INTEGER REFERENCES pipeline_stages(id),
  title TEXT NOT NULL,
  description TEXT,
  value INTEGER,
  probability INTEGER DEFAULT 50,
  expected_close_date TIMESTAMP,
  actual_close_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  lost_reason TEXT,
  source TEXT,
  assigned_to TEXT,
  tags TEXT[],
  priority TEXT DEFAULT 'medium',
  next_action TEXT,
  next_action_date TIMESTAMP,
  stage_entered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabelas financeiras
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
  contact_id INTEGER REFERENCES contacts(id),
  asaas_customer_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  address_number TEXT,
  complement TEXT,
  province TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE charges (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  appointment_id INTEGER REFERENCES appointments(id),
  asaas_charge_id TEXT UNIQUE,
  billing_type TEXT NOT NULL,
  value INTEGER NOT NULL,
  net_value INTEGER,
  original_value INTEGER,
  interest_value INTEGER,
  description TEXT,
  external_reference TEXT,
  status TEXT NOT NULL,
  due_date DATE NOT NULL,
  original_due_date DATE,
  payment_date TIMESTAMP,
  client_payment_date DATE,
  installment_number INTEGER,
  installment_count INTEGER,
  gross_value INTEGER,
  invoice_url TEXT,
  bank_slip_url TEXT,
  transaction_receipt_url TEXT,
  invoice_number TEXT,
  credit_card JSONB,
  discount JSONB,
  fine JSONB,
  interest JSONB,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Integrações de calendário
CREATE TABLE calendar_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_user_id TEXT,
  email TEXT,
  calendar_id TEXT,
  calendar_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_errors JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices importantes
CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_contact ON appointments(contact_id);
CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_contact ON medical_records(contact_id);
CREATE INDEX idx_medical_records_clinic ON medical_records(clinic_id);
CREATE INDEX idx_clinic_users_clinic ON clinic_users(clinic_id);
CREATE INDEX idx_clinic_users_user ON clinic_users(user_id);
CREATE INDEX idx_invitations_email ON clinic_invitations(email);
CREATE INDEX idx_invitations_token ON clinic_invitations(token);
CREATE INDEX idx_charges_clinic ON charges(clinic_id);
CREATE INDEX idx_charges_customer ON charges(customer_id);
CREATE INDEX idx_charges_status ON charges(status);
CREATE INDEX idx_charges_due_date ON charges(due_date);

-- Habilitar RLS (Row Level Security) para algumas tabelas sensíveis
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Comentário final
SELECT 'Esquema criado com sucesso!' as resultado;