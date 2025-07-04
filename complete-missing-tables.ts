import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingTables() {
  console.log('🔧 Criando tabelas em falta no Supabase...');

  const queries = [
    // ai_templates
    `CREATE TABLE IF NOT EXISTS ai_templates (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
      name VARCHAR(255) NOT NULL,
      template_type VARCHAR(100) NOT NULL,
      content TEXT,
      variables JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`,

    // analytics_metrics
    `CREATE TABLE IF NOT EXISTS analytics_metrics (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
      metric_name VARCHAR(255) NOT NULL,
      metric_value DECIMAL(10,2),
      metric_date DATE NOT NULL,
      category VARCHAR(100),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // clinic_settings
    `CREATE TABLE IF NOT EXISTS clinic_settings (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
      setting_key VARCHAR(255) NOT NULL,
      setting_value TEXT,
      setting_type VARCHAR(50) DEFAULT 'string',
      is_encrypted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(clinic_id, setting_key)
    );`,

    // pipeline_activities
    `CREATE TABLE IF NOT EXISTS pipeline_activities (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER REFERENCES pipeline_opportunities(id) NOT NULL,
      activity_type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      completed_date TIMESTAMP,
      assigned_to VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      outcome TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`,

    // pipeline_history
    `CREATE TABLE IF NOT EXISTS pipeline_history (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER REFERENCES pipeline_opportunities(id) NOT NULL,
      from_stage_id INTEGER REFERENCES pipeline_stages(id),
      to_stage_id INTEGER REFERENCES pipeline_stages(id) NOT NULL,
      changed_by VARCHAR(255),
      change_date TIMESTAMP DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // password_reset_tokens (já existe, mas vamos garantir)
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // user_id_mapping (para compatibilidade entre sistemas)
    `CREATE TABLE IF NOT EXISTS user_id_mapping (
      id SERIAL PRIMARY KEY,
      old_user_id INTEGER,
      new_user_uuid UUID,
      email VARCHAR(255),
      mapping_type VARCHAR(50) DEFAULT 'migration',
      created_at TIMESTAMP DEFAULT NOW()
    );`,

    // session (tabela de sessões simples)
    `CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR(255) PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );`,

    // users_backup
    `CREATE TABLE IF NOT EXISTS users_backup (
      id SERIAL PRIMARY KEY,
      original_id INTEGER,
      email VARCHAR(255),
      name VARCHAR(255),
      role VARCHAR(100),
      backup_date TIMESTAMP DEFAULT NOW(),
      backup_reason TEXT
    );`,

    // clinic_users_backup
    `CREATE TABLE IF NOT EXISTS clinic_users_backup (
      id SERIAL PRIMARY KEY,
      original_id INTEGER,
      clinic_id INTEGER,
      user_id INTEGER,
      role VARCHAR(100),
      backup_date TIMESTAMP DEFAULT NOW(),
      backup_reason TEXT
    );`
  ];

  for (const query of queries) {
    try {
      const { error } = await supabase.rpc('execute_sql', { query });
      if (error) {
        console.error('❌ Erro ao executar query:', error);
      } else {
        console.log('✅ Query executada com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }

  console.log('🎉 Criação de tabelas concluída!');
}

createMissingTables().catch(console.error);