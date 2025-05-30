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

async function applyMigration(filename) {
  try {
    console.log(`Applying migration: ${filename}`);
    const sqlPath = path.join(process.cwd(), 'supabase/migrations', filename);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Executing SQL from ${filename}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log(`Successfully applied ${filename}`);
  } catch (error) {
    console.error(`Error applying ${filename}:`, error);
    throw error;
  }
}

async function applyAllMigrations() {
  try {
    console.log('Starting migrations...');

    // First apply the cleanup migration
    await applyMigration('cleanup_admin_users_view.sql');
    
    // Then apply the new policies
    await applyMigration('fix_profiles_policies.sql');

    // Finally ensure admin profile exists
    await applyMigration('ensure_admin_profile.sql');

    console.log('All migrations completed successfully!');
    
    // Verify the changes by checking admin profile
    console.log('Verifying changes...');
    
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '4cc2784a-a397-47de-8197-1544ac2f471a')
      .single();

    if (profileError) {
      throw new Error(`Failed to verify admin profile: ${profileError.message}`);
    }

    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Admin profile not found or not configured correctly');
    }

    console.log('Successfully verified admin profile!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyAllMigrations(); 