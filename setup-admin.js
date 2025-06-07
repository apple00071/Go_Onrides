import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  try {
    // First try to get the existing user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    let userId;
    const adminEmail = 'applegraphicshyd@gmail.com';
    const existingUser = users.find(u => u.email === adminEmail);

    if (existingUser) {
      console.log('Found existing user:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create admin user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'Admin@123456',
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('No user created');

      console.log('Created auth user:', authData.user.id);
      userId = authData.user.id;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return;
    }

    // Create admin profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: adminEmail,
        username: 'applegraphicshyd',
        role: 'admin',
        permissions: {
          createBooking: true,
          viewBookings: true,
          managePayments: true,
          accessReports: true
        }
      });

    if (profileError) throw profileError;

    console.log('Created admin profile successfully');
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin(); 