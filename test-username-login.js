const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dohiiawnnantusgsddzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIzNDYyNCwiZXhwIjoyMDYzODEwNjI0fQ.F0bbRYXMXYPnVLsDAhI01ygW3wMfl62YeVg1unR5wx4'
);

async function testUsernameLogin() {
  try {
    // First find profile by username
    console.log('Looking up profile by username...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'applegraphicshyd')
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return;
    }

    console.log('Found profile:', profile);

    // Try to sign in with the associated email
    console.log('Attempting sign in with email:', profile.email);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: 'Admin@123456'
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return;
    }

    console.log('Sign in successful:', {
      id: signInData.user.id,
      email: signInData.user.email,
      role: signInData.user.role
    });

    // Verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }

    console.log('Session:', session ? 'Valid' : 'Invalid');
  } catch (error) {
    console.error('Error:', error);
  }
}

testUsernameLogin(); 