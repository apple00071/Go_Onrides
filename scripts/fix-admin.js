import { createClient } from '@supabase/supabase-js';

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

const adminEmail = 'applegraphicshyd@gmail.com';
const adminId = '4cc2784a-a397-47de-8197-1544ac2f471a';

async function fixAdminProfile() {
  try {
    console.log('Starting admin profile fix...');
    
    const adminPermissions = {
      createBooking: true,
      viewBookings: true,
      uploadDocuments: true,
      viewDocuments: true,
      managePayments: true,
      accessReports: true
    };

    // First check if profile exists
    console.log('Checking if profile exists...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .single();

    if (checkError) {
      console.log('Error checking profile:', checkError.message);
      
      // Try to insert new profile
      console.log('Attempting to insert new profile...');
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
        console.log('Insert failed:', insertError.message);
        
        // If insert fails, try update
        console.log('Attempting to update existing profile...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: adminEmail,
            role: 'admin',
            permissions: adminPermissions
          })
          .eq('id', adminId);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        console.log('Successfully updated admin profile');
      } else {
        console.log('Successfully created new admin profile');
      }
    } else {
      console.log('Existing profile found, updating...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: adminEmail,
          role: 'admin',
          permissions: adminPermissions
        })
        .eq('id', adminId);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      console.log('Successfully updated admin profile');
    }

    // Verify the profile
    console.log('Verifying profile...');
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify profile: ${verifyError.message}`);
    }

    console.log('Profile verification successful:', profile);
    console.log('Admin profile fix completed successfully!');
  } catch (error) {
    console.error('Error fixing admin profile:', error);
    process.exit(1);
  }
}

fixAdminProfile(); 