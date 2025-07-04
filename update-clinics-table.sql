-- Atualizar estrutura da tabela clinics para suportar celular com código de país
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+55',
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS celular_country_code TEXT DEFAULT '+55',
ADD COLUMN IF NOT EXISTS address_zip TEXT,
ADD COLUMN IF NOT EXISTS work_start TEXT DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS work_end TEXT DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS lunch_start TEXT DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS lunch_end TEXT DEFAULT '13:00';

-- Atualizar colunas existentes se necessário
ALTER TABLE clinics 
ALTER COLUMN address_country SET DEFAULT 'BR';

-- Remover colunas antigas se existirem
ALTER TABLE clinics 
DROP COLUMN IF EXISTS whatsapp_number,
DROP COLUMN IF EXISTS address_zip_code,
DROP COLUMN IF EXISTS working_days,
DROP COLUMN IF EXISTS working_hours,
DROP COLUMN IF EXISTS lunch_break;

-- Adicionar nova coluna working_days como array
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}';

-- Migrar dados existentes se necessário
UPDATE clinics 
SET celular = COALESCE(celular, '(11) 99999-9999')
WHERE celular IS NULL;