const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dknqqcnnbcqujeffbmmb.supabase.co';
const supabaseKey = 'sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM';

async function testAuth() {
  console.log('Testing Supabase authentication...');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test sign in
    console.log('\nAttempting to sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'koolitus@productory.eu',
      password: 'Testing123!@#'
    });
    
    if (error) {
      console.error('Sign-in error:', error);
      return;
    }
    
    console.log('Sign-in successful!');
    console.log('User:', data.user?.email);
    console.log('Session:', data.session ? 'Present' : 'Missing');
    
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
    } else {
      console.log('\nCurrent session:', sessionData.session ? 'Active' : 'None');
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\nSigned out successfully');
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testAuth();