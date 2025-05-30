import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyProfilePolicyFix() {
  try {
    console.log('Starting profile policy fix application...');

    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/fix_profiles_policies.sql');
    console.log('Reading SQL file from:', sqlPath);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error('SQL migration file not found!');
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Successfully read SQL file');

    // Execute the entire SQL as one statement to maintain transaction integrity
    console.log('Executing SQL migration...');
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }

    console.log('Profile policies updated successfully!');
    
    // Verify the changes by attempting to fetch a profile
    console.log('Verifying changes...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profileError) {
      throw new Error(`Failed to verify profile access: ${profileError.message}`);
    }

    console.log('Successfully verified changes!');
  } catch (error) {
    console.error('Error applying profile policy fixes:', error);
    process.exit(1);
  }
}

applyProfilePolicyFix(); 