import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMzQ2MjQsImV4cCI6MjA2MzgxMDYyNH0.TUV1nBA93YP_GFbE0V349f4_Vgm3RdvSzCOLa2Qvcf8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  try {
    // 1. Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'applegraphicshyd@gmail.com',
      password: 'Admin@123', // You should change this password after first login
    });

    if (authError) throw authError;
    console.log('User created successfully');

    // 2. Update the user's role to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        permissions: {
          createBooking: true,
          viewBookings: true,
          uploadDocuments: true,
          viewDocuments: true,
          managePayments: true,
          accessReports: true
        }
      })
      .eq('id', authData.user?.id);

    if (updateError) throw updateError;
    console.log('User role updated to admin');

    console.log('Admin user created successfully!');
    console.log('Email: applegraphicshyd@gmail.com');
    console.log('Password: Admin@123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser(); 