const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://dohiiawnnantusgsddzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIzNDYyNCwiZXhwIjoyMDYzODEwNjI0fQ.F0bbRYXMXYPnVLsDAhI01ygW3wMfl62YeVg1unR5wx4'
);

async function fixProfile() {
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('fix-admin-profile.sql', 'utf8');
    
    console.log('Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }
    
    console.log('SQL executed successfully!');
    
    // Verify the profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '4cc2784a-a397-47de-8197-1544ac2f471a')
      .single();
    
    if (profileError) {
      console.error('Error verifying profile:', profileError);
      return;
    }
    
    console.log('Profile verified:', profile);
  } catch (error) {
    console.error('Error:', error);
  }
}

fixProfile(); 