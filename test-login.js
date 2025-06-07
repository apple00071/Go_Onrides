const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dohiiawnnantusgsddzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaGlpYXdubmFudHVzZ3NkZHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIzNDYyNCwiZXhwIjoyMDYzODEwNjI0fQ.F0bbRYXMXYPnVLsDAhI01ygW3wMfl62YeVg1unR5wx4'
);

async function testLogin() {
  try {
    console.log('Testing login with email...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'applegraphicshyd@gmail.com',
      password: 'Admin@123456'
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return;
    }

    console.log('Sign in successful:', signInData);

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }

    console.log('Profile:', profile);
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin(); 