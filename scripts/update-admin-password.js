const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dohiiawnnantusgsddzw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminId = '4cc2784a-a397-47de-8197-1544ac2f471a';
const newPassword = 'Admin@123456'; // 11 characters, meets all requirements

async function updateAdminPassword() {
  try {
    console.log('Updating admin password...');
    
    const { error } = await supabase.auth.admin.updateUserById(
      adminId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error updating password:', error.message);
      process.exit(1);
    }

    console.log('Password updated successfully!');
    console.log('New password:', newPassword);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateAdminPassword(); 