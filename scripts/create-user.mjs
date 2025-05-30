import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createUser() {
  try {
    // Get user details
    const email = await question('Enter email: ');
    const password = await question('Enter password (min 6 characters): ');
    const role = (await question('Enter role (admin/worker): ')).toLowerCase();

    if (!['admin', 'worker'].includes(role)) {
      throw new Error('Invalid role. Must be either "admin" or "worker"');
    }

    // Default permissions based on role
    const permissions = role === 'admin' ? {
      createBooking: true,
      viewBookings: true,
      uploadDocuments: true,
      viewDocuments: true,
      managePayments: true,
      accessReports: true
    } : {
      createBooking: false,
      viewBookings: true,
      uploadDocuments: false,
      viewDocuments: true,
      managePayments: false,
      accessReports: false
    };

    // Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        role,
        permissions
      });

    if (profileError) {
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    console.log('User created successfully!');
    console.log('User ID:', authData.user.id);
    console.log('Email:', email);
    console.log('Role:', role);

  } catch (error) {
    console.error('Error creating user:', error.message);
  } finally {
    rl.close();
  }
}

createUser(); 