console.log('=== DEBUG SUPABASE CONNECTION ===');
console.log('SUPABASE_DATABASE_URL exists:', !!process.env.SUPABASE_DATABASE_URL);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

if (process.env.SUPABASE_DATABASE_URL) {
  let url = process.env.SUPABASE_DATABASE_URL;
  console.log('Original URL format:', url.split('@')[0] + '@[hidden]');
  
  // Apply same transformations as server
  if (url.includes('#')) {
    url = url.replace(/#/g, '%23');
    console.log('After encoding #:', url.split('@')[0] + '@[hidden]');
  }
  
  if (url.includes('db.') && url.includes('.supabase.co:5432')) {
    const projectRef = url.match(/db\.(\w+)\.supabase\.co/)?.[1];
    const password = url.match(/:([^@]+)@/)?.[1];
    if (projectRef && password) {
      const encodedPassword = encodeURIComponent(password);
      url = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
      console.log('Converted to pooler:', url.split('@')[0] + '@[hidden]');
    }
  }
}