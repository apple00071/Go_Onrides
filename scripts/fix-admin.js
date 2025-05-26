import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIzNDYyNCwiZXhwIjoyMDYzODEwNjI0fQ.Ow1KJgGjxpXBkJJxFJPGkwFxP_6Hs0YlAXgJNXXNYGE';
const adminEmail = 'applegraphicshyd@gmail.com';
const adminId = '4cc2784a-a397-47de-8197-1544ac2f471a'; // The ID from your error message

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminProfile() {
  try {
    const adminPermissions = {
      createBooking: true,
      viewBookings: true,
      uploadDocuments: true,
      viewDocuments: true,
      managePayments: true,
      accessReports: true
    };

    // Try to insert the profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: adminId,
          email: adminEmail,
          role: 'admin',
          permissions: adminPermissions
        }
      ]);

    if (insertError) {
      console.log('Insert failed, trying update:', insertError.message);
      
      // If insert fails, try update
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          permissions: adminPermissions
        })
        .eq('id', adminId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return;
      }

      console.log('Updated existing admin profile');
    } else {
      console.log('Created new admin profile');
    }

    // Verify the profile
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .single();

    if (verifyError) {
      console.error('Error verifying profile:', verifyError);
      return;
    }

    console.log('Admin profile verified:', profile);
    console.log('Admin profile fixed successfully!');
  } catch (error) {
    console.error('Error fixing admin profile:', error);
  }
}

fixAdminProfile(); 