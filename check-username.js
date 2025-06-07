const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dohiiawnnantusgsddzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIzNDYyNCwiZXhwIjoyMDYzODEwNjI0fQ.F0bbRYXMXYPnVLsDAhI01ygW3wMfl62YeVg1unR5wx4'
);

async function checkAndUpdateUsername() {
  try {
    // Check current profile
    console.log('Checking current profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '4cc2784a-a397-47de-8197-1544ac2f471a')
      .single();

    if (profileError) {
      console.error('Error checking profile:', profileError);
      return;
    }

    console.log('Current profile:', profile);

    // Update username if needed
    if (!profile.username) {
      console.log('Username missing, updating...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: 'applegraphicshyd' })
        .eq('id', '4cc2784a-a397-47de-8197-1544ac2f471a');

      if (updateError) {
        console.error('Error updating username:', updateError);
        return;
      }

      console.log('Username updated successfully!');
    } else {
      console.log('Username already set:', profile.username);
    }

    // Verify auth user exists
    console.log('Checking auth user...');
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(
      '4cc2784a-a397-47de-8197-1544ac2f471a'
    );

    if (userError) {
      console.error('Error checking auth user:', userError);
      return;
    }

    console.log('Auth user:', user);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndUpdateUsername(); 