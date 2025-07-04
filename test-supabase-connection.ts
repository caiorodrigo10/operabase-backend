import { Pool } from "pg";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('Has service key:', !!supabaseKey);

// Try different connection string formats
const formats = [
  // Format 1: Pooler connection
  `postgresql://postgres.${supabaseUrl?.replace('https://', '').split('.')[0]}:${supabaseKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  
  // Format 2: Direct connection
  `postgresql://postgres:${supabaseKey}@db.${supabaseUrl?.replace('https://', '').split('.')[0]}.supabase.co:5432/postgres`,
  
  // Format 3: Alternative pooler
  `postgresql://postgres:${supabaseKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?host=${supabaseUrl?.replace('https://', '').split('.')[0]}`,
];

async function testConnection(connectionString: string, formatName: string) {
  try {
    console.log(`\nTesting ${formatName}...`);
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    await pool.end();
    
    console.log(`✅ ${formatName} works!`);
    return true;
  } catch (error) {
    console.log(`❌ ${formatName} failed:`, error.message);
    return false;
  }
}

async function main() {
  for (let i = 0; i < formats.length; i++) {
    const success = await testConnection(formats[i], `Format ${i + 1}`);
    if (success) {
      console.log('\n🎉 Found working connection format!');
      console.log('Use this connection string format in your application');
      break;
    }
  }
}

main().catch(console.error);