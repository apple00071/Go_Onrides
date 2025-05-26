const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMzQ2MjQsImV4cCI6MjA2MzgxMDYyNH0.TUV1nBA93YP_GFbE0V349f4_Vgm3RdvSzCOLa2Qvcf8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  try {
    // 1. Create the user with auto-confirm
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'applegraphicshyd@gmail.com',
      password: 'Admin@123',
      options: {
        data: {
          role: 'admin'
        },
        emailRedirectTo: 'http://localhost:3000/dashboard'
      }
    });

    if (authError) throw authError;
    console.log('User created successfully');

    if (!authData.user) {
      throw new Error('No user data returned');
    }

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
      .eq('id', authData.user.id);

    if (updateError) throw updateError;
    console.log('User role updated to admin');

    // 3. Send magic link for first-time login
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: 'applegraphicshyd@gmail.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard'
      }
    });

    if (magicLinkError) throw magicLinkError;
    console.log('Magic link sent successfully!');

    console.log('Admin user created successfully!');
    console.log('Email: applegraphicshyd@gmail.com');
    console.log('Please check your email for the magic link to log in.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser(); 