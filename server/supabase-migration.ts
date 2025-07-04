import { db } from './db.js';
import { supabaseAdmin } from './supabase-client.js';
import * as schema from '../shared/schema.js';

interface MigrationStats {
  table: string;
  recordsExported: number;
  recordsImported: number;
  errors: string[];
}

export class SupabaseMigration {
  private stats: MigrationStats[] = [];

  async migrate(): Promise<void> {
    console.log('🚀 Iniciando migração para Supabase...');
    
    try {
      // 1. Criar estrutura das tabelas no Supabase
      await this.createTables();
      
      // 2. Migrar dados em ordem de dependência
      await this.migrateTableData();
      
      // 3. Exibir relatório final
      this.displayReport();
      
      console.log('✅ Migração concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro durante a migração:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    console.log('📋 Verificando estrutura das tabelas no Supabase...');
    
    // No Supabase, as tabelas devem ser criadas através da interface web
    // ou usando migrations do Supabase CLI. Por enquanto, vamos apenas verificar
    // se as tabelas já existem e proceder com a migração de dados.
    
    try {
      // Verificar se conseguimos acessar uma tabela básica
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log('⚠️  Tabelas não encontradas no Supabase.');
        console.log('📝 Para criar as tabelas, acesse o painel do Supabase e execute o SQL:');
        console.log('   https://supabase.com/dashboard/project/[seu-projeto]/sql');
        console.log('   Use o arquivo schema-supabase.sql que será criado');
        
        // Criar arquivo SQL para execução manual
        await this.createSchemaFile();
        
        throw new Error('Tabelas não existem no Supabase. Execute o SQL gerado primeiro.');
      } else {
        console.log('✅ Tabelas encontradas no Supabase');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Tabelas não existem')) {
        throw error;
      }
      console.warn('⚠️  Erro ao verificar tabelas:', error);
    }
  }

  private async createSchemaFile(): Promise<void> {
    const schemaSQL = `-- Esquema completo para Supabase
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
SELECT 'Esquema criado com sucesso!' as resultado;`;

    // Salvar arquivo SQL
    const fs = await import('fs');
    await fs.promises.writeFile('schema-supabase.sql', schemaSQL, 'utf8');
    console.log('📄 Arquivo schema-supabase.sql criado na raiz do projeto');
  }

  private async migrateTableData(): Promise<void> {
    console.log('📊 Migrando dados das tabelas...');

    // Ordem de migração respeitando dependências
    const migrationOrder = [
      { name: 'users', table: schema.users },
      { name: 'clinics', table: schema.clinics },
      { name: 'clinic_users', table: schema.clinic_users },
      { name: 'clinic_invitations', table: schema.clinic_invitations },
      { name: 'contacts', table: schema.contacts },
      { name: 'conversations', table: schema.conversations },
      { name: 'messages', table: schema.messages },
      { name: 'appointments', table: schema.appointments },
      { name: 'medical_records', table: schema.medical_records },
      { name: 'pipeline_stages', table: schema.pipeline_stages },
      { name: 'pipeline_opportunities', table: schema.pipeline_opportunities },
      { name: 'customers', table: schema.customers },
      { name: 'charges', table: schema.charges },
      { name: 'calendar_integrations', table: schema.calendar_integrations },
    ];

    for (const { name, table } of migrationOrder) {
      await this.migrateTable(name, table);
    }
  }

  private async migrateTable(tableName: string, table: any): Promise<void> {
    console.log(`📋 Migrando tabela: ${tableName}...`);
    
    const stats: MigrationStats = {
      table: tableName,
      recordsExported: 0,
      recordsImported: 0,
      errors: []
    };

    try {
      // Exportar dados do PostgreSQL atual
      const data = await db.select().from(table);
      stats.recordsExported = data.length;

      if (data.length === 0) {
        console.log(`⏭️  Tabela ${tableName} está vazia, pulando...`);
        this.stats.push(stats);
        return;
      }

      // Importar para Supabase em lotes
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await supabaseAdmin
          .from(tableName)
          .insert(batch);

        if (error) {
          stats.errors.push(`Erro no lote ${i}-${i + batch.length}: ${error.message}`);
          console.error(`❌ Erro ao inserir lote ${i}-${i + batch.length} na tabela ${tableName}:`, error);
        } else {
          stats.recordsImported += batch.length;
          console.log(`✅ Migrados ${Math.min(i + batchSize, data.length)}/${data.length} registros de ${tableName}`);
        }
      }

    } catch (error) {
      stats.errors.push(`Erro geral: ${error}`);
      console.error(`❌ Erro ao migrar tabela ${tableName}:`, error);
    }

    this.stats.push(stats);
  }

  private displayReport(): void {
    console.log('\n📊 RELATÓRIO DE MIGRAÇÃO');
    console.log('========================');
    
    let totalExported = 0;
    let totalImported = 0;
    let totalErrors = 0;

    for (const stat of this.stats) {
      totalExported += stat.recordsExported;
      totalImported += stat.recordsImported;
      totalErrors += stat.errors.length;

      const status = stat.recordsExported === stat.recordsImported ? '✅' : '⚠️';
      console.log(`${status} ${stat.table}: ${stat.recordsImported}/${stat.recordsExported} registros`);
      
      if (stat.errors.length > 0) {
        console.log(`   Erros: ${stat.errors.length}`);
        stat.errors.forEach(error => console.log(`   - ${error}`));
      }
    }

    console.log('========================');
    console.log(`📊 Total: ${totalImported}/${totalExported} registros migrados`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    
    if (totalImported === totalExported && totalErrors === 0) {
      console.log('🎉 Migração 100% bem-sucedida!');
    } else if (totalImported > 0) {
      console.log('⚠️  Migração parcialmente bem-sucedida');
    } else {
      console.log('❌ Falha na migração');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Erro ao testar conexão com Supabase:', error);
        return false;
      }

      console.log('✅ Conexão com Supabase funcionando');
      return true;
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      return false;
    }
  }
}

// Função principal para executar migração
export async function runMigration(): Promise<void> {
  const migration = new SupabaseMigration();
  
  console.log('🔍 Testando conexão com Supabase...');
  const connected = await migration.testConnection();
  
  if (!connected) {
    throw new Error('Não foi possível conectar ao Supabase. Verifique as credenciais.');
  }

  await migration.migrate();
}